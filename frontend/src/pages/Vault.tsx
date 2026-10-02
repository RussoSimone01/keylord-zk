import { useEffect, useState } from "react";
import {
  decryptVault,
  encryptCredential,
  type EncryptedCredential,
  type PlainCredential,
} from "../crypto/vault.ts";
import { estimateStrength, generatePassword } from "../crypto/password";
import { create, deleteCredential, getAll, update } from "../api/vault";
import { useAuthStore } from "../store/authStore";
import { getErrorMessage } from "../api/errors";
import "./Vault.css";
import "../components/VaultItem.css";
import Spinner from "../components/Spinner.tsx";
import SearchField from "../components/SearchField";
import StrengthMeter from "../components/StrengthMeter";
import VaultItem from "../components/VaultItem";
import ConfirmDialog from "../components/ConfirmDialog";
import { Dices, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

function Vault() {
  const { t, i18n } = useTranslation();
  const [credentials, setCredentials] = useState<PlainCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [id, setId] = useState<number | null>(null);
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const encryptionKey = useAuthStore((state) => state.encryptionKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PlainCredential | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  // Credentials that cannot be decrypted: listed separately so the rest of the vault stays usable
  const [unreadable, setUnreadable] = useState<EncryptedCredential[]>([]);
  const [pendingUnreadableDelete, setPendingUnreadableDelete] = useState<
    number | null
  >(null);

  useEffect(() => {
    async function loadCredentials() {
      try {
        setIsLoading(true);
        const encryptedCredentials = await getAll();
        if (encryptionKey === null) {
          return;
        }
        const vault = await decryptVault(encryptedCredentials, encryptionKey);
        setCredentials(vault.credentials);
        setUnreadable(vault.unreadable);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadCredentials();
  }, [encryptionKey]);

  async function handleSubmit() {
    try {
      if (encryptionKey === null) {
        setError(t("vault.sessionExpired"));
        return;
      }
      const { encryptedData } = await encryptCredential(
        { site, username, password },
        encryptionKey,
      );
      if (id == null) {
        const { id: newId } = await create({ encryptedData });
        setCredentials([
          ...credentials,
          { id: newId, site, username, password },
        ]);
      } else {
        await update(id, { encryptedData });
        setCredentials(
          credentials.map((c) =>
            c.id === id ? { ...c, site, username, password } : c,
          ),
        );
      }
      closeForm();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function openNewForm() {
    closeForm();
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setId(null);
    setSite("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setError("");
  }

  function handleEdit(credential: PlainCredential) {
    setId(credential.id ?? null);
    setSite(credential.site);
    setUsername(credential.username);
    setPassword(credential.password);
    setShowPassword(false);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Opens the confirmation dialog; the API call happens in confirmDelete.
  function handleDelete(credential: PlainCredential) {
    setPendingDelete(credential);
  }

  async function confirmDelete() {
    const credential = pendingDelete;
    if (credential?.id == null) {
      setPendingDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCredential(credential.id);
      setCredentials(credentials.filter((c) => c.id !== credential.id));
      if (id === credential.id) {
        closeForm();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  }

  async function confirmUnreadableDelete() {
    const credentialId = pendingUnreadableDelete;
    if (credentialId == null) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCredential(credentialId);
      setUnreadable(unreadable.filter((c) => c.id !== credentialId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
      setPendingUnreadableDelete(null);
    }
  }

  // Fills the password field with a 20-character random password and shows it.
  function handleGenerate() {
    setPassword(generatePassword(20));
    setShowPassword(true);
  }

  if (isLoading) {
    return <Spinner />;
  }

  const query = searchQuery.trim().toLowerCase();
  const filteredCredentials = credentials
    .filter(
      (c) =>
        c.site.toLowerCase().includes(query) ||
        c.username.toLowerCase().includes(query),
    )
    .sort((a, b) => a.site.localeCompare(b.site, i18n.language));

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h1>{t("vault.title")}</h1>
        {!isFormOpen && (
          <button className="primary" type="button" onClick={openNewForm}>
            <Plus size={16} /> {t("vault.newCredential")}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="vault-form-card">
          <h2>
            {id == null ? t("vault.newCredential") : t("vault.editCredential")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            onReset={(e) => {
              e.preventDefault();
              closeForm();
            }}
          >
            <div className="vault-form-row">
              <div className="vault-field">
                <label htmlFor="site">{t("vault.site")}</label>
                <input
                  id="site"
                  type="text"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="github.com"
                  autoFocus
                  required
                />
              </div>
              <div className="vault-field">
                <label htmlFor="username">{t("common.username")}</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    spellCheck={false}
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
                {password !== "" && (
                  <StrengthMeter score={estimateStrength(password)} />
                )}
              </div>
            </div>
            <div className="vault-form-actions">
              <button className="primary" type="submit">
                {t("common.save")}
              </button>
              <button type="reset">{t("common.cancel")}</button>
            </div>
            {error && <span className="auth-error">{error}</span>}
          </form>
        </div>
      )}

      {!isFormOpen && error && <span className="auth-error">{error}</span>}

      {unreadable.length > 0 && (
        <div className="vault-unreadable" role="alert">
          <p>{t("vault.unreadable", { count: unreadable.length })}</p>
          <ul>
            {unreadable.map((c) => (
              <li key={c.id}>
                <span className="mono">
                  {t("vault.unreadableItem", { id: c.id })}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setPendingUnreadableDelete(c.id ?? null)}
                  title={t("common.delete")}
                  aria-label={t("vault.deleteUnreadable", { id: c.id })}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {credentials.length === 0 ? (
        // With only unreadable credentials there is nothing to list, and the vault is not empty either
        unreadable.length === 0 && (
          <div className="vault-empty">
            <div className="vault-empty-glyph" aria-hidden="true">
              <KeyRound size={22} />
            </div>
            <div className="vault-empty-title">{t("vault.emptyTitle")}</div>
            <p>{t("vault.emptyBody")}</p>
            {!isFormOpen && (
              <button className="primary" type="button" onClick={openNewForm}>
                <Plus size={16} /> {t("vault.addFirst")}
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("vault.searchPlaceholder")}
            count={filteredCredentials.length}
          />
          {filteredCredentials.length === 0 ? (
            <div className="vault-empty">
              <div className="vault-empty-title">
                {t("vault.noMatches", { query: searchQuery.trim() })}
              </div>
              <button type="button" onClick={() => setSearchQuery("")}>
                {t("vault.clearSearch")}
              </button>
            </div>
          ) : (
            <ul className="vault-list">
              <li className="vault-list-head" aria-hidden="true">
                <span>
                  {t("vault.count", { count: filteredCredentials.length })}
                </span>
                <span>{t("vault.sortedAZ")}</span>
              </li>
              {filteredCredentials.map((credential) => (
                <VaultItem
                  key={credential.id}
                  credential={credential}
                  selected={credential.id === id}
                  onEdit={() => handleEdit(credential)}
                  onDelete={() => handleDelete(credential)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingUnreadableDelete != null}
        title={t("vault.deleteUnreadableTitle", {
          id: pendingUnreadableDelete ?? "",
        })}
        confirmLabel={t("common.delete")}
        busy={isDeleting}
        onConfirm={confirmUnreadableDelete}
        onCancel={() => setPendingUnreadableDelete(null)}
      >
        <p>{t("vault.deleteUnreadableBody")}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingDelete != null}
        title={t("vault.deleteTitle", { site: pendingDelete?.site ?? "" })}
        confirmLabel={t("common.delete")}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          <Trans
            i18nKey="vault.deleteBody"
            values={{ username: pendingDelete?.username ?? "" }}
            components={{ mono: <span className="mono" /> }}
          />
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default Vault;
