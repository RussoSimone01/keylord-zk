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
  // SHA-256 (lowercase hex) of the stored encrypted data being replaced: a different stored value rejects the write
  previousDigest: string;
  encryptedData: string;
}

export interface ImportCredentialsRequest {
  // New credentials, created in this order
  credentials: CredentialRequest[];
  // Existing credentials to overwrite, each applied only if its stored content still has previousDigest
  replacements: ReencryptedCredential[];
}

export interface ImportCredentialsResponse {
  // Same order as the credentials of the request
  created: CredentialResponse[];
}

export interface ChangePasswordRequest {
  oldAuthKey: string;
  newAuthKey: string;
  newSalt: string;
  newKdfIterations: number;
  // Empty unless the vault key is rotated: then every credential, each once, re-encrypted with the new key
  credentials: ReencryptedCredential[];
  // The vault key wrapped with the key derived from the new password
  newWrappedVaultKey: string;
  // Also replace the vault key itself
  rotateVaultKey: boolean;
  // Epoch the client believes is current: the server rejects the request if the vault key changed meanwhile
  currentEpoch: number;
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
  wrappedVaultKey: string;
  vaultKeyEpoch: number;
}
