import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
// adjust the imports to your project
import { deriveKeys, unwrapVaultKey } from "../crypto/vault";
import { useAuthStore } from "../store/authStore";
import { getErrorMessage } from "../api/errors";
import { logout } from "../api/auth";
import { useNavigate } from "react-router-dom";
import DisplayPreferences from "./DisplayPreferences";
import { Lock } from "lucide-react";
import "./Unlock.css";

const MAX_ATTEMPTS = 3;

function Unlock() {
  const { t } = useTranslation();
  const username = useAuthStore((s) => s.username);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const attempts = useRef(0);
  const navigate = useNavigate();

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");
    const { salt, kdfIterations, wrappedVaultKey, unlock, clearAuth } =
      useAuthStore.getState();
    try {
      if (!wrappedVaultKey) {
        clearAuth();
        return;
      }
      const keys = await deriveKeys(password, salt, kdfIterations);
      let vaultKey: CryptoKey;
      try {
        vaultKey = await unwrapVaultKey(wrappedVaultKey, keys.wrappingKey);
      } catch {
        // AES-GCM tag mismatch: almost certainly a wrong password
        attempts.current += 1;
        if (attempts.current >= MAX_ATTEMPTS) {
          // Too many local attempts: force a full login, where the server lockout applies
          clearAuth();
          return;
        }
        setError(t("unlock.wrongPassword"));
        return;
      }
      unlock(vaultKey);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      void logout(refreshToken);
    }
    clearAuth();
    navigate("/login");
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="unlock-header">
          <h1>{t("unlock.title")}</h1>
          <button type="button" onClick={handleLogout} className="unlock-lock">
            <Lock size={16} />
            <span>{t("unlock.logout")}</span>
          </button>
        </div>
        <p>{t("unlock.subtitle")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="auth-field">
            <label htmlFor="username">{t("common.username")}</label>
            <input
              id="username"
              type="text"
              value={username}
              readOnly
              disabled
            />
          </div>
          <div className="auth-field">
            <label htmlFor="unlock-password">{t("unlock.passwordLabel")}</label>
            <input
              id="unlock-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting || !password}
          >
            {t("unlock.submit")}
          </button>
          {error && (
            <span className="auth-error" role="alert">
              {error}
            </span>
          )}
        </form>
      </div>
      <DisplayPreferences />
    </div>
  );
}

export default Unlock;
