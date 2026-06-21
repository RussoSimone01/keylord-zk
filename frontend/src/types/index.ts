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

export interface ChangePasswordRequest {
	oldAuthKey: string;
	newAuthKey: string;
	newSalt: string;
	credentials: CredentialRequest[];
}

export interface RefreshRequest {
	refreshToken: string;
}
