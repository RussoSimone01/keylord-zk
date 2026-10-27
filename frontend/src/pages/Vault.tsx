import { useEffect, useRef, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  decryptVault,
  encryptCredential,
  type EncryptedCredential,
} from "../crypto/vault.ts";
import {
  cleanCredential,
  credentialMatches,
  emptyCredential,
  normalizeCredential,
  sameCredential,
  type PlainCredential,
} from "../crypto/credential";
import { create, deleteCredential, getAll, update } from "../api/vault";
import { useAuthStore } from "../store/authStore";
import { getErrorMessage } from "../api/errors";
import "./Vault.css";
import "../components/VaultItem.css";
import Spinner from "../components/Spinner.tsx";
import SearchField from "../components/SearchField";
import VaultItem from "../components/VaultItem";
import ConfirmDialog from "../components/ConfirmDialog";
import CredentialPanel, {
  type CredentialDraft,
} from "../components/CredentialPanel";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

const EMPTY_DRAFT: CredentialDraft = emptyCredential("login");
// Wide enough for the 480px panel beside a list that still shows the full password mask
const DOCKED_QUERY = "(min-width: 1200px)";
const FLASH_MS = 1600;

function Vault() {
  const { t, i18n } = useTranslation();
  usePageTitle("vault.title");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const docked = useMediaQuery(DOCKED_QUERY);
  const [credentials, setCredentials] = useState<PlainCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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
  const [draft, setDraft] = useState<CredentialDraft>(EMPTY_DRAFT);
  const [initialDraft, setInitialDraft] =
    useState<CredentialDraft>(EMPTY_DRAFT);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [panelError, setPanelError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(
    null,
  );
  const [flashId, setFlashId] = useState<number | null>(null);
  const pushedRef = useRef(false);
  const closingRef = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const prevKeyRef = useRef<string | null>(null);

  const editParam = searchParams.get("edit");
  const panelKey = searchParams.get("new")
    ? "new"
    : editParam
      ? `edit:${editParam}`
      : null;
  const editingId = editParam ? Number(editParam) : null;
  const editingCredential =
    editingId != null
      ? credentials.find((credential) => credential.id === editingId)
      : undefined;
  const isDirty = draftKey != null && !sameCredential(draft, initialDraft);

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

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const prevKey = prevKeyRef.current;
    prevKeyRef.current = panelKey;
    syncPanelWithUrl(prevKey);
    // The URL and loading state trigger synchronization; the remaining values are read then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelKey, isLoading]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (flashId == null) {
      return;
    }
    document
      .querySelector(`[data-credential-id="${flashId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const timer = window.setTimeout(() => setFlashId(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  function syncPanelWithUrl(prevKey: string | null) {
    if (panelKey == null) {
      if (prevKey != null && isDirty && !closingRef.current) {
        const params: Record<string, string> =
          prevKey === "new" ? { new: "1" } : { edit: prevKey.slice(5) };
        pushedRef.current = true;
        setSearchParams(params);
        setPendingDiscard(() => () => closePanel(true));
        return;
      }
      closingRef.current = false;
      if (draftKey != null) {
        setDraftKey(null);
        setPanelError("");
        const target = openerRef.current?.isConnected
          ? openerRef.current
          : newButtonRef.current;
        target?.focus();
      }
      return;
    }

    if (panelKey === draftKey) {
      return;
    }
    if (panelKey === "new") {
      startDraft(EMPTY_DRAFT, panelKey);
    } else if (editingCredential) {
      startDraft(normalizeCredential(editingCredential), panelKey);
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  function startDraft(values: CredentialDraft, key: string) {
    setDraft(values);
    setInitialDraft(values);
    setPanelError("");
    setDraftKey(key);
  }

  function guard(action: () => void) {
    if (isDirty) {
      setPendingDiscard(() => action);
    } else {
      action();
    }
  }

  function openPanel(params: Record<string, string>) {
    if (panelKey == null) {
      openerRef.current = document.activeElement as HTMLElement | null;
      pushedRef.current = true;
      setSearchParams(params);
    } else {
      setSearchParams(params, { replace: true });
    }
  }

  function openNew() {
    guard(() => openPanel({ new: "1" }));
  }

  function openEdit(credential: PlainCredential) {
    if (credential.id == null || panelKey === `edit:${credential.id}`) {
      return;
    }
    guard(() => openPanel({ edit: String(credential.id) }));
  }

  function closePanel(force = false) {
    const close = () => {
      closingRef.current = true;
      if (pushedRef.current) {
        pushedRef.current = false;
        navigate(-1);
      } else {
        setSearchParams({}, { replace: true });
      }
    };
    if (force) {
      close();
    } else {
      guard(close);
    }
  }

  async function handleSave() {
    if (encryptionKey === null) {
      setPanelError(t("vault.sessionExpired"));
      return;
    }
    setIsSaving(true);
    setPanelError("");
    try {
      const data = cleanCredential(draft);
      const { encryptedData } = await encryptCredential(data, encryptionKey);
      let savedId: number | undefined;
      if (panelKey === "new") {
        const { id: newId } = await create({ encryptedData });
        savedId = newId;
        setCredentials([...credentials, { ...data, id: newId }]);
      } else if (editingId != null) {
        await update(editingId, { encryptedData });
        savedId = editingId;
        setCredentials(
          credentials.map((credential) =>
            credential.id === editingId
              ? { ...data, id: editingId }
              : credential,
          ),
        );
      }
      setDraft(data);
      setInitialDraft(data);
      setFlashId(savedId ?? null);
      closePanel(true);
    } catch (err) {
      setPanelError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
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
      if (editingId === credential.id) {
        closePanel(true);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      if (editingId === credential.id) {
        setPanelError(message);
      } else {
        setError(message);
      }
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

  if (isLoading) {
    return <Spinner />;
  }

  const query = searchQuery.trim().toLowerCase();
  const filteredCredentials = credentials
    .filter((c) => credentialMatches(c, query))
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));

  const panelOpen = panelKey != null && panelKey === draftKey;

  return (
    <div
      className={
        panelOpen && docked ? "vault-container with-panel" : "vault-container"
      }
    >
      <div className="vault-main" inert={panelOpen && !docked}>
        <div className="vault-header">
          <h1>{t("vault.title")}</h1>
          <button
            ref={newButtonRef}
            className="primary"
            type="button"
            onClick={openNew}
            disabled={panelKey === "new"}
          >
            <Plus size={16} /> {t("vault.newCredential")}
          </button>
        </div>

        {error && <span className="auth-error">{error}</span>}

        {unreadable.length > 0 && (
          <div className="vault-unreadable" role="alert">
            <p>{t("vault.unreadable", { count: unreadable.length })}</p>
            <ul>
              {unreadable.map((credential) => (
                <li key={credential.id}>
                  <span className="mono">
                    {t("vault.unreadableItem", { id: credential.id })}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      setPendingUnreadableDelete(credential.id ?? null)
                    }
                    title={t("common.delete")}
                    aria-label={t("vault.deleteUnreadable", {
                      id: credential.id,
                    })}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {credentials.length === 0 ? (
          unreadable.length === 0 && (
            <div className="vault-empty">
              <div className="vault-empty-glyph" aria-hidden="true">
                <KeyRound size={22} />
              </div>
              <div className="vault-empty-title">{t("vault.emptyTitle")}</div>
              <p>{t("vault.emptyBody")}</p>
              {panelKey !== "new" && (
                <button className="primary" type="button" onClick={openNew}>
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
                    selected={panelOpen && credential.id === editingId}
                    flash={credential.id === flashId}
                    onEdit={() => openEdit(credential)}
                    onDelete={() => handleDelete(credential)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {panelOpen && (
        <CredentialPanel
          key={panelKey}
          mode={panelKey === "new" ? "new" : "edit"}
          draft={draft}
          onChange={setDraft}
          docked={docked}
          busy={isSaving}
          error={panelError}
          onSave={handleSave}
          onClose={() => closePanel()}
          onDelete={
            editingCredential
              ? () => handleDelete(editingCredential)
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={pendingDiscard != null}
        title={t("vault.discardTitle")}
        confirmLabel={t("vault.discard")}
        cancelLabel={t("vault.keepEditing")}
        onConfirm={() => {
          const action = pendingDiscard;
          setPendingDiscard(null);
          setInitialDraft(draft);
          action?.();
        }}
        onCancel={() => setPendingDiscard(null)}
      >
        <p>{t("vault.discardBody")}</p>
      </ConfirmDialog>

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
        title={t("vault.deleteTitle", { name: pendingDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          {pendingDelete?.type === "login" && pendingDelete.username !== "" ? (
            <Trans
              i18nKey="vault.deleteBody"
              values={{ username: pendingDelete.username }}
              components={{ mono: <span className="mono" /> }}
            />
          ) : (
            t("vault.deleteBodyItem")
          )}
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default Vault;
