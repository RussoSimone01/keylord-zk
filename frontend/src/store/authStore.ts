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
	clearAuth(forgetUsername?: boolean): void;
}

// Only the username survives a reload, to prefill the login form.
// Tokens stay in memory like the encryption key: without the key they are useless, and a duplicated tab
// (which copies sessionStorage) would otherwise share the refresh token with the original one.
const USERNAME_KEY = "username";

export const useAuthStore = create<AuthStore>((set) => ({
	username: sessionStorage.getItem(USERNAME_KEY) ?? "",
	encryptionKey: null,
	accessToken: "",
	refreshToken: "",

	setAuth: (username, encryptionKey, accessToken, refreshToken) => {
		sessionStorage.setItem(USERNAME_KEY, username);
		set({
			username,
			encryptionKey,
			accessToken,
			refreshToken,
		});
	},

	// The username is kept so that unlocking again only needs the master password, unless the account is gone
	clearAuth: (forgetUsername = false) => {
		if (forgetUsername) {
			sessionStorage.removeItem(USERNAME_KEY);
		}
		set({
			...(forgetUsername ? { username: "" } : {}),
			encryptionKey: null,
			accessToken: "",
			refreshToken: "",
		});
	},
}));
