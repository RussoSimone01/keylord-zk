import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import "./Navbar.css";

function Navbar() {
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const navigate = useNavigate();
	const theme = useThemeStore((state) => state.theme);
	const toggleTheme = useThemeStore((state) => state.toggleTheme);

	function handleClick() {
		clearAuth();
		navigate("/login");
	}

	return (
		<div className="navbar">
			<button
				className="navbar-actions"
				type="button"
				onClick={toggleTheme}
			>
				{theme === "dark" ? "☀️" : "🌙"}
			</button>
			<Link className="navbar-links" to="/vault">
				Vault
			</Link>
			<Link to="/settings">Settings</Link>
			<button
				className="navbar-actions"
				type="button"
				onClick={handleClick}
			>
				Logout
			</button>
		</div>
	);
}

export default Navbar;
