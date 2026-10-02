import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { logout } from "../api/auth";
import ThemeMenu from "./ThemeMenu";
import "./Navbar.css";
import { Dices, KeyRound, Lock, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

function Navbar() {
  const { t } = useTranslation();
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
      <nav className="navbar-links" aria-label={t("nav.main")}>
        <NavLink
          className={({ isActive }) => (isActive ? "active" : "")}
          to="/vault"
        >
          <KeyRound size={18} className="navbar-link-icon" aria-hidden="true" />
          <span>{t("nav.vault")}</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "active" : "")}
          to="/generator"
        >
          <Dices size={18} className="navbar-link-icon" aria-hidden="true" />
          <span>{t("nav.generator")}</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "active" : "")}
          to="/settings"
        >
          <Settings size={18} className="navbar-link-icon" aria-hidden="true" />
          <span>{t("nav.settings")}</span>
        </NavLink>
      </nav>
      <div className="navbar-actions">
        <ThemeMenu />
        <button
          className="navbar-lock"
          type="button"
          onClick={handleLock}
          aria-label={t("nav.lockVault")}
          title={t("nav.lockVault")}
        >
          <Lock size={16} />
          <span className="navbar-lock-label">{t("nav.logout")}</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
