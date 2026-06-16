import { create } from "zustand";

interface AuthStore {
	encryptionKey: CryptoKey | null;
	accessToken: string;
	refreshToken: string;

	setAuth(
		encryptionKey: CryptoKey | null,
		accessToken: string,
		refreshToken: string,
	): void;
	clearAuth(): void;
}

export const useAuthStore = create<AuthStore>((set) => ({
	encryptionKey: null,
	accessToken: sessionStorage.getItem("accessToken") ?? "",
	refreshToken: sessionStorage.getItem("refreshToken") ?? "",

	setAuth: (encryptionKey, accessToken, refreshToken) => {
		sessionStorage.setItem("accessToken", accessToken);
		sessionStorage.setItem("refreshToken", refreshToken);
		set({
			encryptionKey,
			accessToken,
			refreshToken,
		});
	},

	clearAuth: () => {
		sessionStorage.removeItem("accessToken");
		sessionStorage.removeItem("refreshToken");
		set({
			encryptionKey: null,
			accessToken: "",
			refreshToken: "",
		});
	},
}));
