import { THEMES, useThemeStore } from "../store/themeStore";
import "./ThemeSwitcher.css";

interface ThemeSwitcherProps {
	compact?: boolean;
}

// Radio group of themes; each swatch sets its own data-theme so it is drawn in that theme's colors.
function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
	const theme = useThemeStore((state) => state.theme);
	const setTheme = useThemeStore((state) => state.setTheme);

	return (
		<div
			className={compact ? "theme-switcher compact" : "theme-switcher"}
			role="radiogroup"
			aria-label="Theme"
		>
			{THEMES.map((t) => (
				<button
					key={t.id}
					type="button"
					role="radio"
					aria-checked={t.id === theme}
					title={t.name}
					className={t.id === theme ? "theme-option active" : "theme-option"}
					onClick={() => setTheme(t.id)}
				>
					<span className="theme-swatch" data-theme={t.id} aria-hidden="true">
						<span />
					</span>
					<span className={compact ? "sr-only" : undefined}>{t.name}</span>
				</button>
			))}
		</div>
	);
}

export default ThemeSwitcher;
