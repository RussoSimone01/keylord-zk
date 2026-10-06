import { Moon, Sun, SunMoon } from "lucide-react";
import type { Mode } from "../store/themeStore";

interface ModeIconProps {
  mode: Mode;
  size?: number;
}

// Sun for light, moon for dark, sun-moon for following the system.
function ModeIcon({ mode, size = 16 }: ModeIconProps) {
  if (mode === "light") {
    return <Sun size={size} aria-hidden="true" />;
  }
  if (mode === "dark") {
    return <Moon size={size} aria-hidden="true" />;
  }
  return <SunMoon size={size} aria-hidden="true" />;
}

export default ModeIcon;
