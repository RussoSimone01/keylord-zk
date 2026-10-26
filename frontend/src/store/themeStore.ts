import { create } from "zustand";

// Every theme is either dark or light; its id is the CSS data-theme value.
export const THEMES = [
  { id: "terminal", name: "Terminal", scheme: "dark" },
  { id: "midnight", name: "Midnight", scheme: "dark" },
  { id: "amber", name: "Amber", scheme: "dark" },
  { id: "violet", name: "Violet", scheme: "dark" },
  { id: "paper", name: "Paper", scheme: "light" },
  { id: "daylight", name: "Daylight", scheme: "light" },
] as const;

export type Theme = (typeof THEMES)[number]["id"];
// "system" follows the operating system's light/dark setting and changes with it
export type ThemeChoice = Theme | "system";

// Themes used by "system": the default theme and its light counterpart
export const SYSTEM_THEMES = { dark: "terminal", light: "paper" } as const;

const KEY = "theme";
// Keys of the version where palette and mode were chosen separately
const PALETTE_KEY = "themePalette";
const MODE_KEY = "themeMode";

// Palette + light mode of that version: the light palettes without a light theme of their own get the closest one
const LIGHT_OF: Record<string, Theme> = {
  terminal: "paper",
  midnight: "daylight",
  amber: "paper",
  violet: "daylight",
};

// Values saved under KEY by the first versions
const LEGACY: Record<string, ThemeChoice> = {
  dark: "terminal",
  light: "paper",
};

const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

function isChoice(value: string | null): value is ThemeChoice {
  return value === "system" || THEMES.some((t) => t.id === value);
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this session.
  }
}

function remove(...keys: string[]) {
  try {
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clean up when storage is unavailable
  }
}

// Turns a palette + mode pair into a single theme: dark is the palette itself, Automatic stays Automatic
function fromPaletteAndMode(palette: string | null, mode: string | null) {
  if (palette === null && mode === null) {
    return null;
  }
  if (mode === "light") {
    return LIGHT_OF[palette ?? ""] ?? "paper";
  }
  if (mode === "dark" && isChoice(palette)) {
    return palette;
  }
  return "system";
}

// Saved theme, else a choice saved by an earlier version (converted and saved again), else Automatic.
function readInitial(): ThemeChoice {
  const saved = read(KEY);
  if (isChoice(saved)) {
    return saved;
  }
  const migrated =
    fromPaletteAndMode(read(PALETTE_KEY), read(MODE_KEY)) ??
    LEGACY[saved ?? ""] ??
    null;
  remove(PALETTE_KEY, MODE_KEY);
  if (migrated === null) {
    return "system";
  }
  write(KEY, migrated);
  return migrated;
}

function systemTheme(): Theme {
  // Dark when the preference cannot be read, as before
  return darkQuery == null || darkQuery.matches
    ? SYSTEM_THEMES.dark
    : SYSTEM_THEMES.light;
}

function resolve(choice: ThemeChoice): Theme {
  return choice === "system" ? systemTheme() : choice;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeStore {
  choice: ThemeChoice;
  // The theme actually shown: equals choice, or the system's when choice is "system"
  theme: Theme;
  setChoice: (choice: ThemeChoice) => void;
}

const initial = readInitial();
const initialTheme = resolve(initial);
applyTheme(initialTheme);

export const useThemeStore = create<ThemeStore>((set) => ({
  choice: initial,
  theme: initialTheme,
  setChoice: (choice) => {
    const theme = resolve(choice);
    write(KEY, choice);
    applyTheme(theme);
    set({ choice, theme });
  },
}));

// With "system" the theme follows the OS live, e.g. when it switches to dark in the evening.
darkQuery?.addEventListener("change", () => {
  if (useThemeStore.getState().choice !== "system") {
    return;
  }
  const theme = systemTheme();
  applyTheme(theme);
  useThemeStore.setState({ theme });
});
