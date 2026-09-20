import "../pages/Settings.css";

interface SettingsMenuProps {
	onSelect: (selection: "changePassword" | "deleteAccount") => void;
}

function SettingsMenu({ onSelect }: SettingsMenuProps) {
	return (
		<div className="settings-menu">
			<h1>Settings</h1>
			<button type="button" onClick={() => onSelect("changePassword")}>
				Change Password
			</button>
			<button type="button" onClick={() => onSelect("deleteAccount")}>
				Delete Account
			</button>
		</div>
	);
}

export default SettingsMenu;
