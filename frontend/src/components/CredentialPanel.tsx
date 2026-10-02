import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dices, Eye, EyeOff, Trash2, X } from "lucide-react";
import { estimateStrength, generatePassword } from "../crypto/password";
import StrengthMeter from "./StrengthMeter";
import "./CredentialPanel.css";

export interface CredentialDraft {
  site: string;
  username: string;
  password: string;
}

interface CredentialPanelProps {
  mode: "new" | "edit";
  draft: CredentialDraft;
  onChange: (draft: CredentialDraft) => void;
  docked: boolean;
  busy: boolean;
  error: string;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

function CredentialPanel({
  mode,
  draft,
  onChange,
  docked,
  busy,
  error,
  onSave,
  onClose,
  onDelete,
}: CredentialPanelProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    if (docked) {
      return;
    }
    const navbar = document.querySelector<HTMLElement>(".navbar");
    navbar?.setAttribute("inert", "");
    return () => navbar?.removeAttribute("inert");
  }, [docked]);

  function set(field: keyof CredentialDraft, value: string) {
    onChange({ ...draft, [field]: value });
  }

  function handleGenerate() {
    set("password", generatePassword(20));
    setShowPassword(true);
  }

  return (
    <>
      {!docked && (
        <div
          className="credential-panel-backdrop"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        className={
          docked ? "credential-panel docked" : "credential-panel overlay"
        }
        role={docked ? "region" : "dialog"}
        aria-modal={docked ? undefined : true}
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <form
          className="credential-panel-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="credential-panel-head">
            <h2 id={titleId}>
              {mode === "new"
                ? t("vault.newCredential")
                : t("vault.editCredential")}
            </h2>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              title={t("vault.closePanel")}
              aria-label={t("vault.closePanel")}
            >
              <X size={18} />
            </button>
          </div>

          <div className="credential-panel-body">
            <div className="vault-field">
              <label htmlFor="site">{t("vault.site")}</label>
              <input
                id="site"
                type="text"
                value={draft.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="github.com"
                autoFocus={mode === "new"}
                required
              />
            </div>
            <div className="vault-field">
              <label htmlFor="username">{t("common.username")}</label>
              <input
                id="username"
                type="text"
                value={draft.username}
                onChange={(e) => set("username", e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="vault-field">
              <label htmlFor="password">{t("common.password")}</label>
              <div className="vault-password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={draft.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  spellCheck={false}
                  autoFocus={mode === "edit"}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={handleGenerate}
                  title={t("vault.generatePassword")}
                  aria-label={t("vault.generatePassword")}
                >
                  <Dices size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? t("common.hide") : t("common.show")}
                  aria-label={
                    showPassword
                      ? t("vault.hidePassword")
                      : t("vault.showPassword")
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {draft.password !== "" && (
                <StrengthMeter score={estimateStrength(draft.password)} />
              )}
            </div>
          </div>

          <div className="credential-panel-foot">
            {error && (
              <span id={errorId} className="auth-error" role="alert">
                {error}
              </span>
            )}
            <div className="credential-panel-actions">
              {onDelete && (
                <button
                  type="button"
                  className="credential-panel-delete"
                  onClick={onDelete}
                  disabled={busy}
                >
                  <Trash2 size={16} /> {t("common.delete")}
                </button>
              )}
              <button type="button" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </button>
              <button
                className="primary"
                type="submit"
                disabled={busy}
                aria-describedby={error ? errorId : undefined}
              >
                {busy ? t("common.working") : t("common.save")}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

export default CredentialPanel;
