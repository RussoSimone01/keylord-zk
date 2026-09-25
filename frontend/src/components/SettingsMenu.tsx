import ThemeSwitcher from "./ThemeSwitcher";
import "../pages/Settings.css";

interface SettingsMenuProps {
	onSelect: (selection: "changePassword" | "deleteAccount") => void;
}

function SettingsMenu({ onSelect }: SettingsMenuProps) {
	return (
		<div className="settings-menu">
			<h1>Settings</h1>
			<section className="settings-section">
				<h2 className="settings-label">Appearance</h2>
				<ThemeSwitcher />
			</section>
			<section className="settings-section">
				<h2 className="settings-label">Security</h2>
				<button type="button" onClick={() => onSelect("changePassword")}>
					Change master password
				</button>
			</section>
			<section className="settings-section">
				<h2 className="settings-label">Danger zone</h2>
				<button
					type="button"
					className="settings-danger"
					onClick={() => onSelect("deleteAccount")}
				>
					Delete account
				</button>
			</section>
		</div>
	);
}

export default SettingsMenu;
