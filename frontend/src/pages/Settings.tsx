import { useState } from "react";
import SettingsMenu from "../components/SettingsMenu";
import ChangePassword from "../components/ChangePassword";
import DeleteAccount from "../components/DeleteAccount";

function Settings() {
	const [activeSection, setActiveSection] = useState<
		"changePassword" | "deleteAccount" | null
	>(null);

	return (
		<div>
			<h1>Settings page</h1>
			{activeSection == null && (
				<SettingsMenu onSelect={setActiveSection} />
			)}
			{activeSection == "changePassword" && (
				<ChangePassword onBack={() => setActiveSection(null)} />
			)}
			{activeSection == "deleteAccount" && (
				<DeleteAccount onBack={() => setActiveSection(null)} />
			)}
		</div>
	);
}

export default Settings;
