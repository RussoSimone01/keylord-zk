import { MODES, useThemeStore } from "../store/themeStore";
import ModeIcon from "./ModeIcon";
import "./ThemeSwitcher.css";
import { useTranslation } from "react-i18next";

// Radio group for light, dark or automatic (following the operating system).
function ModeSwitcher() {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <div
      className="theme-switcher"
      role="radiogroup"
      aria-label={t("theme.modeLabel")}
    >
      {MODES.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={item === mode}
          className={item === mode ? "theme-option active" : "theme-option"}
          onClick={() => setMode(item)}
        >
          <ModeIcon mode={item} />
          <span>{t(`theme.modes.${item}`)}</span>
        </button>
      ))}
    </div>
  );
}

export default ModeSwitcher;
