import { logout } from "../api/auth";
import { useAuthStore } from "../store/authStore";

// Message keys the login page shows after a session was ended for the user
export type LoginNotice = "unlock.tooManyAttempts" | "vault.sessionExpired";

// Kept in memory rather than in router state: the route guards redirect to /login on their own
// as soon as the tokens are cleared, and that redirect would drop the state.
let pendingNotice: LoginNotice | null = null;

// Ends the session: revokes the refresh token on the server (best effort, the request is not awaited)
// and drops tokens and key from memory. With a notice, the login page explains why.
export function endSession(notice?: LoginNotice) {
  pendingNotice = notice ?? null;
  const { refreshToken, clearAuth } = useAuthStore.getState();
  if (refreshToken) {
    void logout(refreshToken);
  }
  clearAuth();
}

// Returns the pending notice once, so it is not shown again on the next visit.
export function takeLoginNotice(): LoginNotice | null {
  const notice = pendingNotice;
  pendingNotice = null;
  return notice;
}
