import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import it from "./locales/it.json";
import { readInitialLocale } from "../store/localeStore";

// Every locale is bundled: the files are small and switching never waits on the network.
// English is the fallback for any key missing from another language.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  lng: readInitialLocale(),
  fallbackLng: "en",
  interpolation: {
    // React already escapes rendered values
    escapeValue: false,
  },
});

export default i18n;
