import { useState } from "react";
import { deleteAccount, getSalt } from "../api/auth";
import { getErrorMessage } from "../api/errors";
import { useAuthStore } from "../store/authStore";
import { deriveKeys } from "../crypto/vault";
import { useNavigate } from "react-router-dom";
import "../pages/Settings.css";
import Spinner from "./Spinner";
import ConfirmDialog from "./ConfirmDialog";
import { useTranslation } from "react-i18next";

interface DeleteAccountProps {
  onBack: () => void;
}

function DeleteAccount({ onBack }: DeleteAccountProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const authStore = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const { salt, kdfIterations } = await getSalt(authStore.username);
      const { authKey } = await deriveKeys(password, salt, kdfIterations);
      // The server verifies the password itself and rejects the request if it is wrong
      await deleteAccount({ authKey });
      authStore.clearAuth(true);
      navigate("/login");
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
        <h1>{t("deleteAccount.title")}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsConfirmOpen(true);
          }}
        >
          <div className="settings-warning">
            <b>{t("deleteAccount.warning")}</b>
          </div>
          <div className="auth-field">
            <label htmlFor="password">
              {t("deleteAccount.confirmWithPassword")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
            ></input>
          </div>
          <button
            id="deleteButton"
            type="submit"
            className="auth-submit danger"
            disabled={isSubmitting}
          >
            {t("deleteAccount.submit")}
          </button>
          {error && <span className="auth-error">{error}</span>}
        </form>
      </div>
      <ConfirmDialog
        open={isConfirmOpen}
        title={t("deleteAccount.dialogTitle")}
        confirmLabel={t("deleteAccount.dialogConfirm")}
        requireText={t("deleteAccount.confirmWord")}
        onConfirm={() => {
          setIsConfirmOpen(false);
          handleSubmit();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      >
        <p>{t("deleteAccount.dialogBody")}</p>
      </ConfirmDialog>
    </div>
  );
}

export default DeleteAccount;
