/**
 * import.ts — vault import files, read entirely in the browser
 *
 * Accepted files:
 *   - Keylord exports (export.ts): encrypted JSON, plain JSON and CSV;
 *   - Bitwarden unencrypted JSON and CSV (the Keylord CSV uses the same layout);
 *   - CSV files of other password managers and browsers, recognized by their header.
 *
 * Every file becomes a list of credentials in the current schema. planImport then compares
 * them with the vault, and encryptImport builds the request for POST /vault/import.
 */

import { UserFacingError } from "../api/errors";
import type { ImportCredentialsRequest } from "../types";
import {
  cleanCredential,
  CREDENTIAL_SCHEMA_VERSION,
  normalizeCredential,
  sameCredential,
  type CredentialData,
  type CustomField,
  type LoginData,
  type NoteData,
  type PlainCredential,
} from "./credential";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  readEncryptedJsonExport,
} from "./export";
import {
  digestEncryptedData,
  encryptCredential,
  encryptedDataLength,
  MAX_ENCRYPTED_DATA_LENGTH,
} from "./vault";

/** Largest file read: a full vault exported as plain JSON stays well below it */
export const IMPORT_MAX_FILE_BYTES = 50 * 1024 * 1024;

export type ImportSource =
  | "keylordEncrypted"
  | "keylordJson"
  | "bitwardenJson"
  | "bitwardenCsv"
  | "chromeCsv"
  | "firefoxCsv"
  | "safariCsv"
  | "onePasswordCsv"
  | "lastPassCsv"
  | "keePassCsv"
  | "protonPassCsv"
  | "dashlaneCsv"
  | "genericCsv";

export interface ParsedImport {
  source: ImportSource;
  items: CredentialData[];
  // Entries left out while reading: unsupported types (cards, identities, ...), malformed or empty
  skipped: number;
}

/** A Keylord encrypted export still needs its file password; every other file is read at once */
export type ImportFile =
  | { kind: "encrypted"; text: string }
  | { kind: "parsed"; result: ParsedImport };

export interface ImportOptions {
  // Name given to entries that have none and nothing to derive one from
  untitledName: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function login(values: Omit<LoginData, "v" | "type">): LoginData {
  return { v: CREDENTIAL_SCHEMA_VERSION, type: "login", ...values };
}

function note(values: Omit<NoteData, "v" | "type">): NoteData {
  return { v: CREDENTIAL_SCHEMA_VERSION, type: "note", ...values };
}

/**
 * Recognizes the file from its content and reads it, unless it is a Keylord encrypted export.
 * @throws UserFacingError if the format is not recognized or not supported
 */
export function readImportFile(
  rawText: string,
  options: ImportOptions,
): ImportFile {
  // Byte order mark written by some exporters and spreadsheets
  const text = rawText.replace(/^\uFEFF/, "");
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return readJsonFile(text, options);
  }
  return { kind: "parsed", result: readCsvFile(text, options) };
}

/**
 * Opens a Keylord encrypted export.
 * @throws UserFacingError for a wrong password or a file that is damaged or from a newer version
 */
export async function openEncryptedImport(
  text: string,
  password: string,
  options: ImportOptions,
): Promise<ParsedImport> {
  try {
    const payload = await readEncryptedJsonExport(text, password);
    return finish("keylordEncrypted", payload.items, 0, options);
  } catch (err) {
    // AES-GCM rejects a wrong key and altered data alike: with an intact header it is almost always the password
    if (err instanceof DOMException && err.name === "OperationError") {
      throw new UserFacingError("importVault.wrongFilePassword");
    }
    throw new UserFacingError("importVault.unsupportedKeylordFile");
  }
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function readJsonFile(text: string, options: ImportOptions): ImportFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new UserFacingError("importVault.invalidJson");
  }
  if (!isObject(data)) {
    throw new UserFacingError("importVault.unrecognizedFile");
  }

  if (data.format === EXPORT_FORMAT) {
    if (data.version !== EXPORT_VERSION) {
      throw new UserFacingError("importVault.unsupportedKeylordFile");
    }
    if (data.encrypted === true) {
      return { kind: "encrypted", text };
    }
    if (data.encrypted === false && Array.isArray(data.items)) {
      return { kind: "parsed", result: readKeylordItems(data.items, options) };
    }
    throw new UserFacingError("importVault.unsupportedKeylordFile");
  }

  if (Array.isArray(data.items) && data.encrypted === false) {
    return { kind: "parsed", result: readBitwardenJson(data.items, options) };
  }
  // Bitwarden password-protected or account-restricted export: its key derivation is not available here
  if (data.encrypted === true) {
    throw new UserFacingError("importVault.bitwardenEncrypted");
  }
  throw new UserFacingError("importVault.unrecognizedFile");
}

/** Items of a plain Keylord export: entries that do not match the schema are skipped one by one */
function readKeylordItems(
  rawItems: unknown[],
  options: ImportOptions,
): ParsedImport {
  const items: CredentialData[] = [];
  let skipped = 0;
  for (const raw of rawItems) {
    try {
      items.push(normalizeCredential(raw));
    } catch {
      skipped++;
    }
  }
  return finish("keylordJson", items, skipped, options);
}

// Bitwarden item and custom field types
const BITWARDEN_LOGIN = 1;
const BITWARDEN_NOTE = 2;
const BITWARDEN_FIELD_HIDDEN = 1;
const BITWARDEN_FIELD_LINKED = 3;

function readBitwardenJson(
  rawItems: unknown[],
  options: ImportOptions,
): ParsedImport {
  const items: CredentialData[] = [];
  let skipped = 0;
  for (const raw of rawItems) {
    if (
      !isObject(raw) ||
      (raw.type !== BITWARDEN_LOGIN && raw.type !== BITWARDEN_NOTE)
    ) {
      skipped++;
      continue;
    }
    const fields: CustomField[] = Array.isArray(raw.fields)
      ? raw.fields
          .filter(
            (f): f is JsonObject =>
              isObject(f) && f.type !== BITWARDEN_FIELD_LINKED,
          )
          .map((f) => ({
            name: stringOrEmpty(f.name),
            // Boolean fields are stored as the strings "true" and "false"
            value: f.value == null ? "" : String(f.value),
            hidden: f.type === BITWARDEN_FIELD_HIDDEN,
          }))
      : [];
    const common = {
      name: stringOrEmpty(raw.name),
      notes: stringOrEmpty(raw.notes),
    };
    if (raw.type === BITWARDEN_NOTE) {
      items.push(note({ ...common, fields }));
      continue;
    }
    const data = isObject(raw.login) ? raw.login : {};
    const urls = Array.isArray(data.uris)
      ? data.uris.map((u) => (isObject(u) ? stringOrEmpty(u.uri) : ""))
      : [];
    items.push(
      login({
        ...common,
        fields: withTotp(fields, stringOrEmpty(data.totp)),
        urls,
        username: stringOrEmpty(data.username),
        password: stringOrEmpty(data.password),
      }),
    );
  }
  return finish("bitwardenJson", items, skipped, options);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * RFC 4180 parser: comma separator, values optionally quoted, inner quotes doubled,
 * line breaks (CRLF, LF or CR) allowed inside quoted values.
 * @throws UserFacingError if a quoted value is never closed
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        value += char;
      }
      i++;
      continue;
    }
    if (char === '"' && value === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\r" || char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
    } else {
      value += char;
    }
    i++;
  }
  if (quoted) {
    throw new UserFacingError("importVault.invalidCsv");
  }
  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  // Blank lines carry no entry
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

type Column =
  | "type"
  | "name"
  | "url"
  | "username"
  | "email"
  | "password"
  | "notes"
  | "totp"
  | "fields";

// Header names of each column across exporters, lowercase, in order of preference
const COLUMN_ALIASES: Record<Column, string[]> = {
  type: ["type"],
  name: ["name", "title", "account"],
  url: ["login_uri", "url", "website", "web site"],
  username: ["login_username", "username", "login name", "user name", "login"],
  email: ["email"],
  password: ["login_password", "password"],
  notes: ["notes", "note", "extra", "comments"],
  totp: ["login_totp", "totp", "otpauth", "otpsecret", "otp"],
  fields: ["fields"],
};

/** Exporter that wrote the header, recognized by the columns only it uses */
function detectCsvSource(headers: Set<string>): ImportSource {
  const has = (...names: string[]) => names.every((n) => headers.has(n));
  if (has("login_uri", "login_password")) {
    return "bitwardenCsv";
  }
  if (has("httprealm") || has("formactionorigin")) {
    return "firefoxCsv";
  }
  if (has("grouping", "extra")) {
    return "lastPassCsv";
  }
  if (has("vault", "createtime")) {
    return "protonPassCsv";
  }
  if (has("group", "title") || has("account", "login name")) {
    return "keePassCsv";
  }
  if (has("otpauth", "archived") || has("otpauth", "tags")) {
    return "onePasswordCsv";
  }
  if (has("otpauth")) {
    return "safariCsv";
  }
  if (has("username2") || has("otpsecret")) {
    return "dashlaneCsv";
  }
  if (has("name", "url", "username", "password")) {
    return "chromeCsv";
  }
  return "genericCsv";
}

// Address LastPass writes for its secure notes
const LASTPASS_NOTE_URL = "http://sn";

function readCsvFile(text: string, options: ImportOptions): ParsedImport {
  const [header, ...rows] = parseCsv(text);
  if (header === undefined) {
    throw new UserFacingError("importVault.emptyFile");
  }
  const headers = header.map((h) => h.trim().toLowerCase());
  const indexOf = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([column, aliases]) => [
      column,
      aliases.map((a) => headers.indexOf(a)).find((i) => i >= 0) ?? -1,
    ]),
  ) as Record<Column, number>;
  const hasColumn = (column: Column) => indexOf[column] >= 0;
  // At least something identifying the entry and something worth keeping
  if (
    !(hasColumn("name") || hasColumn("url")) ||
    !(hasColumn("username") || hasColumn("password") || hasColumn("notes"))
  ) {
    throw new UserFacingError("importVault.unrecognizedCsv");
  }

  const source = detectCsvSource(new Set(headers));
  const items: CredentialData[] = [];
  let skipped = 0;
  for (const row of rows) {
    const get = (column: Column) =>
      hasColumn(column) ? (row[indexOf[column]] ?? "") : "";
    const item = csvItem(source, get);
    if (item === null) {
      skipped++;
    } else {
      items.push(item);
    }
  }
  return finish(source, items, skipped, options);
}

/** Credential of one CSV row; null for unsupported types and rows with nothing to import */
function csvItem(
  source: ImportSource,
  get: (column: Column) => string,
): CredentialData | null {
  const type = get("type").trim().toLowerCase();
  const url = get("url").trim();
  let kind: "login" | "note";
  if (type === "" || type === "login") {
    kind = url === LASTPASS_NOTE_URL ? "note" : "login";
  } else if (
    type === "note" ||
    type === "securenote" ||
    type === "secure note"
  ) {
    kind = "note";
  } else {
    return null;
  }

  const name = get("name");
  const notes = get("notes");
  // Bitwarden layout: one "name: value" per line, as written by export.ts
  const fields: CustomField[] = get("fields")
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const separator = line.indexOf(": ");
      return separator < 0
        ? { name: line, value: "", hidden: false }
        : {
            name: line.slice(0, separator),
            value: line.slice(separator + 2),
            hidden: false,
          };
    });

  if (kind === "note") {
    if (name.trim() === "" && notes === "" && fields.length === 0) {
      return null;
    }
    return note({ name, notes, fields });
  }

  // Only the Bitwarden layout packs several addresses in one value
  const urls =
    url === "" ? [] : source === "bitwardenCsv" ? url.split(",") : [url];
  const email = get("email").trim();
  let username = get("username");
  if (username === "") {
    username = email;
  } else if (email !== "" && email !== username.trim()) {
    fields.push({ name: "Email", value: email, hidden: false });
  }
  const password = get("password");
  if (
    name.trim() === "" &&
    urls.length === 0 &&
    username === "" &&
    password === "" &&
    notes === ""
  ) {
    return null;
  }
  return login({
    name,
    notes,
    fields: withTotp(fields, get("totp").trim()),
    urls,
    username,
    password,
  });
}

/** The schema has no TOTP field: the secret is kept as a hidden custom field */
function withTotp(fields: CustomField[], totp: string): CustomField[] {
  return totp === ""
    ? fields
    : [...fields, { name: "TOTP", value: totp, hidden: true }];
}

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

/** Lowercase host without "www.", also for addresses written without a scheme */
function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Canonical form with blank rows removed and a name for every entry, as the edit panel requires */
function finish(
  source: ImportSource,
  rawItems: CredentialData[],
  skipped: number,
  options: ImportOptions,
): ParsedImport {
  const items = rawItems.map((raw) => {
    const item = cleanCredential(raw);
    if (item.name === "") {
      const derived =
        item.type === "login"
          ? (item.urls.map(hostOf).find((h) => h !== null) ??
            item.urls[0] ??
            item.username.trim())
          : "";
      item.name = derived || options.untitledName;
    }
    return item;
  });
  return { source, items, skipped };
}

// ---------------------------------------------------------------------------
// Comparison with the vault
// ---------------------------------------------------------------------------

export type ConflictAction = "skip" | "add" | "replace";

export type CandidateStatus =
  // Not in the vault
  | "new"
  // Same content as a credential already in the vault, or repeated in the file
  | "identical"
  // Same login (site and username) or note (name) as a credential with different content
  | "conflict"
  // Larger, once encrypted, than the server accepts
  | "tooLarge";

export interface ImportCandidate {
  item: CredentialData;
  status: CandidateStatus;
  // Vault credential it collides with, for "conflict" (and "identical" when it is in the vault)
  match?: PlainCredential;
}

/**
 * Keys under which two entries count as the same: a login by each of its hosts and its username
 * (its name when it has no addresses), a note by its name. Comparisons ignore letter case.
 */
function matchKeys(credential: CredentialData): string[] {
  const name = credential.name.trim().toLowerCase();
  if (credential.type === "note") {
    return [`note\n${name}`];
  }
  const username = credential.username.trim().toLowerCase();
  const hosts = credential.urls
    .map(hostOf)
    .filter((h): h is string => h !== null);
  const ids = hosts.length > 0 ? [...new Set(hosts)] : [name];
  return ids.map((id) => `login\n${id}\n${username}`);
}

/** Classifies each imported entry against the vault, keeping the order of the file */
export function planImport(
  items: CredentialData[],
  existing: PlainCredential[],
): ImportCandidate[] {
  const byKey = new Map<string, PlainCredential[]>();
  for (const credential of existing) {
    for (const key of matchKeys(credential)) {
      byKey.set(key, [...(byKey.get(key) ?? []), credential]);
    }
  }
  const accepted: CredentialData[] = [];
  return items.map((item): ImportCandidate => {
    if (encryptedDataLength(item) > MAX_ENCRYPTED_DATA_LENGTH) {
      return { item, status: "tooLarge" };
    }
    const matches = [
      ...new Set(matchKeys(item).flatMap((key) => byKey.get(key) ?? [])),
    ];
    const same = matches.find((m) => sameCredential(m, item));
    if (same !== undefined) {
      return { item, status: "identical", match: same };
    }
    if (accepted.some((a) => sameCredential(a, item))) {
      return { item, status: "identical" };
    }
    accepted.push(item);
    return matches.length > 0
      ? { item, status: "conflict", match: matches[0] }
      : { item, status: "new" };
  });
}

export interface ImportPlanCounts {
  added: number;
  replaced: number;
}

/** What the import will do with the given choices for the conflicts, indexed like the candidates */
export function countImport(
  candidates: ImportCandidate[],
  actions: ConflictAction[],
): ImportPlanCounts {
  const counts = { added: 0, replaced: 0 };
  const replacedIds = new Set<number | undefined>();
  candidates.forEach((candidate, i) => {
    if (candidate.status === "new") {
      counts.added++;
    } else if (candidate.status === "conflict" && actions[i] !== "skip") {
      // Same rule as encryptImport: a credential is overwritten at most once
      const id = candidate.match?.id;
      if (actions[i] === "add" || id === undefined || replacedIds.has(id)) {
        counts.added++;
      } else {
        replacedIds.add(id);
        counts.replaced++;
      }
    }
  });
  return counts;
}

/**
 * Encrypts the entries to create and those that overwrite a vault credential. Each overwrite
 * carries the digest of the stored data it replaces, so the server rejects it if that changed.
 * Two conflicts may point to the same credential: only the first overwrites it, the next are added.
 * @param storedData Encrypted data of the vault credentials, by id, as read before planning
 */
export async function encryptImport(
  candidates: ImportCandidate[],
  actions: ConflictAction[],
  storedData: ReadonlyMap<number, string>,
  encryptionKey: CryptoKey,
): Promise<ImportCredentialsRequest> {
  const additions: CredentialData[] = [];
  const replacements = new Map<number, CredentialData>();
  candidates.forEach((candidate, i) => {
    if (candidate.status === "new") {
      additions.push(candidate.item);
    } else if (candidate.status === "conflict" && actions[i] !== "skip") {
      const id = candidate.match?.id;
      if (actions[i] === "add" || id === undefined || replacements.has(id)) {
        additions.push(candidate.item);
      } else {
        replacements.set(id, candidate.item);
      }
    }
  });
  return {
    credentials: await Promise.all(
      additions.map((item) => encryptCredential(item, encryptionKey)),
    ),
    replacements: await Promise.all(
      [...replacements].map(async ([id, item]) => {
        const stored = storedData.get(id);
        if (stored === undefined) {
          throw new Error("Missing stored data for a replaced credential");
        }
        const { encryptedData } = await encryptCredential(item, encryptionKey);
        return {
          id,
          previousDigest: await digestEncryptedData(stored),
          encryptedData,
        };
      }),
    ),
  };
}
