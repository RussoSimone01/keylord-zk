import type {
	AuthResponse,
	ChangePasswordRequest,
	LoginRequest,
	RefreshRequest,
	RegisterRequest,
	SaltResponse,
	VerifyPasswordRequest,
} from "../types";
import client from "./client";

export async function register(data: RegisterRequest): Promise<AuthResponse> {
	const response = await client.post<AuthResponse>("/auth/register", data);
	return response.data;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
	const response = await client.post<AuthResponse>("/auth/login", data);
	return response.data;
}

export async function getSalt(username: string): Promise<SaltResponse> {
	const response = await client.get<SaltResponse>(`/auth/salt/${username}`);
	return response.data;
}

export async function refresh(data: RefreshRequest): Promise<AuthResponse> {
	const response = await client.post<AuthResponse>("/auth/refresh", data);
	return response.data;
}

export async function changePassword(
	data: ChangePasswordRequest,
): Promise<AuthResponse> {
	const response = await client.put<AuthResponse>(
		"/auth/change-password",
		data,
	);
	return response.data;
}

export async function verifyPassword(
	data: VerifyPasswordRequest,
): Promise<boolean> {
	const response = await client.post<{ isValid: boolean }>(
		"/auth/verify-password",
		data,
	);
	return response.data.isValid;
}

export async function deleteAccount(): Promise<void> {
	await client.delete("/auth/account");
}
