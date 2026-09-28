import { useState } from "react";
import { deleteAccount, getSalt } from "../api/auth";
import { getErrorMessage } from "../api/errors";
import { useAuthStore } from "../store/authStore";
import { deriveKeys } from "../crypto/vault";
import { useNavigate } from "react-router-dom";
import "../pages/Settings.css";
import Spinner from "./Spinner";
import ConfirmDialog from "./ConfirmDialog";

interface DeleteAccountProps {
	onBack: () => void;
}

function DeleteAccount({ onBack }: DeleteAccountProps) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();
	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	async function handleSubmit() {
		setIsSubmitting(true);
		try {
			const { salt, kdfIterations } = await getSalt(authStore.username);
			const { authKey } = await deriveKeys(password, salt, kdfIterations);
			// The server verifies the password itself and rejects the request if it is wrong
			await deleteAccount({ authKey });
			authStore.clearAuth(true);
			navigate("/login");
		} catch (err) {
			setError(getErrorMessage(err));
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
						setIsConfirmOpen(true);
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
						className="auth-submit danger"
						disabled={isSubmitting}
					>
						Delete Account
					</button>
					{error && <span className="auth-error">{error}</span>}
				</form>
			</div>
			<ConfirmDialog
				open={isConfirmOpen}
				title="Delete your account?"
				confirmLabel="Delete forever"
				requireText="DELETE"
				onConfirm={() => {
					setIsConfirmOpen(false);
					handleSubmit();
				}}
				onCancel={() => setIsConfirmOpen(false)}
			>
				<p>
					Your account, your vault and every saved credential will be
					erased from the server. Without your master password nobody can
					recover them.
				</p>
			</ConfirmDialog>
		</div>
	);
}

export default DeleteAccount;
