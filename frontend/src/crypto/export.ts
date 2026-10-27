/**
 * export.ts — vault export files, built entirely in the browser
 *
 * Three formats:
 *   - encrypted JSON: the items encrypted with AES-256-GCM under a key derived with PBKDF2
 *     from a password chosen for the file, independent of the account and its vault key;
 *   - plain JSON: the same items in clear, in the credential schema of credential.ts;
 *   - plain CSV: the Bitwarden CSV layout, accepted by most password managers.
 */

import {
  fromBase64,
  fromHex,
  generateSalt,
  KDF_ITERATIONS,
  KDF_MAX_ITERATIONS,
  KDF_MIN_ITERATIONS,
  toBase64,
} from "./vault";
import { normalizeCredential, type CredentialData } from "./credential";

export const EXPORT_FORMAT = "keylord-export";
export const EXPORT_VERSION = 1;
export const EXPORT_PASSWORD_MIN_LENGTH = 12;

export type ExportKind = "encrypted" | "json" | "csv";

const IV_BYTES = 12;
const KEY_BITS = 256;
const CIPHER = "AES-256-GCM";

/** Content of an export: the same object is the plain file body or the encrypted plaintext */
export interface ExportPayload {
  exportedAt: string;
  items: CredentialData[];
}

export interface PlainExportFile extends ExportPayload {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  encrypted: false;
}

export interface ExportKdf {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  // Hex, 32 random bytes per file
  salt: string;
}

export interface EncryptedExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  encrypted: true;
  kdf: ExportKdf;
  cipher: typeof CIPHER;
  // "ivBase64:ciphertextBase64" of the JSON-serialized ExportPayload
  data: string;
}

/**
 * Header fields bound to the ciphertext as AES-GCM additional data: editing any of them,
 * such as lowering the iterations, makes decryption fail.
 */
function additionalData(kdf: ExportKdf): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    [
      EXPORT_FORMAT,
      EXPORT_VERSION,
      kdf.name,
      kdf.hash,
      kdf.iterations,
      kdf.salt,
      CIPHER,
    ].join(":"),
  );
}

async function deriveExportKey(
  password: string,
  kdf: ExportKdf,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromHex(kdf.salt),
      iterations: kdf.iterations,
      hash: kdf.hash,
    },
    passwordKey,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

function payloadOf(items: CredentialData[], now: Date): ExportPayload {
  return {
    exportedAt: now.toISOString(),
    items: items.map((item) => normalizeCredential(item)),
  };
}

export function buildPlainJsonExport(
  items: CredentialData[],
  now = new Date(),
): string {
  const file: PlainExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    encrypted: false,
    ...payloadOf(items, now),
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Encrypts the items with a key derived from the file password. The file is decrypted again
 * before being returned, so a file that cannot be opened never reaches the user.
 */
export async function buildEncryptedJsonExport(
  items: CredentialData[],
  password: string,
  now = new Date(),
): Promise<string> {
  const kdf: ExportKdf = {
    name: "PBKDF2",
    hash: "SHA-256",
    iterations: KDF_ITERATIONS,
    salt: generateSalt(),
  };
  const key = await deriveExportKey(password, kdf);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const payload = JSON.stringify(payloadOf(items, now));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(kdf) },
    key,
    new TextEncoder().encode(payload),
  );
  const file: EncryptedExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    encrypted: true,
    kdf,
    cipher: CIPHER,
    data: `${toBase64(iv)}:${toBase64(ciphertext)}`,
  };
  const text = JSON.stringify(file, null, 2);

  const check = await readEncryptedJsonExport(text, password);
  if (JSON.stringify(check) !== payload) {
    throw new Error("Export round trip failed");
  }
  return text;
}

/**
 * Opens an encrypted export file and returns its validated content.
 * @throws If the file is not a supported Keylord export, the password is wrong or the data was altered
 */
export async function readEncryptedJsonExport(
  text: string,
  password: string,
): Promise<ExportPayload> {
  const file = JSON.parse(text) as Partial<EncryptedExportFile>;
  const kdf = file.kdf;
  if (
    file.format !== EXPORT_FORMAT ||
    file.version !== EXPORT_VERSION ||
    file.encrypted !== true ||
    file.cipher !== CIPHER ||
    kdf?.name !== "PBKDF2" ||
    kdf.hash !== "SHA-256" ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations < KDF_MIN_ITERATIONS ||
    kdf.iterations > KDF_MAX_ITERATIONS ||
    typeof kdf.salt !== "string" ||
    typeof file.data !== "string"
  ) {
    throw new Error("Unsupported export file");
  }
  const [ivB64, ciphertextB64] = file.data.split(":");
  if (!ivB64 || !ciphertextB64) {
    throw new Error("Invalid export data");
  }
  const key = await deriveExportKey(password, kdf);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(ivB64),
      additionalData: additionalData(kdf),
    },
    key,
    fromBase64(ciphertextB64),
  );
  const payload = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<
    Record<keyof ExportPayload, unknown>
  >;
  if (typeof payload.exportedAt !== "string" || !Array.isArray(payload.items)) {
    throw new Error("Invalid export payload");
  }
  return {
    exportedAt: payload.exportedAt,
    items: payload.items.map((item) => normalizeCredential(item)),
  };
}

// Column order of the Bitwarden CSV format for individual vaults
const CSV_COLUMNS = [
  "folder",
  "favorite",
  "type",
  "name",
  "notes",
  "fields",
  "reprompt",
  "login_uri",
  "login_username",
  "login_password",
  "login_totp",
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

// RFC 4180: values with commas, quotes or line breaks are quoted, inner quotes doubled
function csvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvRow(item: CredentialData): CsvRow {
  const login = item.type === "login" ? item : null;
  return {
    folder: "",
    favorite: "",
    type: item.type,
    name: item.name,
    notes: item.notes,
    // One "name: value" per line; the hidden flag has no place in this format
    fields: item.fields.map((f) => `${f.name}: ${f.value}`).join("\n"),
    reprompt: "",
    login_uri: login ? login.urls.join(",") : "",
    login_username: login ? login.username : "",
    login_password: login ? login.password : "",
    login_totp: "",
  };
}

/**
 * Values are written unchanged: prefixing those starting with =, +, - or @ against formula
 * injection would alter passwords on import into another manager. The interface warns not to
 * open the file in a spreadsheet instead.
 */
export function buildCsvExport(items: CredentialData[]): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...items.map((item) => {
      const row = csvRow(normalizeCredential(item));
      return CSV_COLUMNS.map((column) => csvValue(row[column])).join(",");
    }),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** File name with the local date, e.g. keylord-export-2026-10-27-encrypted.json */
export function exportFileName(kind: ExportKind, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  switch (kind) {
    case "encrypted":
      return `keylord-export-${date}-encrypted.json`;
    case "json":
      return `keylord-export-${date}.json`;
    case "csv":
      return `keylord-export-${date}.csv`;
  }
}
