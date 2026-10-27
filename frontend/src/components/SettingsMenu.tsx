import ThemeSwitcher from "./ThemeSwitcher";
import "../pages/Settings.css";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import AutoLockSettings from "./AutoLockSettings";
import ClipboardSettings from "./ClipboardSettings";

export type SettingsSection =
  "changePassword" | "exportVault" | "deleteAccount";

interface SettingsMenuProps {
  onSelect: (selection: SettingsSection) => void;
}

function SettingsMenu({ onSelect }: SettingsMenuProps) {
  const { t } = useTranslation();
  return (
    <div className="settings-menu">
      <h1>{t("settings.title")}</h1>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.appearance")}</h2>
        <div className="settings-field">
          <span className="settings-field-label">{t("theme.label")}</span>
          <ThemeSwitcher />
        </div>
        <div className="settings-field">
          <span className="settings-field-label">{t("language.label")}</span>
          <LanguageSwitcher />
        </div>
      </section>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.security")}</h2>
        <AutoLockSettings />
        <ClipboardSettings />
        <button type="button" onClick={() => onSelect("changePassword")}>
          {t("settings.changePassword")}
        </button>
      </section>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.data")}</h2>
        <button type="button" onClick={() => onSelect("exportVault")}>
          {t("settings.exportVault")}
        </button>
      </section>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.dangerZone")}</h2>
        <button
          type="button"
          className="settings-danger"
          onClick={() => onSelect("deleteAccount")}
        >
          {t("settings.deleteAccount")}
        </button>
      </section>
    </div>
  );
}

export default SettingsMenu;
