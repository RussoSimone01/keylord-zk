import { create } from "zustand";
import i18n from "i18next";

// Each language is listed by its own name (endonym) so people can find theirs whatever the current language is.
export const LOCALES = [
  { id: "en", name: "English" },
  { id: "it", name: "Italiano" },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];

const STORAGE_KEY = "locale";

function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((l) => l.id === value);
}

// Stored choice first, then the first browser language we support (matching "it-IT" to "it"), then English.
export function readInitialLocale(): Locale {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (isLocale(stored)) {
    return stored;
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) {
      return base;
    }
  }
  return "en";
}

function applyLocale(locale: Locale) {
  document.documentElement.setAttribute("lang", locale);
}

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the language still applies for this session.
  }
}

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const initialLocale = readInitialLocale();
applyLocale(initialLocale);

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    applyLocale(locale);
    persistLocale(locale);
    void i18n.changeLanguage(locale);
    set({ locale });
  },
}));
