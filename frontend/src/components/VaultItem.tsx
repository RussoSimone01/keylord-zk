import { Pencil, Trash2 } from "lucide-react";
import type { PlainCredential } from "../crypto/vault";
import CopyButton from "./CopyButton";
import SecretText from "./SecretText";
import "./VaultItem.css";

interface VaultItemProps {
	credential: PlainCredential;
	selected?: boolean;
	onEdit: () => void;
	onDelete: () => void;
}

// First letter of the site without scheme or "www."; no remote favicons, which would leak the site list.
function monogram(site: string) {
	const letter = site.replace(/^https?:\/\//, "").replace(/^www\./, "").charAt(0);
	return letter === "" ? "?" : letter.toUpperCase();
}

function VaultItem({ credential, selected = false, onEdit, onDelete }: VaultItemProps) {
	return (
		<li className={selected ? "vault-item selected" : "vault-item"}>
			<span className="vault-monogram" aria-hidden="true">
				{monogram(credential.site)}
			</span>
			<div className="vault-item-id">
				<div className="vault-item-site" title={credential.site}>
					{credential.site}
				</div>
				<div className="vault-item-user">
					<span className="mono" title={credential.username}>
						{credential.username}
					</span>
					<CopyButton value={credential.username} label="Copy username" />
				</div>
			</div>
			<SecretText value={credential.password} className="vault-item-secret" />
			<div className="vault-item-actions">
				<button
					type="button"
					className="icon-button"
					onClick={onEdit}
					title="Edit"
					aria-label={`Edit ${credential.site}`}
				>
					<Pencil size={16} />
				</button>
				<button
					type="button"
					className="icon-button danger"
					onClick={onDelete}
					title="Delete"
					aria-label={`Delete ${credential.site}`}
				>
					<Trash2 size={16} />
				</button>
			</div>
		</li>
	);
}

export default VaultItem;
