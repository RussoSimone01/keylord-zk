import { THEMES, useThemeStore } from "../store/themeStore";
import "./ThemeSwitcher.css";
import { useTranslation } from "react-i18next";

interface ThemeSwitcherProps {
  compact?: boolean;
}

// Radio group of themes; each swatch sets its own data-theme so it is drawn in that theme's colors.
function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div
      className={compact ? "theme-switcher compact" : "theme-switcher"}
      role="radiogroup"
      aria-label={t("theme.label")}
    >
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === theme}
          title={item.name}
          className={item.id === theme ? "theme-option active" : "theme-option"}
          onClick={() => setTheme(item.id)}
        >
          <span
            className="theme-swatch"
            data-theme={item.id}
            aria-hidden="true"
          >
            <span />
          </span>
          <span className={compact ? "sr-only" : undefined}>{item.name}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeSwitcher;
