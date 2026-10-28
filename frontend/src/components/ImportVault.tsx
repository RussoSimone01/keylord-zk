import { useState, type ChangeEvent } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { getAll, importCredentials } from "../api/vault";
import {
  getErrorMessage,
  UserFacingError,
  VAULT_MAX_CREDENTIALS,
  type ApiProblem,
} from "../api/errors";
import { decryptVault } from "../crypto/vault";
import {
  countImport,
  encryptImport,
  IMPORT_MAX_FILE_BYTES,
  openEncryptedImport,
  planImport,
  readImportFile,
  type ConflictAction,
  type ImportCandidate,
  type ImportSource,
  type ParsedImport,
} from "../crypto/import";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import Spinner from "./Spinner";
import "../styles/auth.css";
import "../pages/Settings.css";

interface ImportVaultProps {
  onBack: () => void;
}

interface Preview {
  fileName: string;
  result: ParsedImport;
  candidates: ImportCandidate[];
  // Encrypted data of the vault credentials by id, for the digests of the overwrites
  storedData: Map<number, string>;
  // Every credential on the server, unreadable ones included: all count towards the limit
  vaultCount: number;
}

type Step =
  | { name: "select" }
  | { name: "password"; fileName: string; text: string }
  | { name: "preview"; preview: Preview };

const ACTIONS: ConflictAction[] = ["skip", "add", "replace"];

const TOAST_MS = 6000;

function ImportVault({ onBack }: ImportVaultProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ name: "select" });
  // Choice for each candidate, indexed like preview.candidates; only conflicts use it
  const [actions, setActions] = useState<ConflictAction[]>([]);
  const [filePassword, setFilePassword] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const importOptions = { untitledName: t("importVault.untitled") };

  /** Compares the parsed file with the vault as it is now on the server */
  async function showPreview(fileName: string, result: ParsedImport) {
    const encryptionKey = useAuthStore.getState().encryptionKey;
    if (encryptionKey === null) {
      throw new UserFacingError("vault.sessionExpired");
    }
    const encrypted = await getAll();
    const vault = await decryptVault(encrypted, encryptionKey);
    const candidates = planImport(result.items, vault.credentials);
    setActions(candidates.map(() => "skip"));
    setStep({
      name: "preview",
      preview: {
        fileName,
        result,
        candidates,
        storedData: new Map(encrypted.map((c) => [c.id, c.encryptedData])),
        vaultCount: encrypted.length,
      },
    });
  }

  function restart() {
    setStep({ name: "select" });
    setActions([]);
    setFilePassword("");
    setError("");
  }

  async function run(task: () => Promise<void>) {
    setIsWorking(true);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsWorking(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared so that choosing the same file again fires the event
    e.target.value = "";
    if (file === undefined) {
      return;
    }
    run(async () => {
      if (file.size > IMPORT_MAX_FILE_BYTES) {
        throw new UserFacingError("importVault.fileTooLarge");
      }
      const parsed = readImportFile(await file.text(), importOptions);
      if (parsed.kind === "encrypted") {
        setStep({ name: "password", fileName: file.name, text: parsed.text });
      } else {
        await showPreview(file.name, parsed.result);
      }
    });
  }

  function handlePassword(fileName: string, text: string) {
    run(async () => {
      const result = await openEncryptedImport(
        text,
        filePassword,
        importOptions,
      );
      setFilePassword("");
      await showPreview(fileName, result);
    });
  }

  function handleImport(preview: Preview) {
    run(async () => {
      const encryptionKey = useAuthStore.getState().encryptionKey;
      if (encryptionKey === null) {
        throw new UserFacingError("vault.sessionExpired");
      }
      const counts = countImport(preview.candidates, actions);
      const request = await encryptImport(
        preview.candidates,
        actions,
        preview.storedData,
        encryptionKey,
      );
      try {
        await importCredentials(request);
      } catch (err) {
        // The vault changed after the preview: compare again, the user reviews the new preview
        if (
          axios.isAxiosError<ApiProblem>(err) &&
          err.response?.data?.code === "vault.import_out_of_sync"
        ) {
          await showPreview(preview.fileName, preview.result);
        }
        throw err;
      }
      useToastStore.getState().show({
        tone: "success",
        message: [
          ...(counts.added > 0
            ? [t("importVault.doneAdded", { count: counts.added })]
            : []),
          ...(counts.replaced > 0
            ? [t("importVault.doneReplaced", { count: counts.replaced })]
            : []),
        ].join(". "),
        duration: TOAST_MS,
      });
      onBack();
    });
  }

  if (isWorking) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="auth-card">
        <button
          className="settings-back"
          type="button"
          onClick={step.name === "select" ? onBack : restart}
        >
          {t("common.back")}
        </button>
        <h1>{t("importVault.title")}</h1>

        {step.name === "select" && (
          <>
            <p className="settings-hint">{t("importVault.intro")}</p>
            <p className="settings-hint">{t("importVault.formats")}</p>
            <div className="auth-field">
              <label htmlFor="importFile">{t("importVault.file")}</label>
              <input
                id="importFile"
                className="import-file"
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFile}
              />
            </div>
          </>
        )}

        {step.name === "password" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePassword(step.fileName, step.text);
            }}
          >
            <p className="settings-hint">
              {t("importVault.encryptedFile", { fileName: step.fileName })}
            </p>
            <div className="auth-field">
              <label htmlFor="importFilePassword">
                {t("importVault.filePassword")}
              </label>
              <input
                id="importFilePassword"
                type="password"
                value={filePassword}
                onChange={(e) => setFilePassword(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <button type="submit" className="auth-submit">
              {t("importVault.openFile")}
            </button>
          </form>
        )}

        {step.name === "preview" && (
          <ImportPreview
            preview={step.preview}
            actions={actions}
            onActionsChange={setActions}
            onImport={() => handleImport(step.preview)}
          />
        )}

        {error && (
          <span className="auth-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

interface ImportPreviewProps {
  preview: Preview;
  actions: ConflictAction[];
  onActionsChange: (actions: ConflictAction[]) => void;
  onImport: () => void;
}

const SOURCES_WITHOUT_PLAIN_FILE: ImportSource[] = ["keylordEncrypted"];

function ImportPreview({
  preview,
  actions,
  onActionsChange,
  onImport,
}: ImportPreviewProps) {
  const { t } = useTranslation();
  const { candidates, result } = preview;
  const countOf = (status: ImportCandidate["status"]) =>
    candidates.filter((c) => c.status === status).length;
  const conflicts = candidates.flatMap((c, i) =>
    c.status === "conflict" ? [i] : [],
  );
  const counts = countImport(candidates, actions);
  const overLimit = preview.vaultCount + counts.added > VAULT_MAX_CREDENTIALS;
  const nothingToDo = counts.added + counts.replaced === 0;
  const conflictActions = new Set(conflicts.map((i) => actions[i]));
  const allValue =
    conflictActions.size === 1 ? [...conflictActions][0] : "mixed";

  function setAction(index: number, action: ConflictAction) {
    onActionsChange(actions.map((a, i) => (i === index ? action : a)));
  }

  function setAllActions(action: ConflictAction) {
    onActionsChange(
      actions.map((a, i) => (candidates[i].status === "conflict" ? action : a)),
    );
  }

  const summary = [
    { key: "importVault.summaryNew", count: countOf("new") },
    { key: "importVault.summaryIdentical", count: countOf("identical") },
    { key: "importVault.summaryConflict", count: conflicts.length },
    { key: "importVault.summaryTooLarge", count: countOf("tooLarge") },
    { key: "importVault.summarySkipped", count: result.skipped },
  ].filter((line) => line.count > 0);

  return (
    <>
      <p className="settings-hint">
        {t("importVault.fileSummary", {
          fileName: preview.fileName,
          source: t(`importVault.sources.${result.source}`),
        })}
      </p>
      {summary.length > 0 ? (
        <ul className="import-summary">
          {summary.map((line) => (
            <li key={line.key}>{t(line.key, { count: line.count })}</li>
          ))}
        </ul>
      ) : (
        <p className="settings-hint">{t("importVault.noEntries")}</p>
      )}

      {conflicts.length > 0 && (
        <fieldset className="import-conflicts">
          <legend>
            {t("importVault.conflictsTitle", { count: conflicts.length })}
          </legend>
          <p className="settings-hint">{t("importVault.conflictsHint")}</p>
          <div className="settings-field">
            <label className="settings-field-label" htmlFor="conflictAll">
              {t("importVault.applyToAll")}
            </label>
            <select
              id="conflictAll"
              className="settings-select"
              value={allValue}
              onChange={(e) => setAllActions(e.target.value as ConflictAction)}
            >
              {allValue === "mixed" && (
                <option value="mixed" disabled>
                  {t("importVault.mixed")}
                </option>
              )}
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {t(`importVault.actions.${action}`)}
                </option>
              ))}
            </select>
          </div>
          <ul className="import-conflict-list">
            {conflicts.map((index) => {
              const { item } = candidates[index];
              return (
                <li key={index}>
                  <span className="import-conflict-name">
                    <span>{item.name}</span>
                    {item.type === "login" && item.username !== "" && (
                      <span className="mono">{item.username}</span>
                    )}
                  </span>
                  <select
                    className="settings-select"
                    aria-label={t("importVault.actionFor", { name: item.name })}
                    value={actions[index]}
                    onChange={(e) =>
                      setAction(index, e.target.value as ConflictAction)
                    }
                  >
                    {ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {t(`importVault.actions.${action}`)}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {!SOURCES_WITHOUT_PLAIN_FILE.includes(result.source) && (
        <p className="auth-notice">{t("importVault.deletePlainFile")}</p>
      )}
      {overLimit && (
        <span className="auth-error" role="alert">
          {t("importVault.overLimit", {
            max: VAULT_MAX_CREDENTIALS,
            available: Math.max(0, VAULT_MAX_CREDENTIALS - preview.vaultCount),
          })}
        </span>
      )}
      <button
        type="button"
        className="auth-submit"
        disabled={nothingToDo || overLimit}
        onClick={onImport}
      >
        {nothingToDo
          ? t("importVault.nothingToImport")
          : t("importVault.submit", { count: counts.added + counts.replaced })}
      </button>
    </>
  );
}

export default ImportVault;
