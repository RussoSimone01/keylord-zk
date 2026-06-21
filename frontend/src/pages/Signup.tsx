import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { deriveKeys, generateSalt } from "../crypto/vault";
import { register } from "../api/auth";

function Signup() {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();
	const navigate = useNavigate();

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
			const salt: string = generateSalt();
			const { authKey, encryptionKey } = await deriveKeys(password, salt);
			const { accessToken, refreshToken } = await register({
				username,
				email: email || undefined,
				authKey,
				salt,
				kdfIterations: 600000,
			});
			authStore.setAuth(encryptionKey, accessToken, refreshToken);
			navigate("/vault");
		} catch (err) {
			console.log(err);
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error ?? "An error occurred");
			} else {
				setError("An error occurred");
			}
		}
	}

	return (
		<div>
			<h1>Signup Page</h1>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<label htmlFor="username">Username</label>
				<input
					id="username"
					type="text"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					required
				></input>
				<br />
				<label htmlFor="email">Email</label>
				<input
					id="email"
					type="text"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
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
				<button id="signupButton" type="submit">
					Signup
				</button>
				<br />
				{error && <span>{error}</span>}
			</form>
		</div>
	);
}

export default Signup;
