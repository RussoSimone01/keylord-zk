import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSalt, login } from "../api/auth";
import { deriveKeys, unwrapVaultKey } from "../crypto/vault";
import { useAuthStore } from "../store/authStore";
import { UserFacingError, getErrorMessage } from "../api/errors";
import "../styles/auth.css";
import Spinner from "../components/Spinner";
import { useTranslation } from "react-i18next";
import DisplayPreferences from "../components/DisplayPreferences";
import { takeLoginNotice } from "../lib/session";

function Login() {
  const { t } = useTranslation();
  const authStore = useAuthStore();
  // Prefilled after a reload or a lock: unlocking then only needs the master password
  const [username, setUsername] = useState(authStore.username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  // Set when the session was ended for the user (e.g. too many unlock attempts), to say why
  const [notice] = useState(takeLoginNotice);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const { salt, kdfIterations } = await getSalt(username);
      const keys = await deriveKeys(password, salt, kdfIterations);
      const { accessToken, refreshToken, wrappedVaultKey, vaultKeyEpoch } =
        await login({ username, authKey: keys.authKey });
      let vaultKey: CryptoKey;
      try {
        vaultKey = await unwrapVaultKey(wrappedVaultKey, keys.wrappingKey);
      } catch {
        // The server accepted the password, so the wrapped key is damaged: this is not a wrong password
        throw new UserFacingError("errors.vaultKeyUnreadable");
      }
      authStore.setAuth({
        username,
        encryptionKey: vaultKey,
        wrappedVaultKey,
        vaultKeyEpoch,
        salt,
        kdfIterations,
        accessToken,
        refreshToken,
      });
      navigate("/vault");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitting) {
    return <Spinner />;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{t("login.title")}</h1>
        {notice && !error && (
          <p className="auth-notice" role="status">
            {t(notice)}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="auth-field">
            <label htmlFor="username">{t("common.username")}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus={username === ""}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">{t("common.password")}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus={username !== ""}
              required
            />
          </div>
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {t("login.submit")}
          </button>
          {error && <span className="auth-error">{error}</span>}
        </form>
        <div className="auth-link">
          {t("login.noAccount")}{" "}
          <Link to="/signup">{t("login.signupLink")}</Link>
        </div>
      </div>
      <DisplayPreferences />
    </div>
  );
}

export default Login;
