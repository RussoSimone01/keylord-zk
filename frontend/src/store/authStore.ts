import { create } from "zustand";

interface AuthSession {
  username: string;
  encryptionKey: CryptoKey | null;
  // Needed to re-wrap the vault key on a password change and to rotate it
  wrappedVaultKey: string | null;
  vaultKeyEpoch: number;
  // Needed to derive the wrappingKey again when unlocking without a server round trip
  salt: string;
  kdfIterations: number;
  accessToken: string;
  refreshToken: string;
}

interface AuthStore extends AuthSession {
  setAuth(session: AuthSession): void;
  // A token refresh changes only the tokens: the key and the vault state stay as they are
  setTokens(accessToken: string, refreshToken: string): void;
  // Locks the vault: only the key leaves memory; tokens and wrappedVaultKey stay,
  // so the master password alone is enough to unlock (no server round trip)
  lock(): void;
  // Counterpart of lock: puts back the key obtained by unwrapping wrappedVaultKey
  unlock(encryptionKey: CryptoKey): void;
  clearAuth(forgetUsername?: boolean): void;
}

// Only the username survives a reload, to prefill the login form.
// Tokens stay in memory like the encryption key: without the key they are useless, and a duplicated tab
// (which copies sessionStorage) would otherwise share the refresh token with the original one.
const USERNAME_KEY = "username";

export const useAuthStore = create<AuthStore>((set) => ({
  username: sessionStorage.getItem(USERNAME_KEY) ?? "",
  encryptionKey: null,
  wrappedVaultKey: null,
  vaultKeyEpoch: 0,
  salt: "",
  kdfIterations: 0,
  accessToken: "",
  refreshToken: "",

  setAuth: (session) => {
    sessionStorage.setItem(USERNAME_KEY, session.username);
    set(session);
  },

  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

  lock: () => set({ encryptionKey: null }),

  unlock: (encryptionKey) => set({ encryptionKey }),

  // The username is kept so that unlocking again only needs the master password, unless the account is gone
  clearAuth: (forgetUsername = false) => {
    if (forgetUsername) {
      sessionStorage.removeItem(USERNAME_KEY);
    }
    set({
      ...(forgetUsername ? { username: "" } : {}),
      encryptionKey: null,
      wrappedVaultKey: null,
      vaultKeyEpoch: 0,
      salt: "",
      kdfIterations: 0,
      accessToken: "",
      refreshToken: "",
    });
  },
}));

export const selectIsLocked = (s: AuthStore) =>
  s.encryptionKey === null && s.refreshToken !== "";
