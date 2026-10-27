import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dices,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { estimateStrength, generatePassword } from "../crypto/password";
import {
  changeCredentialType,
  CREDENTIAL_TYPES,
  type CredentialData,
  type CredentialType,
  type CustomField,
  type LoginData,
} from "../crypto/credential";
import StrengthMeter from "./StrengthMeter";
import "./CredentialPanel.css";

export type CredentialDraft = CredentialData;

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

const TYPE_LABELS: Record<CredentialType, string> = {
  login: "vault.typeLogin",
  note: "vault.typeNote",
};

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
  // Indexes of hidden custom fields whose value is currently shown
  const [revealedFields, setRevealedFields] = useState<Set<number>>(
    () => new Set(),
  );
  const titleId = useId();
  const errorId = useId();
  const fieldIdPrefix = useId();

  useEffect(() => {
    if (docked) {
      return;
    }
    const navbar = document.querySelector<HTMLElement>(".navbar");
    navbar?.setAttribute("inert", "");
    return () => navbar?.removeAttribute("inert");
  }, [docked]);

  function setLogin(
    changes: Partial<Pick<LoginData, "urls" | "username" | "password">>,
  ) {
    if (draft.type === "login") {
      onChange({ ...draft, ...changes });
    }
  }

  function handleGenerate() {
    setLogin({ password: generatePassword(20) });
    setShowPassword(true);
  }

  // At least one address input is always shown, even when the list is empty
  const urls =
    draft.type === "login" && draft.urls.length > 0 ? draft.urls : [""];

  function setUrl(index: number, value: string) {
    setLogin({ urls: urls.map((u, i) => (i === index ? value : u)) });
  }

  function removeUrl(index: number) {
    setLogin({ urls: urls.filter((_, i) => i !== index) });
  }

  function setField(index: number, changes: Partial<CustomField>) {
    onChange({
      ...draft,
      fields: draft.fields.map((f, i) =>
        i === index ? { ...f, ...changes } : f,
      ),
    });
  }

  function addField() {
    onChange({
      ...draft,
      fields: [...draft.fields, { name: "", value: "", hidden: false }],
    });
  }

  function removeField(index: number) {
    onChange({ ...draft, fields: draft.fields.filter((_, i) => i !== index) });
    // Reveal state follows the fields that shift up after the removed one
    setRevealedFields(
      new Set(
        [...revealedFields]
          .filter((i) => i !== index)
          .map((i) => (i > index ? i - 1 : i)),
      ),
    );
  }

  function toggleRevealed(index: number) {
    const next = new Set(revealedFields);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setRevealedFields(next);
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
            {/* The type is chosen once, when the entry is created */}
            {mode === "new" && (
              <div
                className="credential-type-switch"
                role="radiogroup"
                aria-label={t("vault.type")}
              >
                {CREDENTIAL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={draft.type === type}
                    className={
                      draft.type === type
                        ? "credential-type-option active"
                        : "credential-type-option"
                    }
                    onClick={() => onChange(changeCredentialType(draft, type))}
                  >
                    {t(TYPE_LABELS[type])}
                  </button>
                ))}
              </div>
            )}

            <div className="vault-field">
              <label htmlFor="name">{t("vault.name")}</label>
              <input
                id="name"
                type="text"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                autoFocus={mode === "new"}
                required
              />
            </div>

            {draft.type === "login" && (
              <>
                <div className="vault-field">
                  <label htmlFor={`${fieldIdPrefix}url-0`}>
                    {t("vault.urls")}
                  </label>
                  {urls.map((url, index) => (
                    <div className="vault-row-field" key={index}>
                      <input
                        id={`${fieldIdPrefix}url-${index}`}
                        type="text"
                        inputMode="url"
                        value={url}
                        onChange={(e) => setUrl(index, e.target.value)}
                        placeholder="https://"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={
                          index > 0
                            ? t("vault.urlLabel", { index: index + 1 })
                            : undefined
                        }
                      />
                      {(urls.length > 1 || url !== "") && (
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => removeUrl(index)}
                          title={t("vault.removeUrl", { index: index + 1 })}
                          aria-label={t("vault.removeUrl", {
                            index: index + 1,
                          })}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {urls[urls.length - 1] !== "" && (
                    <button
                      type="button"
                      className="vault-add-button"
                      onClick={() => setLogin({ urls: [...urls, ""] })}
                    >
                      <Plus size={16} /> {t("vault.addUrl")}
                    </button>
                  )}
                </div>
                <div className="vault-field">
                  <label htmlFor="username">{t("common.username")}</label>
                  <input
                    id="username"
                    type="text"
                    value={draft.username}
                    onChange={(e) => setLogin({ username: e.target.value })}
                    autoComplete="off"
                  />
                </div>
                <div className="vault-field">
                  <label htmlFor="password">{t("common.password")}</label>
                  <div className="vault-password-field">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={draft.password}
                      onChange={(e) => setLogin({ password: e.target.value })}
                      autoComplete="new-password"
                      spellCheck={false}
                      autoFocus={mode === "edit"}
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
              </>
            )}

            <div className="vault-field">
              <label htmlFor="notes">{t("vault.notes")}</label>
              <textarea
                id="notes"
                value={draft.notes}
                onChange={(e) => onChange({ ...draft, notes: e.target.value })}
                rows={draft.type === "note" ? 10 : 4}
                spellCheck={false}
                autoFocus={mode === "edit" && draft.type === "note"}
              />
            </div>

            <fieldset className="vault-field vault-custom-fields">
              <legend>{t("vault.customFields")}</legend>
              {draft.fields.map((field, index) => {
                const masked = field.hidden && !revealedFields.has(index);
                return (
                  <div className="vault-custom-field" key={index}>
                    <div className="vault-row-field">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          setField(index, { name: e.target.value })
                        }
                        placeholder={t("vault.fieldName")}
                        aria-label={t("vault.fieldNameLabel", {
                          index: index + 1,
                        })}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeField(index)}
                        title={t("vault.removeField", { index: index + 1 })}
                        aria-label={t("vault.removeField", {
                          index: index + 1,
                        })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="vault-row-field">
                      <input
                        className="mono"
                        type={masked ? "password" : "text"}
                        value={field.value}
                        onChange={(e) =>
                          setField(index, { value: e.target.value })
                        }
                        placeholder={t("vault.fieldValue")}
                        aria-label={t("vault.fieldValueLabel", {
                          index: index + 1,
                        })}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-pressed={field.hidden}
                        onClick={() =>
                          setField(index, { hidden: !field.hidden })
                        }
                        title={t("vault.hiddenField")}
                        aria-label={t("vault.hiddenField")}
                      >
                        {field.hidden ? (
                          <Lock size={16} />
                        ) : (
                          <LockOpen size={16} />
                        )}
                      </button>
                      {field.hidden && (
                        <button
                          type="button"
                          className="icon-button"
                          aria-pressed={!masked}
                          onClick={() => toggleRevealed(index)}
                          title={masked ? t("common.show") : t("common.hide")}
                          aria-label={
                            masked ? t("vault.showValue") : t("vault.hideValue")
                          }
                        >
                          {masked ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="vault-add-button"
                onClick={addField}
              >
                <Plus size={16} /> {t("vault.addField")}
              </button>
            </fieldset>
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
