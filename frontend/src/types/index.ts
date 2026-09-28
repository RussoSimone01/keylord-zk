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
	// Every credential of the vault, each once, with its current id
	credentials: ReencryptedCredential[];
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
