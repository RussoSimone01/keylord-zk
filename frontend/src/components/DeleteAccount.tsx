import axios from "axios";
import { useState } from "react";
import { deleteAccount, getSalt, verifyPassword } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { deriveKeys } from "../crypto/vault";
import { useNavigate } from "react-router-dom";
import "../pages/Settings.css";
import Spinner from "./Spinner";

interface DeleteAccountProps {
	onBack: () => void;
}

function DeleteAccount({ onBack }: DeleteAccountProps) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();
	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit() {
		setIsSubmitting(true);
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
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isSubmitting) {
		return <Spinner />;
	}

	return (
		<div>
			<div className="auth-card">
				<button
					className="settings-back"
					type="button"
					onClick={onBack}
				>
					← Back
				</button>
				<h1>Delete Account</h1>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div className="settings-warning">
						<b>WARNING: this action cannot be undone</b>
					</div>
					<div className="auth-field">
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
					</div>
					<button
						id="deleteButton"
						type="submit"
						className="auth-submit"
						disabled={isSubmitting}
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
					{error && <span className="auth-error">{error}</span>}
				</form>
			</div>
		</div>
	);
}

export default DeleteAccount;
