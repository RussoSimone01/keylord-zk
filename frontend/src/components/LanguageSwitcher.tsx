import { useTranslation } from "react-i18next";
import { LOCALES, useLocaleStore } from "../store/localeStore";
import "./LanguageSwitcher.css";

// Radio group of languages for Settings. Each name is written in its own language and tagged
// with lang, so screen readers pronounce it correctly whatever the interface language is.
function LanguageSwitcher() {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <div
      className="language-switcher"
      role="radiogroup"
      aria-label={t("language.label")}
    >
      {LOCALES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === locale}
          className={
            item.id === locale ? "language-option active" : "language-option"
          }
          onClick={() => setLocale(item.id)}
        >
          <span lang={item.id}>{item.name}</span>
          <span className="language-code">{item.id}</span>
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
