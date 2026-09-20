import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import "./Navbar.css";
import { Sun, Moon, LogOut } from "lucide-react";

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
				{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
			</button>
			<div className="navbar-links">
				<NavLink
					className={({ isActive }) => (isActive ? "active" : "")}
					to="/vault"
				>
					Vault
				</NavLink>
				<NavLink
					className={({ isActive }) => (isActive ? "active" : "")}
					to="/settings"
				>
					Settings
				</NavLink>
			</div>
			<button
				className="navbar-actions"
				type="button"
				onClick={handleClick}
			>
				<LogOut size={16} /> Logout
			</button>
		</div>
	);
}

export default Navbar;
