import type { CredentialRequest, CredentialResponse } from "../types";
import client from "./client";

export async function create(
	data: CredentialRequest,
): Promise<CredentialResponse> {
	const response = await client.post("/vault", data);
	return response.data;
}

export async function getAll(): Promise<CredentialResponse[]> {
	const response = await client.get("/vault");
	return response.data;
}

export async function update(
	credentialId: number,
	data: CredentialRequest,
): Promise<void> {
	await client.put(`/vault/${credentialId}`, data);
}

export async function deleteCredential(credentialId: number): Promise<void> {
	await client.delete(`/vault/${credentialId}`);
}
