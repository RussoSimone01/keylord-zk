import { create } from "zustand";

interface AuthStore {
	username: string;
	encryptionKey: CryptoKey | null;
	accessToken: string;
	refreshToken: string;

	setAuth(
		username: string,
		encryptionKey: CryptoKey | null,
		accessToken: string,
		refreshToken: string,
	): void;
	clearAuth(): void;
}

export const useAuthStore = create<AuthStore>((set) => ({
	username: sessionStorage.getItem("username") ?? "",
	encryptionKey: null,
	accessToken: sessionStorage.getItem("accessToken") ?? "",
	refreshToken: sessionStorage.getItem("refreshToken") ?? "",

	setAuth: (username, encryptionKey, accessToken, refreshToken) => {
		sessionStorage.setItem("username", username);
		sessionStorage.setItem("accessToken", accessToken);
		sessionStorage.setItem("refreshToken", refreshToken);
		set({
			username,
			encryptionKey,
			accessToken,
			refreshToken,
		});
	},

	clearAuth: () => {
		sessionStorage.removeItem("username");
		sessionStorage.removeItem("accessToken");
		sessionStorage.removeItem("refreshToken");
		set({
			encryptionKey: null,
			accessToken: "",
			refreshToken: "",
		});
	},
}));
