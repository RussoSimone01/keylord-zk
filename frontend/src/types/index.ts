export interface CredentialBase {
  id?: number;
  encryptedData: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  authKey: string;
  salt: string;
  kdfIterations: number;
  wrappedVaultKey: string;
}

export interface LoginRequest {
  username: string;
  authKey: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SaltResponse {
  salt: string;
  kdfIterations: number;
}

export interface CredentialRequest {
  encryptedData: string;
}

export interface CredentialResponse extends CredentialBase {
  id: number;
}

export interface ReencryptedCredential {
  id: number;
  // SHA-256 (lowercase hex) of the encrypted data that was decrypted and re-encrypted
  previousDigest: string;
  encryptedData: string;
}

export interface ChangePasswordRequest {
  oldAuthKey: string;
  newAuthKey: string;
  newSalt: string;
  newKdfIterations: number;
  // Every credential of the vault, each once, with its current id. Empty for users with a vault key
  credentials: ReencryptedCredential[];
  // Only for users with a vault key: the same vault key, wrapped with the key derived from the new password
  newWrappedVaultKey?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface VerifyPasswordRequest {
  authKey: string;
}

export interface DeleteAccountRequest {
  authKey: string;
}

export interface LoginResponse extends AuthResponse {
  // null for users not migrated yet
  wrappedVaultKey: string | null;
  vaultKeyEpoch: number;
}
