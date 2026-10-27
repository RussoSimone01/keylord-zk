/**
 * credential.ts — schema of the decrypted credential payload
 *
 * The payload is the JSON encrypted by vault.ts. Its type travels inside the ciphertext,
 * so the server cannot tell logins and notes apart. Payloads without a version
 * ({ site, username, password }) are read as logins; they are written in the current
 * format the next time they are encrypted.
 */

export const CREDENTIAL_SCHEMA_VERSION = 1;

export const CREDENTIAL_TYPES = ["login", "note"] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export interface CustomField {
  name: string;
  value: string;
  // Masked in the interface like a password
  hidden: boolean;
}

interface CredentialCommon {
  v: typeof CREDENTIAL_SCHEMA_VERSION;
  name: string;
  notes: string;
  fields: CustomField[];
  // Reserved for folders: preserved but not edited yet
  folderId?: string;
}

export interface LoginData extends CredentialCommon {
  type: "login";
  urls: string[];
  username: string;
  password: string;
}

export interface NoteData extends CredentialCommon {
  type: "note";
}

export type CredentialData = LoginData | NoteData;

/** Decrypted credential; the id comes from the server and is never encrypted */
export type PlainCredential = CredentialData & { id?: number };

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(obj: JsonObject, key: string): string {
  const value = obj[key];
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid credential field: ${key}`);
  }
  return value;
}

function readStringArray(obj: JsonObject, key: string): string[] {
  const value = obj[key];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`Invalid credential field: ${key}`);
  }
  return [...value];
}

function readFields(obj: JsonObject): CustomField[] {
  const value = obj.fields;
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("Invalid credential field: fields");
  }
  return value.map((field) => {
    if (!isObject(field) || typeof field.hidden !== "boolean") {
      throw new Error("Invalid custom field");
    }
    return {
      name: readString(field, "name"),
      value: readString(field, "value"),
      hidden: field.hidden,
    };
  });
}

// Host-like strings ("example.com", "https://example.com/login") count as addresses; labels such as "Bank" do not.
function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/)?[^\s/]+\.[^\s.]{2,}(\/\S*)?$/i.test(text.trim());
}

/** Empty credential of the given type, as the starting point of a new entry */
export function emptyCredential(type: CredentialType): CredentialData {
  if (type === "login") {
    return {
      v: CREDENTIAL_SCHEMA_VERSION,
      type,
      name: "",
      notes: "",
      fields: [],
      urls: [],
      username: "",
      password: "",
    };
  }
  return {
    v: CREDENTIAL_SCHEMA_VERSION,
    type,
    name: "",
    notes: "",
    fields: [],
  };
}

/**
 * Validates a payload and returns it in canonical form: fixed key order, no id, missing
 * optional fields filled with empty values. Also accepts an already decrypted credential.
 * @throws If the payload is malformed, of an unknown type or of a newer schema version
 */
export function normalizeCredential(raw: unknown): CredentialData {
  if (!isObject(raw)) {
    throw new Error("Invalid credential payload");
  }

  if (raw.v === undefined) {
    const site = readString(raw, "site");
    return {
      v: CREDENTIAL_SCHEMA_VERSION,
      type: "login",
      name: site,
      notes: "",
      fields: [],
      urls: looksLikeUrl(site) ? [site.trim()] : [],
      username: readString(raw, "username"),
      password: readString(raw, "password"),
    };
  }

  // A newer version may hold fields this client would drop when saving
  if (raw.v !== CREDENTIAL_SCHEMA_VERSION) {
    throw new Error(`Unsupported credential schema version: ${String(raw.v)}`);
  }

  const name = readString(raw, "name");
  const notes = readString(raw, "notes");
  const fields = readFields(raw);
  const folderId =
    raw.folderId === undefined ? {} : { folderId: readString(raw, "folderId") };

  switch (raw.type) {
    case "login":
      return {
        v: CREDENTIAL_SCHEMA_VERSION,
        type: "login",
        name,
        notes,
        fields,
        ...folderId,
        urls: readStringArray(raw, "urls"),
        username: readString(raw, "username"),
        password: readString(raw, "password"),
      };
    case "note":
      return {
        v: CREDENTIAL_SCHEMA_VERSION,
        type: "note",
        name,
        notes,
        fields,
        ...folderId,
      };
    default:
      throw new Error(`Unknown credential type: ${String(raw.type)}`);
  }
}

/** Removes blank addresses and custom fields with neither name nor value; secrets are left untouched */
export function cleanCredential(credential: CredentialData): CredentialData {
  const data = normalizeCredential(credential);
  data.name = data.name.trim();
  data.fields = data.fields.filter(
    (f) => f.name.trim() !== "" || f.value !== "",
  );
  if (data.type === "login") {
    data.urls = data.urls.map((u) => u.trim()).filter((u) => u !== "");
  }
  return data;
}

/** Keeps name, notes, custom fields and folder when the type of a new entry changes */
export function changeCredentialType(
  credential: CredentialData,
  type: CredentialType,
): CredentialData {
  if (credential.type === type) {
    return credential;
  }
  const { name, notes, fields, folderId } = credential;
  return {
    ...emptyCredential(type),
    name,
    notes,
    fields,
    ...(folderId === undefined ? {} : { folderId }),
  };
}

/** Compares the content that would be saved, so blank rows added and left empty do not count */
export function sameCredential(a: CredentialData, b: CredentialData): boolean {
  return (
    JSON.stringify(cleanCredential(a)) === JSON.stringify(cleanCredential(b))
  );
}

/** Case-insensitive match on name, username and addresses; query must already be lowercase */
export function credentialMatches(
  credential: CredentialData,
  query: string,
): boolean {
  const haystack =
    credential.type === "login"
      ? [credential.name, credential.username, ...credential.urls]
      : [credential.name];
  return haystack.some((text) => text.toLowerCase().includes(query));
}
