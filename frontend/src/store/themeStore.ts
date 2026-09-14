import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeStore {
	theme: Theme;
	toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute("data-theme", theme);
}

const initialTheme = (localStorage.getItem("theme") as Theme) ?? "dark";
applyTheme(initialTheme);

export const useThemeStore = create<ThemeStore>((set) => ({
	theme: initialTheme,
	toggleTheme: () => {
		set((state) => {
			const next = state.theme == "dark" ? "light" : "dark";
			localStorage.setItem("theme", next);
			applyTheme(next);
			return { theme: next };
		});
	},
}));
