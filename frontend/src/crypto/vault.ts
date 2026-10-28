/**
 * vault.ts — Keylord ZK crypto layer
 *
 * Tutto avviene nel browser tramite WebCrypto API (nativa, nessuna dipendenza).
 * Nessuna chiave o dato in chiaro lascia mai questo modulo verso il server.
 *
 * Flusso:
 *   masterPassword + salt
 *     → PBKDF2 → masterKey
 *       → HKDF(info="auth") → authKey      (va al server, trattata come password)
 *       → HKDF(info="wrap") → wrappingKey  (resta in memoria, cifra la vaultKey)
 *   vaultKey: AES-256 casuale, salvata cifrata sul server; cifra le credenziali
 */

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export interface DerivedKeys {
  /** Hex string — inviata al server come "password" per autenticarsi */
  authKey: string;
  /** Cifra e decifra la vaultKey, mai estraibile e mai trasmessa */
  wrappingKey: CryptoKey;
}

import type { CredentialBase, ReencryptedCredential } from "../types";
import { UserFacingError } from "../api/errors";
import {
  normalizeCredential,
  type CredentialData,
  type PlainCredential,
} from "./credential";
export type EncryptedCredential = CredentialBase;

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

/** Iterazioni PBKDF2 usate per le nuove chiavi (registrazione e cambio password) */
export const KDF_ITERATIONS = 600_000;
/**
 * Intervallo accettato per le iterazioni indicate dal server, uguale a quello del backend.
 * Un server malevolo potrebbe indicarne poche per rendere l'authKey attaccabile offline.
 */
export const KDF_MIN_ITERATIONS = 600_000;
export const KDF_MAX_ITERATIONS = 2_000_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;
const KEY_BYTES = 32; // 256 bit
const GCM_TAG_BYTES = 16;
/** Lunghezza massima di encryptedData, uguale a VaultLimits.MaxEncryptedDataLength nel backend */
export const MAX_ENCRYPTED_DATA_LENGTH = 16_384;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Converte un Uint8Array in stringa hex */
export function toHex(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Converte una stringa hex in Uint8Array */
export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error("hex string length must be even");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

/** Byte convertiti per volta da toBase64: lo spread in String.fromCharCode ha un limite di argomenti */
const BASE64_CHUNK_BYTES = 0x8000;

/** Converte un Uint8Array in Base64, a blocchi per reggere anche buffer di molti MB */
export function toBase64(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_BYTES));
  }
  return btoa(binary);
}

/** Converte una stringa Base64 in Uint8Array */
export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ---------------------------------------------------------------------------
// Generazione salt
// ---------------------------------------------------------------------------

/**
 * Genera un salt casuale da 32 byte.
 * Chiamato una sola volta alla registrazione.
 * Restituisce una stringa hex da salvare nel DB (campo kdf_salt).
 */
export function generateSalt(): string {
  const buf = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return toHex(buf);
}

// ---------------------------------------------------------------------------
// Derivazione chiavi
// ---------------------------------------------------------------------------

/**
 * Importa la master password come materiale grezzo per PBKDF2.
 */
async function importPasswordKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false, // non estraibile
    ["deriveKey", "deriveBits"],
  );
}

/**
 * PBKDF2: password + salt → masterKey (AES-GCM 256 bit).
 * La masterKey non viene mai usata direttamente — serve solo come input a HKDF.
 */
async function deriveMasterKey(
  passwordKey: CryptoKey,
  saltHex: string,
  iterations: number,
): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(saltHex),
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    KEY_BYTES * 8,
  );

  return crypto.subtle.importKey("raw", bits, "HKDF", false, [
    "deriveKey",
    "deriveBits",
  ]);
}

/**
 * HKDF: masterKey → chiave derivata con un info label specifico.
 * @param info  "auth" oppure "encrypt"
 * @param usage KeyUsage della chiave risultante
 */
async function hkdfDerive(
  masterKey: CryptoKey,
  info: string,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(KEY_BYTES), // salt zero per HKDF (il salt crittografico è già in PBKDF2)
      info: enc.encode(info),
    },
    masterKey,
    { name: "AES-GCM", length: KEY_BYTES * 8 },
    info === "auth", // authKey estraibile (dobbiamo leggere i byte per inviarla)
    usage,
  );
}

/**
 * Punto di ingresso principale per la derivazione chiavi.
 *
 * Chiamato al login e alla registrazione.
 * @param password   Master password dell'utente (mai salvata)
 * @param saltHex    Salt hex recuperato dal server (o appena generato)
 * @param iterations Iterazioni PBKDF2 memorizzate per l'utente (default per le chiavi nuove)
 * @throws Se le iterazioni sono fuori dall'intervallo accettato
 */
export async function deriveKeys(
  password: string,
  saltHex: string,
  iterations: number = KDF_ITERATIONS,
): Promise<DerivedKeys> {
  if (
    !Number.isInteger(iterations) ||
    iterations < KDF_MIN_ITERATIONS ||
    iterations > KDF_MAX_ITERATIONS
  ) {
    throw new UserFacingError("errors.kdfUnsupported");
  }
  const passwordKey = await importPasswordKey(password);
  const masterKey = await deriveMasterKey(passwordKey, saltHex, iterations);

  // authKey: estraibile come raw bytes → convertiamo in hex per inviarla al server
  const authCryptoKey = await hkdfDerive(masterKey, "auth", [
    "encrypt",
    "decrypt",
  ]);
  const authRaw = await crypto.subtle.exportKey("raw", authCryptoKey);
  const authKey = toHex(authRaw);

  // wrappingKey: non estraibile, rimane in memoria come CryptoKey opaca
  const wrappingKey = await hkdfDerive(masterKey, "wrap", [
    "wrapKey",
    "unwrapKey",
  ]);

  return { authKey, wrappingKey };
}

// ---------------------------------------------------------------------------
// Chiave del vault
// ---------------------------------------------------------------------------

/** Cifra la vaultKey con la wrappingKey. Formato "ivBase64:ciphertextBase64", come le credenziali */
async function wrapVaultKey(
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.wrapKey("raw", vaultKey, wrappingKey, {
    name: "AES-GCM",
    iv,
  });
  return `${toBase64(iv)}:${toBase64(wrapped)}`;
}

/**
 * Decifra la vaultKey. Di default la chiave risultante non è estraibile,
 * come l'encryptionKey di prima.
 * @throws Se la wrappingKey è sbagliata o il blob è corrotto
 */
export async function unwrapVaultKey(
  wrappedVaultKey: string,
  wrappingKey: CryptoKey,
  extractable = false,
): Promise<CryptoKey> {
  const [ivB64, wrappedB64] = wrappedVaultKey.split(":");
  if (!ivB64 || !wrappedB64) {
    throw new Error("Formato wrappedVaultKey non valido");
  }
  return crypto.subtle.unwrapKey(
    "raw",
    fromBase64(wrappedB64),
    wrappingKey,
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    { name: "AES-GCM", length: KEY_BYTES * 8 },
    extractable,
    ["encrypt", "decrypt"],
  );
}

/**
 * Genera una vaultKey casuale e la cifra con la wrappingKey.
 * La chiave estraibile esiste solo qui dentro, il tempo del wrap: quella restituita
 * si ottiene decifrando il blob appena creato, quindi il round trip è già verificato
 * prima che il blob venga inviato al server.
 */
export async function createVaultKey(
  wrappingKey: CryptoKey,
): Promise<{ vaultKey: CryptoKey; wrappedVaultKey: string }> {
  const generated = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_BYTES * 8 },
    true,
    ["encrypt", "decrypt"],
  );
  const wrappedVaultKey = await wrapVaultKey(generated, wrappingKey);
  const vaultKey = await unwrapVaultKey(wrappedVaultKey, wrappingKey);
  return { vaultKey, wrappedVaultKey };
}

// ---------------------------------------------------------------------------
// Cifratura / decifratura credenziali
// ---------------------------------------------------------------------------

/**
 * Cifra una credenziale con AES-GCM, nella forma canonica dello schema corrente e senza id.
 * Genera un IV casuale per ogni cifratura (mai riutilizzare lo stesso IV con la stessa chiave).
 *
 * @returns EncryptedCredential con formato "ivBase64:ciphertextBase64"
 * @throws UserFacingError se il risultato supera il limite accettato dal server
 */
export async function encryptCredential(
  credential: CredentialData,
  encryptionKey: CryptoKey,
): Promise<EncryptedCredential> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(
    JSON.stringify(normalizeCredential(credential)),
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    plaintext,
  );

  const encryptedData = `${toBase64(iv)}:${toBase64(ciphertext)}`;
  if (encryptedData.length > MAX_ENCRYPTED_DATA_LENGTH) {
    throw new UserFacingError("errors.credentialTooLarge");
  }
  return { encryptedData };
}

/** Caratteri Base64 (con padding) che codificano il numero di byte indicato */
function base64Length(bytes: number): number {
  return 4 * Math.ceil(bytes / 3);
}

/**
 * Lunghezza esatta di encryptedData che encryptCredential produrrebbe, calcolata senza cifrare:
 * IV in Base64, separatore, poi testo cifrato (lungo quanto il JSON) più il tag GCM in Base64.
 */
export function encryptedDataLength(credential: CredentialData): number {
  const plaintextBytes = new TextEncoder().encode(
    JSON.stringify(normalizeCredential(credential)),
  ).length;
  return (
    base64Length(IV_BYTES) + 1 + base64Length(plaintextBytes + GCM_TAG_BYTES)
  );
}

/**
 * Decifra una credenziale cifrata con AES-GCM.
 *
 * @param encrypted  EncryptedCredential con formato "ivBase64:ciphertextBase64"
 * @throws Se la chiave è sbagliata, i dati sono corrotti (AES-GCM authentication fail)
 *         o il payload non rispetta lo schema (vedi normalizeCredential)
 */
export async function decryptCredential(
  encrypted: EncryptedCredential,
  encryptionKey: CryptoKey,
): Promise<PlainCredential> {
  const [ivB64, ciphertextB64] = encrypted.encryptedData.split(":");
  if (!ivB64 || !ciphertextB64) {
    throw new Error("Formato encryptedData non valido");
  }

  const iv = fromBase64(ivB64);
  const ciphertext = fromBase64(ciphertextB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    ciphertext,
  );

  // La normalizzazione scarta un eventuale id cifrato nel payload: vale quello del server
  return {
    ...normalizeCredential(JSON.parse(new TextDecoder().decode(plaintext))),
    id: encrypted.id,
  };
}

export interface DecryptedVault {
  credentials: PlainCredential[];
  /** Credenziali che non si decifrano (dati corrotti o chiave diversa), restituite così come sono */
  unreadable: EncryptedCredential[];
}

/**
 * Decifra un array di credenziali cifrate in parallelo.
 * Una credenziale illeggibile non blocca le altre: finisce in `unreadable`.
 */
export async function decryptVault(
  encryptedCredentials: EncryptedCredential[],
  encryptionKey: CryptoKey,
): Promise<DecryptedVault> {
  const results = await Promise.allSettled(
    encryptedCredentials.map((ec) => decryptCredential(ec, encryptionKey)),
  );
  const vault: DecryptedVault = { credentials: [], unreadable: [] };
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      vault.credentials.push(result.value);
    } else {
      vault.unreadable.push(encryptedCredentials[i]);
    }
  });
  return vault;
}

/** SHA-256 in hex minuscolo della stringa cifrata, calcolato come fa il server */
export async function digestEncryptedData(
  encryptedData: string,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encryptedData),
  );
  return toHex(hash);
}

// ---------------------------------------------------------------------------
// Cambio password
// ---------------------------------------------------------------------------

/**
 * Crea una nuova vaultKey, cifrata con la wrappingKey indicata, e ricifra tutte le credenziali dalla chiave attuale.
 * @throws UserFacingError se qualche credenziale non si decifra
 */
export async function renewVaultKey(
  encryptedCredentials: EncryptedCredential[],
  oldEncryptionKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<{
  vaultKey: CryptoKey;
  wrappedVaultKey: string;
  reencryptedCredentials: ReencryptedCredential[];
}> {
  const { vaultKey, wrappedVaultKey } = await createVaultKey(wrappingKey);
  const reencryptedCredentials = await reencryptCredentials(
    encryptedCredentials,
    oldEncryptionKey,
    vaultKey,
  );
  return { vaultKey, wrappedVaultKey, reencryptedCredentials };
}

/**
 * Ricifra ogni credenziale da una chiave a un'altra, con l'impronta del contenuto di partenza.
 * @throws UserFacingError se qualche credenziale non si decifra: non potrebbe essere ricifrata
 */
async function reencryptCredentials(
  encryptedCredentials: EncryptedCredential[],
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<ReencryptedCredential[]> {
  const { credentials: plainCredentials, unreadable } = await decryptVault(
    encryptedCredentials,
    oldKey,
  );
  if (unreadable.length > 0) {
    throw new UserFacingError("errors.unreadableBeforeChange", {
      count: unreadable.length,
    });
  }
  const digestById = new Map<number | undefined, string>(
    await Promise.all(
      encryptedCredentials.map(
        async (c) =>
          [c.id, await digestEncryptedData(c.encryptedData)] as const,
      ),
    ),
  );
  // L'id viaggia in chiaro accanto al payload, non dentro: encryptCredential lo scarta
  return Promise.all(
    plainCredentials.map(async (credential) => {
      const { id } = credential;
      if (id === undefined) {
        throw new Error("Credenziale senza id");
      }
      const { encryptedData } = await encryptCredential(credential, newKey);
      return { id, previousDigest: digestById.get(id)!, encryptedData };
    }),
  );
}

/**
 * Cambio password per un utente con vaultKey: la vaultKey non cambia, cambia solo la chiave che la cifra.
 * Nessuna credenziale viene ricifrata.
 *
 * La vaultKey viene decifrata come estraibile solo per il tempo del wrap con la nuova wrappingKey,
 * poi si verifica che il nuovo blob si apra davvero: il server non può controllarlo.
 *
 * @throws UserFacingError se il blob attuale non si decifra con la wrappingKey indicata
 */
export async function rewrapVaultKey(
  wrappedVaultKey: string,
  oldWrappingKey: CryptoKey,
  newPassword: string,
): Promise<{
  newKeys: DerivedKeys;
  newSalt: string;
  newKdfIterations: number;
  newWrappedVaultKey: string;
  /** La stessa vaultKey, non estraibile, ottenuta dal nuovo blob */
  vaultKey: CryptoKey;
}> {
  let extractableKey: CryptoKey;
  try {
    extractableKey = await unwrapVaultKey(
      wrappedVaultKey,
      oldWrappingKey,
      true,
    );
  } catch {
    throw new UserFacingError("errors.vaultKeyUnreadable");
  }
  const newSalt = generateSalt();
  const newKdfIterations = KDF_ITERATIONS;
  const newKeys = await deriveKeys(newPassword, newSalt, newKdfIterations);
  const newWrappedVaultKey = await wrapVaultKey(
    extractableKey,
    newKeys.wrappingKey,
  );
  // Round trip with the new wrapping key: if it fails nothing has been sent yet
  const vaultKey = await unwrapVaultKey(
    newWrappedVaultKey,
    newKeys.wrappingKey,
  );
  return { newKeys, newSalt, newKdfIterations, newWrappedVaultKey, vaultKey };
}

/**
 * Cambio password con rotazione della vaultKey: nuovo salt, nuove chiavi, nuova vaultKey cifrata
 * con la wrappingKey derivata dalla nuova password, e tutto il vault ricifrato con essa.
 * Non serve la vecchia wrappingKey: il vault si decifra con la vaultKey attuale.
 *
 * @throws UserFacingError se qualche credenziale non si decifra
 */
export async function rotateVaultKeyWithNewPassword(
  encryptedCredentials: EncryptedCredential[],
  currentVaultKey: CryptoKey,
  newPassword: string,
): Promise<{
  newKeys: DerivedKeys;
  newSalt: string;
  newKdfIterations: number;
  newWrappedVaultKey: string;
  vaultKey: CryptoKey;
  reencryptedCredentials: ReencryptedCredential[];
}> {
  const newSalt = generateSalt();
  const newKdfIterations = KDF_ITERATIONS;
  const newKeys = await deriveKeys(newPassword, newSalt, newKdfIterations);
  const renewed = await renewVaultKey(
    encryptedCredentials,
    currentVaultKey,
    newKeys.wrappingKey,
  );
  return {
    newKeys,
    newSalt,
    newKdfIterations,
    newWrappedVaultKey: renewed.wrappedVaultKey,
    vaultKey: renewed.vaultKey,
    reencryptedCredentials: renewed.reencryptedCredentials,
  };
}
