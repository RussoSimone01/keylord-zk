import { NavLink } from "react-router-dom";
import ThemeMenu from "./ThemeMenu";
import "./Navbar.css";
import { Dices, KeyRound, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import UserMenu from "./UserMenu";

function Navbar() {
  const { t } = useTranslation();

  return (
    <header className="navbar">
      <div className="navbar-wordmark">
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
        <UserMenu />
      </div>
    </header>
  );
}

export default Navbar;
