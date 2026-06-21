import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSalt, login } from "../api/auth";
import { deriveKeys } from "../crypto/vault";
import { useAuthStore } from "../store/authStore";
import axios from "axios";

function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const authStore = useAuthStore();
	const navigate = useNavigate();

	async function handleSubmit() {
		try {
			const { salt } = await getSalt(username);
			const { authKey, encryptionKey } = await deriveKeys(password, salt);
			const { accessToken, refreshToken } = await login({
				username,
				authKey,
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
			<h1>Login page</h1>
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
				<label htmlFor="password">Password</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				></input>
				<br />
				<button id="loginButton" type="submit">
					Login
				</button>
				<br />
				{error && <span>{error}</span>}
			</form>
		</div>
	);
}

export default Login;
