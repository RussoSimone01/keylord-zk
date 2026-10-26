import { SYSTEM_THEMES, type ThemeChoice } from "../store/themeStore";
import "./ThemeSwatch.css";

interface ThemeSwatchProps {
  choice: ThemeChoice;
}

// Two concentric circles drawn in the theme's own colors: background outside, accent inside.
// Each circle sets its own data-theme, so it shows that theme whatever the page uses.
// Automatic is split in half: its dark theme on the left, its light theme on the right.
function ThemeSwatch({ choice }: ThemeSwatchProps) {
  if (choice !== "system") {
    return (
      <span className="theme-swatch" aria-hidden="true">
        <span className="theme-swatch-disc" data-theme={choice}>
          <span />
        </span>
      </span>
    );
  }
  return (
    <span className="theme-swatch split" aria-hidden="true">
      <span className="theme-swatch-disc" data-theme={SYSTEM_THEMES.dark}>
        <span />
      </span>
      <span className="theme-swatch-disc" data-theme={SYSTEM_THEMES.light}>
        <span />
      </span>
    </span>
  );
}

export default ThemeSwatch;
