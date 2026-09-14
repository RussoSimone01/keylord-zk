import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSalt, login } from "../api/auth";
import { deriveKeys } from "../crypto/vault";
import { useAuthStore } from "../store/authStore";
import axios from "axios";
import "../styles/auth.css";

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
			authStore.setAuth(
				username,
				encryptionKey,
				accessToken,
				refreshToken,
			);
			navigate("/vault");
		} catch (err) {
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error ?? "An error occurred");
			} else {
				setError("An error occurred");
			}
		}
	}

	return (
		<div className="auth-container">
			<div className="auth-card">
				<h1>Log in</h1>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div className="auth-field">
						<label htmlFor="username">Username</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
					</div>
					<div className="auth-field">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<button className="auth-submit" type="submit">
						Log in
					</button>
					{error && <span className="auth-error">{error}</span>}
				</form>
				<div className="auth-link">
					Don't have an account? <Link to="/signup">Sign up</Link>
				</div>
			</div>
		</div>
	);
}

export default Login;
