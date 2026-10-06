import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/errors";
import { deriveKeys, generateSalt, KDF_ITERATIONS } from "../crypto/vault";
import { register } from "../api/auth";
import "../styles/auth.css";
import Spinner from "../components/Spinner";
import { useTranslation } from "react-i18next";
import DisplayPreferences from "../components/DisplayPreferences";

function Signup() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const authStore = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function checkPassword(password: string, confirmPassword: string) {
    if (confirmPassword != "" && password != confirmPassword) {
      setError(t("validation.passwordMismatch"));
    } else {
      setError("");
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      if (password != confirmPassword) {
        setError(t("validation.passwordMismatch"));
        return;
      }
      const salt: string = generateSalt();
      const { authKey, encryptionKey } = await deriveKeys(
        password,
        salt,
        KDF_ITERATIONS,
      );
      const { accessToken, refreshToken } = await register({
        username,
        email: email || undefined,
        authKey,
        salt,
        kdfIterations: KDF_ITERATIONS,
      });
      authStore.setAuth(username, encryptionKey, accessToken, refreshToken);
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
        <h1>{t("signup.title")}</h1>
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
              maxLength={50}
              pattern="[A-Za-z0-9._\-]+"
              title={t("signup.usernameHint")}
              required
            ></input>
          </div>
          <div className="auth-field">
            <label htmlFor="email">{t("common.email")}</label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            ></input>
          </div>
          <div className="auth-field">
            <label htmlFor="password">{t("common.password")}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                checkPassword(e.target.value, confirmPassword);
              }}
              required
            ></input>
          </div>
          <div className="auth-field">
            <label htmlFor="confirmPassword">
              {t("common.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                checkPassword(password, e.target.value);
              }}
              required
            ></input>
          </div>
          <button
            className="auth-submit"
            id="signupButton"
            type="submit"
            disabled={isSubmitting}
          >
            {t("signup.submit")}
          </button>
          {error && <span className="auth-error">{error}</span>}
        </form>
        <div className="auth-link">
          {t("signup.haveAccount")}{" "}
          <Link to="/login">{t("signup.loginLink")}</Link>
        </div>
      </div>
      <DisplayPreferences />
    </div>
  );
}

export default Signup;
