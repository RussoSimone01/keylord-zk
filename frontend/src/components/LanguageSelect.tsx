import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { LOCALES, useLocaleStore, type Locale } from "../store/localeStore";
import "./LanguageSwitcher.css";

// Compact language picker for the login and sign-up screens, where people are not logged in yet.
// A native <select> keeps keyboard, screen reader and mobile pickers working without extra code.
function LanguageSelect() {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const id = useId();

  return (
    <div className="language-select">
      <label htmlFor={id} title={t("language.label")}>
        <Languages size={16} aria-hidden="true" />
        <span className="sr-only">{t("language.label")}</span>
      </label>
      <select
        id={id}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((item) => (
          <option key={item.id} value={item.id} lang={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelect;
