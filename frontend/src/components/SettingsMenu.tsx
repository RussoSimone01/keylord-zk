import ThemeSwitcher from "./ThemeSwitcher";
import "../pages/Settings.css";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import AutoLockSettings from "./AutoLockSettings";
import ClipboardSettings from "./ClipboardSettings";

export type SettingsSection =
  "changePassword" | "importVault" | "exportVault" | "deleteAccount";

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
        <div className="settings-section-body">
          <div className="settings-field">
            <span className="settings-field-label">{t("theme.label")}</span>
            <ThemeSwitcher />
          </div>
          <div className="settings-field">
            <span className="settings-field-label">{t("language.label")}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </section>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.security")}</h2>
        <div className="settings-section-body">
          <AutoLockSettings />
          <ClipboardSettings />
          <button type="button" onClick={() => onSelect("changePassword")}>
            {t("settings.changePassword")}
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.data")}</h2>
        <div className="settings-section-body">
          <button type="button" onClick={() => onSelect("importVault")}>
            {t("settings.importVault")}
          </button>
          <button type="button" onClick={() => onSelect("exportVault")}>
            {t("settings.exportVault")}
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h2 className="settings-label">{t("settings.dangerZone")}</h2>
        <div className="settings-section-body">
          <button
            type="button"
            className="settings-danger"
            onClick={() => onSelect("deleteAccount")}
          >
            {t("settings.deleteAccount")}
          </button>
        </div>
      </section>
    </div>
  );
}

export default SettingsMenu;
