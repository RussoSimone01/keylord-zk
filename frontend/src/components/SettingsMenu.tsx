interface SettingsMenuProps {
	onSelect: (selection: "changePassword" | "deleteAccount") => void;
}

function SettingsMenu({ onSelect }: SettingsMenuProps) {
	return (
		<ul>
			<li>
				<button
					type="button"
					onClick={() => onSelect("changePassword")}
				>
					Change Password
				</button>
			</li>
			<li>
				<button type="button" onClick={() => onSelect("deleteAccount")}>
					Delete Account
				</button>
			</li>
		</ul>
	);
}

export default SettingsMenu;
