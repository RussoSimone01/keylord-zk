import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getSalt, verifyPassword } from "../api/auth";
import { getAll } from "../api/vault";
import { getErrorMessage } from "../api/errors";
import { decryptVault, deriveKeys } from "../crypto/vault";
import { normalizeCredential } from "../crypto/credential";
import {
  buildCsvExport,
  buildEncryptedJsonExport,
  buildPlainJsonExport,
  EXPORT_PASSWORD_MIN_LENGTH,
  exportFileName,
  type ExportKind,
} from "../crypto/export";
import { estimateStrength } from "../crypto/password";
import { downloadText } from "../lib/download";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import StrengthMeter from "./StrengthMeter";
import Spinner from "./Spinner";
import "../styles/auth.css";
import "../pages/Settings.css";

interface ExportVaultProps {
  onBack: () => void;
}

const KINDS: ExportKind[] = ["encrypted", "json", "csv"];

const KIND_LABELS: Record<ExportKind, { label: string; hint: string }> = {
  encrypted: {
    label: "exportVault.formatEncrypted",
    hint: "exportVault.formatEncryptedHint",
  },
  json: { label: "exportVault.formatJson", hint: "exportVault.formatJsonHint" },
  csv: { label: "exportVault.formatCsv", hint: "exportVault.formatCsvHint" },
};

const TOAST_MS = 6000;

function ExportVault({ onBack }: ExportVaultProps) {
  const { t } = useTranslation();
  const username = useAuthStore((state) => state.username);
  const [kind, setKind] = useState<ExportKind>("encrypted");
  const [filePassword, setFilePassword] = useState("");
  const [confirmFilePassword, setConfirmFilePassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): string {
    if (kind !== "encrypted") {
      return "";
    }
    if (filePassword.length < EXPORT_PASSWORD_MIN_LENGTH) {
      return t("exportVault.passwordTooShort", {
        min: EXPORT_PASSWORD_MIN_LENGTH,
      });
    }
    if (filePassword !== confirmFilePassword) {
      return t("validation.passwordMismatch");
    }
    return "";
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError !== "") {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      // The master password is checked by the server, so failed attempts count towards the lockout
      const { salt, kdfIterations } = await getSalt(username);
      const { authKey } = await deriveKeys(masterPassword, salt, kdfIterations);
      if (!(await verifyPassword({ authKey }))) {
        setError(t("validation.masterPasswordIncorrect"));
        return;
      }

      const encryptionKey = useAuthStore.getState().encryptionKey;
      if (encryptionKey === null) {
        setError(t("vault.sessionExpired"));
        return;
      }
      const vault = await decryptVault(await getAll(), encryptionKey);
      if (vault.credentials.length === 0) {
        setError(t("exportVault.empty"));
        return;
      }
      const items = vault.credentials.map((c) => normalizeCredential(c));

      const text =
        kind === "encrypted"
          ? await buildEncryptedJsonExport(items, filePassword)
          : kind === "json"
            ? buildPlainJsonExport(items)
            : buildCsvExport(items);

      // A vault locked while the file was being prepared is not exported
      if (useAuthStore.getState().encryptionKey !== encryptionKey) {
        setError(t("vault.sessionExpired"));
        return;
      }
      downloadText(
        text,
        exportFileName(kind),
        kind === "csv" ? "text/csv;charset=utf-8" : "application/json",
      );

      const done = t("exportVault.done", { count: items.length });
      const skipped = vault.unreadable.length;
      useToastStore.getState().show({
        tone: skipped > 0 ? "warning" : "success",
        message:
          skipped > 0
            ? `${done}. ${t("exportVault.skipped", { count: skipped })}.`
            : done,
        duration: TOAST_MS,
      });
      setFilePassword("");
      setConfirmFilePassword("");
      setMasterPassword("");
      setAcknowledged(false);
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
        <h1>{t("exportVault.title")}</h1>
        <p className="settings-hint">{t("exportVault.intro")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <fieldset className="export-formats">
            <legend>{t("exportVault.format")}</legend>
            {KINDS.map((option) => (
              <label
                key={option}
                className={
                  option === kind ? "export-format active" : "export-format"
                }
              >
                <input
                  type="radio"
                  name="exportKind"
                  value={option}
                  checked={option === kind}
                  onChange={() => {
                    setKind(option);
                    setError("");
                  }}
                />
                <span>
                  <span className="export-format-label">
                    {t(KIND_LABELS[option].label)}
                  </span>
                  <span className="export-format-hint">
                    {t(KIND_LABELS[option].hint)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {kind === "encrypted" ? (
            <>
              <div className="auth-field">
                <label htmlFor="filePassword">
                  {t("exportVault.filePassword")}
                </label>
                <input
                  id="filePassword"
                  type="password"
                  value={filePassword}
                  onChange={(e) => setFilePassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {filePassword !== "" && (
                  <StrengthMeter score={estimateStrength(filePassword)} />
                )}
              </div>
              <div className="auth-field">
                <label htmlFor="confirmFilePassword">
                  {t("exportVault.confirmFilePassword")}
                </label>
                <input
                  id="confirmFilePassword"
                  type="password"
                  value={confirmFilePassword}
                  onChange={(e) => setConfirmFilePassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <p className="settings-hint">
                {t("exportVault.filePasswordHint")}
              </p>
            </>
          ) : (
            <>
              <div className="settings-warning" role="note">
                <p>{t("exportVault.plainWarning")}</p>
                {kind === "csv" && <p>{t("exportVault.csvWarning")}</p>}
              </div>
              <div className="auth-field">
                <label className="auth-check" htmlFor="acknowledgePlain">
                  <input
                    id="acknowledgePlain"
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    required
                  />
                  {t("exportVault.acknowledgePlain")}
                </label>
              </div>
            </>
          )}

          <div className="auth-field">
            <label htmlFor="masterPassword">
              {t("exportVault.masterPassword")}
            </label>
            <input
              id="masterPassword"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="auth-submit">
            {t("exportVault.submit")}
          </button>
          {error && (
            <span className="auth-error" role="alert">
              {error}
            </span>
          )}
        </form>
      </div>
    </div>
  );
}

export default ExportVault;
