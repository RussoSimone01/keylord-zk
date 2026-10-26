import { THEMES, useThemeStore, type ThemeChoice } from "../store/themeStore";
import ThemeSwatch from "./ThemeSwatch";
import "./ThemeSwitcher.css";
import { useTranslation } from "react-i18next";

// Radio group of themes for Settings: Automatic first, then the dark and the light themes.
function ThemeSwitcher() {
  const { t } = useTranslation();
  const choice = useThemeStore((state) => state.choice);
  const setChoice = useThemeStore((state) => state.setChoice);
  const options: { id: ThemeChoice; name: string }[] = [
    { id: "system", name: t("theme.system") },
    ...THEMES,
  ];

  return (
    <div
      className="theme-switcher"
      role="radiogroup"
      aria-label={t("theme.label")}
    >
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === choice}
          className={
            item.id === choice ? "theme-option active" : "theme-option"
          }
          onClick={() => setChoice(item.id)}
        >
          <ThemeSwatch choice={item.id} />
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeSwitcher;
