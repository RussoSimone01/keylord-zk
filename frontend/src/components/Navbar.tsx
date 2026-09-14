import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";

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
		<div>
			<button type="button" onClick={toggleTheme}>
				{theme === "dark" ? "☀️" : "🌙"}
			</button>
			<Link to="/vault">Vault</Link>
			<Link to="/settings">Settings</Link>
			<button type="button" onClick={handleClick}>
				Logout
			</button>
		</div>
	);
}

export default Navbar;
