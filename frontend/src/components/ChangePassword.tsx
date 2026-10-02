import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { changePassword, getSalt, verifyPassword } from "../api/auth";
import { deriveKeys, reencryptVault } from "../crypto/vault";
import { getAll } from "../api/vault";
import { getErrorMessage } from "../api/errors";
import "../styles/auth.css";
import "../pages/Settings.css";
import Spinner from "./Spinner";
import { useTranslation } from "react-i18next";

interface ChangePasswordProps {
  onBack: () => void;
}

function ChangePassword({ onBack }: ChangePasswordProps) {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const authStore = useAuthStore();
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
      if (oldPassword === password) {
        setError(t("validation.passwordUnchanged"));
        return;
      }
      const { salt, kdfIterations } = await getSalt(authStore.username);
      const { authKey: oldAuthKey, encryptionKey: oldEncryptionKey } =
        await deriveKeys(oldPassword, salt, kdfIterations);
      if (!(await verifyPassword({ authKey: oldAuthKey }))) {
        setError(t("validation.currentPasswordIncorrect"));
        return;
      }
      const oldCredentials = await getAll();
      const { newKeys, newSalt, newKdfIterations, reencryptedCredentials } =
        await reencryptVault(oldCredentials, oldEncryptionKey, password);
      const { accessToken, refreshToken } = await changePassword({
        oldAuthKey,
        newAuthKey: newKeys.authKey,
        newSalt,
        newKdfIterations,
        credentials: reencryptedCredentials,
      });
      authStore.setAuth(
        authStore.username,
        newKeys.encryptionKey,
        accessToken,
        refreshToken,
      );
      onBack();
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
    <div>
      <div className="auth-card">
        <button className="settings-back" type="button" onClick={onBack}>
          {t("common.back")}
        </button>
        <h1>{t("changePassword.title")}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="auth-field">
            <label htmlFor="oldPassword">
              {t("changePassword.currentPassword")}
            </label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
              }}
              required
            ></input>
          </div>
          <div className="auth-field">
            <label htmlFor="password">{t("changePassword.newPassword")}</label>
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
              {t("changePassword.confirmPassword")}
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
            id="changePwdButton"
            type="submit"
            className="auth-submit"
            disabled={isSubmitting}
          >
            {t("changePassword.submit")}
          </button>
          {error && <span className="auth-error">{error}</span>}
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
