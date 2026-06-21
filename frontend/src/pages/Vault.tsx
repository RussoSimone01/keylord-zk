import { useEffect, useState } from "react";
import {
	decryptVault,
	encryptCredential,
	type PlainCredential,
} from "../crypto/vault.ts";
import { create, deleteCredential, getAll, update } from "../api/vault";
import { useAuthStore } from "../store/authStore";
import axios from "axios";

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
				console.log(err);
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
			console.log(err);
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

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div>
			<h1>Vault page</h1>
			<div style={{ margin: "10px" }}>
				<h2>New credential</h2>
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
					<label htmlFor="site">Site</label>
					<input
						id="site"
						type="text"
						value={site}
						onChange={(e) => setSite(e.target.value)}
						required
					></input>
					<br />
					<label htmlFor="username">Username</label>
					<input
						id="username"
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					></input>
					<br />
					<label htmlFor="password">Password</label>
					<input
						id="password"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					></input>
					<button type="button" onClick={() => togglePassword()}>
						{showPassword ? "Hide" : "Show"}
					</button>
					<br />
					<button id="resetButton" type="reset">
						Reset
					</button>
					<button id="saveButton" type="submit">
						Save
					</button>
					<br />
					{error && <span>{error}</span>}
				</form>
			</div>
			<table>
				<thead>
					<tr>
						<td>Site</td>
						<td>Username</td>
						<td>Password</td>
						<td></td>
					</tr>
				</thead>
				<tbody>
					{credentials.map((credential) => (
						<tr key={credential.id}>
							<td>{credential.site}</td>
							<td>{credential.username}</td>
							<td>
								<input
									type={
										visiblePasswords.has(credential.id!)
											? "text"
											: "password"
									}
									value={credential.password}
									readOnly
								></input>
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
							</td>
							<td>
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
									type="button"
									onClick={(e) => {
										e.preventDefault();
										handleDelete(credential.id!);
									}}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default Vault;
