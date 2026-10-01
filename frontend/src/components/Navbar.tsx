import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { logout } from "../api/auth";
import ThemeSwitcher from "./ThemeSwitcher";
import "./Navbar.css";
import { Lock } from "lucide-react";

function Navbar() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  // Locking ends the session on the server, clears the in-memory encryption key and tokens, then returns to login.
  function handleLock() {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      void logout(refreshToken);
    }
    clearAuth();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <div className="navbar-wordmark" aria-label="keylord">
        k<span className="navbar-wordmark-rest">eylord</span>
        <span className="navbar-caret">_</span>
      </div>
      <nav className="navbar-links" aria-label="Main">
        <NavLink
          className={({ isActive }) => (isActive ? "active" : "")}
          to="/vault"
        >
          Vault
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "active" : "")}
          to="/generator"
        >
          Generator
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "active" : "")}
          to="/settings"
        >
          Settings
        </NavLink>
      </nav>
      <div className="navbar-actions">
        <ThemeSwitcher compact />
        <button
          className="navbar-lock"
          type="button"
          onClick={handleLock}
          aria-label="Lock vault"
          title="Lock vault"
        >
          <Lock size={16} />
          <span className="navbar-lock-label">Log out</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
