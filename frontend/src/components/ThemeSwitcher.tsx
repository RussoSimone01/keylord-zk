import { PALETTES, themeId, useThemeStore } from "../store/themeStore";
import "./ThemeSwitcher.css";
import { useTranslation } from "react-i18next";

// Radio group of color palettes. Each swatch sets its own data-theme, so it is drawn
// in that palette's colors for the mode currently shown.
function ThemeSwitcher() {
  const { t } = useTranslation();
  const palette = useThemeStore((state) => state.palette);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const setPalette = useThemeStore((state) => state.setPalette);

  return (
    <div
      className="theme-switcher"
      role="radiogroup"
      aria-label={t("theme.color")}
    >
      {PALETTES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === palette}
          className={
            item.id === palette ? "theme-option active" : "theme-option"
          }
          onClick={() => setPalette(item.id)}
        >
          <span
            className="theme-swatch"
            data-theme={themeId(item.id, resolvedMode)}
            aria-hidden="true"
          >
            <span />
          </span>
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeSwitcher;
