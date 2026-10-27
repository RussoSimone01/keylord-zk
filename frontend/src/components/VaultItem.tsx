import { Pencil, StickyNote, Trash2 } from "lucide-react";
import type { PlainCredential } from "../crypto/credential";
import CopyButton from "./CopyButton";
import SecretText from "./SecretText";
import "./VaultItem.css";
import { useTranslation } from "react-i18next";

interface VaultItemProps {
  credential: PlainCredential;
  selected?: boolean;
  flash?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

// First letter of the name without scheme or "www."; no remote favicons, which would leak the site list.
function monogram(name: string) {
  const letter = name
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .charAt(0);
  return letter === "" ? "?" : letter.toUpperCase();
}

function VaultItem({
  credential,
  selected = false,
  flash = false,
  onEdit,
  onDelete,
}: VaultItemProps) {
  const { t } = useTranslation();
  const isLogin = credential.type === "login";
  return (
    <li
      className={["vault-item", selected && "selected", flash && "flash"]
        .filter(Boolean)
        .join(" ")}
      data-credential-id={credential.id}
    >
      <span className="vault-monogram" aria-hidden="true">
        {isLogin ? monogram(credential.name) : <StickyNote size={16} />}
      </span>
      <div className="vault-item-id">
        <div className="vault-item-site" title={credential.name}>
          {credential.name}
        </div>
        <div className="vault-item-user">
          {/* Second line: the username, else the first address, or the type for notes */}
          {isLogin && credential.username !== "" ? (
            <>
              <span className="mono" title={credential.username}>
                {credential.username}
              </span>
              <CopyButton
                value={credential.username}
                label={t("vaultItem.copyUsername")}
              />
            </>
          ) : isLogin ? (
            <span className="mono" title={credential.urls[0]}>
              {credential.urls[0]}
            </span>
          ) : (
            <span>{t("vaultItem.secureNote")}</span>
          )}
        </div>
      </div>
      {isLogin && credential.password !== "" ? (
        <SecretText value={credential.password} className="vault-item-secret" />
      ) : (
        <div className="vault-item-secret" aria-hidden="true" />
      )}
      <div className="vault-item-actions">
        <button
          type="button"
          className="icon-button"
          onClick={onEdit}
          title={t("common.edit")}
          aria-label={t("vaultItem.edit", { name: credential.name })}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          className="icon-button danger"
          onClick={onDelete}
          title={t("common.delete")}
          aria-label={t("vaultItem.delete", { name: credential.name })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export default VaultItem;
