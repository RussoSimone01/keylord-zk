import { useEffect, useState } from "react";
import {
	decryptVault,
	encryptCredential,
	type PlainCredential,
} from "../crypto/vault.ts";
import { estimateStrength, generatePassword } from "../crypto/password";
import { create, deleteCredential, getAll, update } from "../api/vault";
import { useAuthStore } from "../store/authStore";
import axios from "axios";
import "./Vault.css";
import "../components/VaultItem.css";
import Spinner from "../components/Spinner.tsx";
import SearchField from "../components/SearchField";
import StrengthMeter from "../components/StrengthMeter";
import VaultItem from "../components/VaultItem";
import ConfirmDialog from "../components/ConfirmDialog";
import { Dices, Eye, EyeOff, KeyRound, Plus } from "lucide-react";

function Vault() {
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
	const [pendingDelete, setPendingDelete] = useState<PlainCredential | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		async function loadCredentials() {
			try {
				setIsLoading(true);
				const encryptedCredentials = await getAll();
				if (encryptionKey === null) {
					return;
				}
				const plainCredentials = await decryptVault(
					encryptedCredentials,
					encryptionKey,
				);
				setCredentials(plainCredentials);
			} catch (err) {
				setError(errorMessage(err));
			} finally {
				setIsLoading(false);
			}
		}

		loadCredentials();
	}, [encryptionKey]);

	function errorMessage(err: unknown) {
		if (axios.isAxiosError(err)) {
			return err.response?.data?.error ?? "An error occurred";
		}
		return "An error occurred";
	}

	async function handleSubmit() {
		try {
			if (encryptionKey === null) {
				setError("Session expired, please log in again");
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
			setError(errorMessage(err));
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
			setError(errorMessage(err));
		} finally {
			setIsDeleting(false);
			setPendingDelete(null);
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
		.sort((a, b) => a.site.localeCompare(b.site));

	return (
		<div className="vault-container">
			<div className="vault-header">
				<h1>Vault</h1>
				{!isFormOpen && (
					<button className="primary" type="button" onClick={openNewForm}>
						<Plus size={16} /> New credential
					</button>
				)}
			</div>

			{isFormOpen && (
				<div className="vault-form-card">
					<h2>{id == null ? "New credential" : "Edit credential"}</h2>
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
								<label htmlFor="site">Site</label>
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
								<label htmlFor="username">Username</label>
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
								<label htmlFor="password">Password</label>
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
										title="Generate password"
										aria-label="Generate password"
									>
										<Dices size={16} />
									</button>
									<button
										type="button"
										className="icon-button"
										aria-pressed={showPassword}
										onClick={() => setShowPassword(!showPassword)}
										title={showPassword ? "Hide" : "Show"}
										aria-label={showPassword ? "Hide password" : "Show password"}
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
								Save
							</button>
							<button type="reset">Cancel</button>
						</div>
						{error && <span className="auth-error">{error}</span>}
					</form>
				</div>
			)}

			{!isFormOpen && error && <span className="auth-error">{error}</span>}

			{credentials.length === 0 ? (
				<div className="vault-empty">
					<div className="vault-empty-glyph" aria-hidden="true">
						<KeyRound size={22} />
					</div>
					<div className="vault-empty-title">Your vault is empty</div>
					<p>
						Everything you save is encrypted on this device before it
						reaches the server.
					</p>
					{!isFormOpen && (
						<button className="primary" type="button" onClick={openNewForm}>
							<Plus size={16} /> Add your first credential
						</button>
					)}
				</div>
			) : (
				<>
					<SearchField
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search by site or username"
						count={filteredCredentials.length}
					/>
					{filteredCredentials.length === 0 ? (
						<div className="vault-empty">
							<div className="vault-empty-title">
								No matches for “{searchQuery.trim()}”
							</div>
							<button type="button" onClick={() => setSearchQuery("")}>
								Clear search
							</button>
						</div>
					) : (
						<ul className="vault-list">
							<li className="vault-list-head" aria-hidden="true">
								<span>
									{filteredCredentials.length}{" "}
									{filteredCredentials.length === 1 ? "credential" : "credentials"}
								</span>
								<span>A–Z</span>
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
				open={pendingDelete != null}
				title={`Delete ${pendingDelete?.site ?? "credential"}?`}
				confirmLabel="Delete"
				busy={isDeleting}
				onConfirm={confirmDelete}
				onCancel={() => setPendingDelete(null)}
			>
				<p>
					The saved login for{" "}
					<span className="mono">{pendingDelete?.username}</span> will be
					removed from your vault. This cannot be undone.
				</p>
			</ConfirmDialog>
		</div>
	);
}

export default Vault;
