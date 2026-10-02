import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import "./SearchField.css";
import { useTranslation } from "react-i18next";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  count?: number;
}

// Search box focused by the "/" key from anywhere on the page, cleared with Escape.
function SearchField({
  value,
  onChange,
  placeholder,
  count,
}: SearchFieldProps) {
  const { t } = useTranslation();
  const label = placeholder ?? t("search.placeholder");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="search-field">
      <Search size={16} className="search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={label}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
          }
        }}
      />
      {value !== "" && count != null && (
        <span className="search-count">{count}</span>
      )}
      {value !== "" ? (
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange("")}
          title={t("search.clear")}
          aria-label={t("search.clear")}
        >
          <X size={14} />
        </button>
      ) : (
        <kbd>/</kbd>
      )}
    </div>
  );
}

export default SearchField;
