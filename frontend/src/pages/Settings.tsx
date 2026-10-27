import { useState } from "react";
import SettingsMenu from "../components/SettingsMenu";
import ChangePassword from "../components/ChangePassword";
import DeleteAccount from "../components/DeleteAccount";
import ExportVault from "../components/ExportVault";
import type { SettingsSection } from "../components/SettingsMenu";
import "./Settings.css";
import { usePageTitle } from "../hooks/usePageTitle";

function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(
    null,
  );
  usePageTitle(
    activeSection == null ? "settings.title" : `${activeSection}.title`,
  );

  return (
    <div className="settings-container">
      {activeSection == null && <SettingsMenu onSelect={setActiveSection} />}
      {activeSection == "changePassword" && (
        <ChangePassword onBack={() => setActiveSection(null)} />
      )}
      {activeSection == "exportVault" && (
        <ExportVault onBack={() => setActiveSection(null)} />
      )}
      {activeSection == "deleteAccount" && (
        <DeleteAccount onBack={() => setActiveSection(null)} />
      )}
    </div>
  );
}

export default Settings;
