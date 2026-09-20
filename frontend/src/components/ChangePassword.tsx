import axios from "axios";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { changePassword, getSalt, verifyPassword } from "../api/auth";
import { deriveKeys, reencryptVault } from "../crypto/vault";
import { getAll } from "../api/vault";
import "../styles/auth.css";
import "../pages/Settings.css";
import Spinner from "./Spinner";

interface ChangePasswordProps {
	onBack: () => void;
}

function ChangePassword({ onBack }: ChangePasswordProps) {
	const [oldPassword, setOldPassword] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();
	const [isSubmitting, setIsSubmitting] = useState(false);

	function checkPassword(password: string, confirmPassword: string) {
		if (confirmPassword != "" && password != confirmPassword) {
			setError("Password do not match");
		} else {
			setError("");
		}
	}

	async function handleSubmit() {
		setIsSubmitting(true);
		try {
			if (password != confirmPassword) {
				setError("Password do not match");
				return;
			}
			if (oldPassword === password) {
				setError("New password must be different from the old one");
				return;
			}
			const { salt } = await getSalt(authStore.username);
			const { authKey: oldAuthKey, encryptionKey: oldEncryptionKey } =
				await deriveKeys(oldPassword, salt);
			if (!(await verifyPassword({ authKey: oldAuthKey }))) {
				setError("Old password is incorrect");
				return;
			}
			const oldCredentials = await getAll();
			const { newKeys, newSalt, reencryptedCredentials } =
				await reencryptVault(
					oldCredentials,
					oldEncryptionKey,
					password,
				);
			const { accessToken, refreshToken } = await changePassword({
				oldAuthKey,
				newAuthKey: newKeys.authKey,
				newSalt,
				credentials: reencryptedCredentials,
			});
			authStore.setAuth(
				authStore.username,
				newKeys.encryptionKey,
				accessToken,
				refreshToken,
			);
			onBack();
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
				<h1>Change Password</h1>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div className="auth-field">
						<label htmlFor="oldPassword">Old Password</label>
						<input
							id="oldPassword"
							type="password"
							value={oldPassword}
							onChange={(e) => {
								setOldPassword(e.target.value);
							}}
							required
						></input>
					</div>
					<div className="auth-field">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								checkPassword(e.target.value, confirmPassword);
							}}
							required
						></input>
					</div>
					<div className="auth-field">
						<label htmlFor="confirmPassword">
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => {
								setConfirmPassword(e.target.value);
								checkPassword(password, e.target.value);
							}}
							required
						></input>
					</div>
					<button
						id="changePwdButton"
						type="submit"
						className="auth-submit"
						disabled={isSubmitting}
					>
						Change Password
					</button>
					{error && <span className="auth-error">{error}</span>}
				</form>
			</div>
		</div>
	);
}

export default ChangePassword;
