import { create } from "zustand";

// Each palette has a dark and a light variant; the CSS theme id is "<palette>-<mode>".
export const PALETTES = [
  { id: "terminal", name: "Terminal" },
  { id: "midnight", name: "Midnight" },
  { id: "amber", name: "Amber" },
  { id: "violet", name: "Violet" },
] as const;

// "system" follows the operating system's light/dark setting and changes with it.
export const MODES = ["light", "dark", "system"] as const;

export type Palette = (typeof PALETTES)[number]["id"];
export type Mode = (typeof MODES)[number];
export type ResolvedMode = "light" | "dark";

const PALETTE_KEY = "themePalette";
const MODE_KEY = "themeMode";
// Single key used before palette and mode were separate.
const LEGACY_KEY = "theme";

// Themes saved by earlier versions, mapped to palette and mode.
const LEGACY: Record<string, [Palette, ResolvedMode]> = {
  terminal: ["terminal", "dark"],
  paper: ["terminal", "light"],
  amber: ["amber", "dark"],
  violet: ["violet", "dark"],
  midnight: ["midnight", "dark"],
  daylight: ["midnight", "light"],
  dark: ["terminal", "dark"],
  light: ["terminal", "light"],
};

const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

export function themeId(palette: Palette, mode: ResolvedMode): string {
  return `${palette}-${mode}`;
}

function isPalette(value: string | null): value is Palette {
  return PALETTES.some((p) => p.id === value);
}

function isMode(value: string | null): value is Mode {
  return MODES.some((m) => m === value);
}

function systemMode(): ResolvedMode {
  // Dark when the preference cannot be read, as before
  return darkQuery == null || darkQuery.matches ? "dark" : "light";
}

function resolve(mode: Mode): ResolvedMode {
  return mode === "system" ? systemMode() : mode;
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

// Saved palette and mode first, then a theme saved by an earlier version, then Terminal following the system.
function readInitial(): { palette: Palette; mode: Mode } {
  const palette = read(PALETTE_KEY);
  const mode = read(MODE_KEY);
  if (isPalette(palette) && isMode(mode)) {
    return { palette, mode };
  }
  const legacy = LEGACY[read(LEGACY_KEY) ?? ""];
  if (legacy) {
    const [legacyPalette, legacyMode] = legacy;
    write(PALETTE_KEY, legacyPalette);
    write(MODE_KEY, legacyMode);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Nothing to clean up when storage is unavailable
    }
    return { palette: legacyPalette, mode: legacyMode };
  }
  return {
    palette: isPalette(palette) ? palette : "terminal",
    mode: isMode(mode) ? mode : "system",
  };
}

function applyTheme(palette: Palette, resolvedMode: ResolvedMode) {
  document.documentElement.setAttribute(
    "data-theme",
    themeId(palette, resolvedMode),
  );
}

interface ThemeStore {
  palette: Palette;
  mode: Mode;
  // The mode actually shown: equals mode, or the system's when mode is "system"
  resolvedMode: ResolvedMode;
  setPalette: (palette: Palette) => void;
  setMode: (mode: Mode) => void;
}

const initial = readInitial();
const initialResolved = resolve(initial.mode);
applyTheme(initial.palette, initialResolved);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  palette: initial.palette,
  mode: initial.mode,
  resolvedMode: initialResolved,
  setPalette: (palette) => {
    write(PALETTE_KEY, palette);
    applyTheme(palette, get().resolvedMode);
    set({ palette });
  },
  setMode: (mode) => {
    const resolvedMode = resolve(mode);
    write(MODE_KEY, mode);
    applyTheme(get().palette, resolvedMode);
    set({ mode, resolvedMode });
  },
}));

// In "system" mode the theme follows the OS live, e.g. when it switches to dark in the evening.
darkQuery?.addEventListener("change", () => {
  const { palette, mode } = useThemeStore.getState();
  if (mode !== "system") {
    return;
  }
  const resolvedMode = systemMode();
  applyTheme(palette, resolvedMode);
  useThemeStore.setState({ resolvedMode });
});
