import { useRef, useState } from "react";
import AuthBrand from "./AuthBrand";
import { usePageTitle } from "../hooks/usePageTitle";
import { Trans, useTranslation } from "react-i18next";
import { deriveKeys, unwrapVaultKey } from "../crypto/vault";
import { useAuthStore } from "../store/authStore";
import { getErrorMessage } from "../api/errors";
import { endSession, type LoginNotice } from "../lib/session";
import { useNavigate } from "react-router-dom";
import DisplayPreferences from "./DisplayPreferences";
import { LogOut } from "lucide-react";
import "./Unlock.css";

const MAX_ATTEMPTS = 3;

function Unlock() {
  const { t } = useTranslation();
  usePageTitle("unlock.title");
  const username = useAuthStore((s) => s.username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const attempts = useRef(0);
  const navigate = useNavigate();

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");
    const { salt, kdfIterations, wrappedVaultKey, unlock } =
      useAuthStore.getState();
    try {
      if (!wrappedVaultKey) {
        endSessionWith("vault.sessionExpired");
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
          // Too many local attempts: end the session and force a full login, where the server lockout applies
          endSessionWith("unlock.tooManyAttempts");
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

  // Revokes the session on the server too; the login page then explains why it ended
  function endSessionWith(notice: LoginNotice) {
    endSession(notice);
    navigate("/login", { replace: true });
  }

  function handleLogout() {
    endSession();
    navigate("/login");
  }

  return (
    <div className="auth-container">
      <AuthBrand />
      <div className="auth-card">
        <div className="unlock-header">
          <h1>{t("unlock.title")}</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="unlock-logout"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>{t("unlock.logout")}</span>
          </button>
        </div>
        <p className="unlock-identity">
          <Trans
            i18nKey="unlock.signedInAs"
            values={{ username }}
            components={{ mono: <span className="mono" /> }}
          />
        </p>
        <p>{t("unlock.subtitle")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          {/* Not shown: lets password managers pair the master password with this account */}
          <input
            className="sr-only"
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
          />
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
            {isSubmitting ? t("unlock.unlocking") : t("unlock.submit")}
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
