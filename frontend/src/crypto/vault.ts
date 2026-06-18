/**
 * vault.ts — Keylord ZK crypto layer
 *
 * Tutto avviene nel browser tramite WebCrypto API (nativa, nessuna dipendenza).
 * Nessuna chiave o dato in chiaro lascia mai questo modulo verso il server.
 *
 * Flusso:
 *   masterPassword + salt
 *     → PBKDF2 → masterKey
 *       → HKDF(info="auth")     → authKey       (va al server, trattata come password)
 *       → HKDF(info="encrypt")  → encryptionKey  (resta in memoria, mai trasmessa)
 */

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export interface DerivedKeys {
	/** Hex string — inviata al server come "password" per autenticarsi */
	authKey: string;
	/** CryptoKey — usata per cifrare/decifrare, mai lascia il browser */
	encryptionKey: CryptoKey;
}

export interface PlainCredential {
	site: string;
	username: string;
	password: string;
}

export interface EncryptedCredential {
	/** Formato: "<ivBase64>:<ciphertextBase64>" */
	encryptedData: string;
}

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const KDF_ITERATIONS = 600_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;
const KEY_BYTES = 32; // 256 bit

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Converte un Uint8Array in stringa hex */
function toHex(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Converte una stringa hex in Uint8Array */
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
	if (hex.length % 2 !== 0) throw new Error("hex string length must be even");
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return out;
}

/** Converte un Uint8Array in Base64 */
function toBase64(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	return btoa(String.fromCharCode(...bytes));
}

/** Converte una stringa Base64 in Uint8Array */
function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
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
): Promise<CryptoKey> {
	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: fromHex(saltHex),
			iterations: KDF_ITERATIONS,
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
 */
export async function deriveKeys(
	password: string,
	saltHex: string,
): Promise<DerivedKeys> {
	const passwordKey = await importPasswordKey(password);
	const masterKey = await deriveMasterKey(passwordKey, saltHex);

	// authKey: estraibile come raw bytes → convertiamo in hex per inviarla al server
	const authCryptoKey = await hkdfDerive(masterKey, "auth", [
		"encrypt",
		"decrypt",
	]);
	const authRaw = await crypto.subtle.exportKey("raw", authCryptoKey);
	const authKey = toHex(authRaw);

	// encryptionKey: non estraibile, rimane in memoria come CryptoKey opaca
	const encryptionKey = await hkdfDerive(masterKey, "encrypt", [
		"encrypt",
		"decrypt",
	]);

	return { authKey, encryptionKey };
}

// ---------------------------------------------------------------------------
// Cifratura / decifratura credenziali
// ---------------------------------------------------------------------------

/**
 * Cifra una credenziale con AES-GCM.
 * Genera un IV casuale per ogni cifratura (mai riutilizzare lo stesso IV con la stessa chiave).
 *
 * @returns EncryptedCredential con formato "ivBase64:ciphertextBase64"
 */
export async function encryptCredential(
	credential: PlainCredential,
	encryptionKey: CryptoKey,
): Promise<EncryptedCredential> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
	const plaintext = new TextEncoder().encode(JSON.stringify(credential));

	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		encryptionKey,
		plaintext,
	);

	return {
		encryptedData: `${toBase64(iv)}:${toBase64(ciphertext)}`,
	};
}

/**
 * Decifra una credenziale cifrata con AES-GCM.
 *
 * @param encrypted  EncryptedCredential con formato "ivBase64:ciphertextBase64"
 * @throws Se la chiave è sbagliata o i dati sono corrotti (AES-GCM authentication fail)
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

	return JSON.parse(new TextDecoder().decode(plaintext)) as PlainCredential;
}

/**
 * Decifra un array di credenziali cifrate in parallelo.
 * Utile al login quando si scarica l'intero vault.
 */
export async function decryptVault(
	encryptedCredentials: EncryptedCredential[],
	encryptionKey: CryptoKey,
): Promise<PlainCredential[]> {
	return Promise.all(
		encryptedCredentials.map((ec) => decryptCredential(ec, encryptionKey)),
	);
}

// ---------------------------------------------------------------------------
// Cambio password
// ---------------------------------------------------------------------------

/**
 * Ricifra l'intero vault con una nuova encryptionKey.
 * Usato nel flusso change-password:
 *   1. Decifra tutto con la vecchia chiave
 *   2. Genera nuovo salt + nuove chiavi
 *   3. Ricifra tutto con la nuova chiave
 *
 * @returns Le credenziali ricifrate + le nuove chiavi (authKey + encryptionKey)
 */
export async function reencryptVault(
	encryptedCredentials: EncryptedCredential[],
	oldEncryptionKey: CryptoKey,
	newPassword: string,
): Promise<{
	newKeys: DerivedKeys;
	newSalt: string;
	reencryptedCredentials: EncryptedCredential[];
}> {
	// 1. Decifra con la vecchia chiave
	const plainCredentials = await decryptVault(
		encryptedCredentials,
		oldEncryptionKey,
	);

	// 2. Genera nuovo salt e nuove chiavi
	const newSalt = generateSalt();
	const newKeys = await deriveKeys(newPassword, newSalt);

	// 3. Ricifra con la nuova chiave
	const reencryptedCredentials = await Promise.all(
		plainCredentials.map((c) =>
			encryptCredential(c, newKeys.encryptionKey),
		),
	);

	return { newKeys, newSalt, reencryptedCredentials };
}
