import { useEffect, useState } from "react";
import {
	decryptVault,
	encryptCredential,
	type PlainCredential,
} from "../crypto/vault.ts";
import { create, deleteCredential, getAll, update } from "../api/vault";
import { useAuthStore } from "../store/authStore";
import axios from "axios";
import "./Vault.css";
import Spinner from "../components/Spinner.tsx";

function Vault() {
	const [credentials, setCredentials] = useState<PlainCredential[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [id, setId] = useState<number | null>(null);
	const [site, setSite] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(
		new Set(),
	);
	const encryptionKey = useAuthStore((state) => state.encryptionKey);
	const [copiedField, setCopiedField] = useState<string | null>(null);

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
				if (axios.isAxiosError(err)) {
					setError(err.response?.data?.error ?? "An error occurred");
				} else {
					setError("An error occurred");
				}
			} finally {
				setIsLoading(false);
			}
		}
		loadCredentials();
	}, [encryptionKey]);

	async function handleSubmit() {
		try {
			if (encryptionKey === null) {
				setError("Session expired, please log in again");
				return;
			}
			const { encryptedData } = await encryptCredential(
				{ site: site, username: username, password: password },
				encryptionKey,
			);
			if (id == null) {
				const { id } = await create({ encryptedData });
				setCredentials([
					...credentials,
					{ id, site, username, password },
				]);
			} else {
				await update(id, { encryptedData });
				const credential = credentials.find((c) => c.id === id);
				if (credential == null) {
					return;
				}
				setCredentials(
					credentials.map((c) =>
						c.id === id ? { ...c, site, username, password } : c,
					),
				);
			}
			setId(null);
			setSite("");
			setUsername("");
			setPassword("");
		} catch (err) {
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error ?? "An error occurred");
			} else {
				setError("An error occurred");
			}
		}
	}

	function handleReset() {
		setId(null);
		setSite("");
		setUsername("");
		setPassword("");
	}

	function handleEdit(id: number) {
		setId(id);
		const credential = credentials.find((c) => c.id === id);
		if (credential == null) {
			return;
		}
		setSite(credential.site);
		setUsername(credential.username);
		setPassword(credential.password);
	}

	async function handleDelete(id: number) {
		try {
			await deleteCredential(id);
			setCredentials(credentials.filter((c) => c.id != id));
		} catch (err) {
			console.log(err);
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error ?? "An error occurred");
			} else {
				setError("An error occurred");
			}
		}
	}

	function togglePassword() {
		setShowPassword(!showPassword);
	}

	function toggleTablePassword(id: number) {
		setVisiblePasswords((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	async function copyToClipboard(text: string, fieldId: string) {
		await navigator.clipboard.writeText(text);
		setCopiedField(fieldId);
		setTimeout(() => setCopiedField(null), 2000);
	}

	if (isLoading) {
		return <Spinner />;
	}

	return (
		<div className="vault-container">
			<h1>Vault</h1>
			<div className="vault-form-card">
				<h2>{id == null ? "New credential" : "Edit credential"}</h2>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					onReset={(e) => {
						e.preventDefault();
						handleReset();
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
									onChange={(e) =>
										setPassword(e.target.value)
									}
									required
								/>
								<button
									type="button"
									onClick={() => togglePassword()}
								>
									{showPassword ? "Hide" : "Show"}
								</button>
							</div>
						</div>
					</div>
					<div className="vault-form-actions">
						<button className="primary" type="submit">
							Save
						</button>
						<button type="reset">Reset</button>
					</div>
					{error && <span className="auth-error">{error}</span>}
				</form>
			</div>

			<table className="vault-table">
				<thead>
					<tr>
						<th>Site</th>
						<th>Username</th>
						<th>Password</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{credentials.map((credential) => (
						<tr key={credential.id}>
							<td>{credential.site}</td>
							<td>
								<div className="vault-table-field-cell">
									{credential.username}
									<button
										type="button"
										onClick={() =>
											copyToClipboard(
												credential.username,
												`${credential.id}-username`,
											)
										}
									>
										{copiedField ===
										`${credential.id}-username`
											? "Copied!"
											: "Copy"}
									</button>
								</div>
							</td>
							<td>
								<div className="vault-table-field-cell">
									<input
										type={
											visiblePasswords.has(credential.id!)
												? "text"
												: "password"
										}
										value={credential.password}
										readOnly
									/>
									<button
										type="button"
										onClick={() =>
											toggleTablePassword(credential.id!)
										}
									>
										{visiblePasswords.has(credential.id!)
											? "Hide"
											: "Show"}
									</button>
									<button
										type="button"
										onClick={() =>
											copyToClipboard(
												credential.password,
												`${credential.id}-password`,
											)
										}
									>
										{copiedField ===
										`${credential.id}-password`
											? "Copied!"
											: "Copy"}
									</button>
								</div>
							</td>
							<td>
								<div className="vault-row-actions">
									<button
										type="button"
										onClick={(e) => {
											e.preventDefault();
											handleEdit(credential.id!);
										}}
									>
										Edit
									</button>
									<button
										className="danger"
										type="button"
										onClick={(e) => {
											e.preventDefault();
											handleDelete(credential.id!);
										}}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default Vault;
