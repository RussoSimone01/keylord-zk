import { create } from "zustand";

export const THEMES = [
	{ id: "terminal", name: "Terminal", mode: "dark" },
	{ id: "paper", name: "Paper", mode: "light" },
	{ id: "amber", name: "Amber", mode: "dark" },
	{ id: "midnight", name: "Midnight", mode: "dark" },
	{ id: "daylight", name: "Daylight", mode: "light" },
] as const;

export type Theme = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "theme";

// Values saved by the previous two-theme toggle, mapped to their new equivalents.
const LEGACY: Record<string, Theme> = { dark: "terminal", light: "paper" };

function isTheme(value: string | null): value is Theme {
	return THEMES.some((t) => t.id === value);
}

// Stored choice first, then the OS light/dark preference, then Terminal.
function readInitialTheme(): Theme {
	let stored: string | null = null;
	try {
		stored = localStorage.getItem(STORAGE_KEY);
	} catch {
		stored = null;
	}
	if (isTheme(stored)) {
		return stored;
	}
	if (stored != null && stored in LEGACY) {
		return LEGACY[stored];
	}
	if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
		return "paper";
	}
	return "terminal";
}

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute("data-theme", theme);
}

function persistTheme(theme: Theme) {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Storage can be unavailable (private mode); the theme still applies for this session.
	}
}

interface ThemeStore {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const initialTheme = readInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeStore>((set, get) => ({
	theme: initialTheme,
	setTheme: (theme) => {
		applyTheme(theme);
		persistTheme(theme);
		set({ theme });
	},
	// Cycles through THEMES in order.
	toggleTheme: () => {
		const index = THEMES.findIndex((t) => t.id === get().theme);
		get().setTheme(THEMES[(index + 1) % THEMES.length].id);
	},
}));
