import axios from "axios";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { changePassword, getSalt, verifyPassword } from "../api/auth";
import { deriveKeys, reencryptVault } from "../crypto/vault";
import { getAll } from "../api/vault";

interface ChangePasswordProps {
	onBack: () => void;
}

function ChangePassword({ onBack }: ChangePasswordProps) {
	const [oldPassword, setOldPassword] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();

	function checkPassword(password: string, confirmPassword: string) {
		if (confirmPassword != "" && password != confirmPassword) {
			setError("Password do not match");
		} else {
			setError("");
		}
	}

	async function handleSubmit() {
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
		}
	}

	return (
		<div>
			<button type="button" onClick={onBack}>
				Back
			</button>
			<h2>Change Password</h2>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
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
				<br />
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
				<br />
				<label htmlFor="confirmPassword">Confirm Password</label>
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
				<br />
				<button id="changePwdButton" type="submit">
					Change Password
				</button>
				<br />
				{error && <span>{error}</span>}
			</form>
		</div>
	);
}

export default ChangePassword;
