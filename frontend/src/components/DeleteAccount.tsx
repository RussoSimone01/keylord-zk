import axios from "axios";
import { useState } from "react";
import { deleteAccount, getSalt, verifyPassword } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { deriveKeys } from "../crypto/vault";
import { useNavigate } from "react-router-dom";

interface DeleteAccountProps {
	onBack: () => void;
}

function DeleteAccount({ onBack }: DeleteAccountProps) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();
	const navigate = useNavigate();

	async function handleSubmit() {
		try {
			const { salt } = await getSalt(authStore.username);
			const { authKey } = await deriveKeys(password, salt);
			if (!(await verifyPassword({ authKey }))) {
				setError("Password is incorrect");
				return;
			}
			await deleteAccount();
			authStore.clearAuth();
			navigate("/login");
		} catch (err) {
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error ?? "An error occurred");
			} else {
				setError("An error occurred");
			}
		}
	}

	return (
		<div>
			<button type="button" onClick={onBack}>
				Back
			</button>
			<h2>Delete Account</h2>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<b>WARNING: this action cannot be undone</b>
				<br />
				<label htmlFor="password">Confirm with Password</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => {
						setPassword(e.target.value);
					}}
					required
				></input>
				<br />
				<button
					id="deleteButton"
					type="submit"
					onClick={(e) => {
						if (
							!confirm(
								"Are you sure you want to completely delete the account and its related data?",
							)
						) {
							e.preventDefault();
						}
					}}
				>
					Delete Account
				</button>
				<br />
				{error && <span>{error}</span>}
			</form>
		</div>
	);
}

export default DeleteAccount;
