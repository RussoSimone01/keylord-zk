import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { THEMES, useThemeStore, type Theme } from "../store/themeStore";
import "./ThemeSwitcher.css";
import "./ThemeMenu.css";
import { useTranslation } from "react-i18next";

// Shows only the active theme; clicking opens a menu with every theme.
// Each swatch sets its own data-theme so it is drawn in that theme's colors (styles in ThemeSwitcher.css).
function ThemeMenu() {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const active = THEMES.find((x) => x.id === theme) ?? THEMES[0];

  // While open: a click outside closes the menu without moving focus.
  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // On open, focus moves to the checked item so arrow keys start from there.
  useEffect(() => {
    if (open) {
      const current = useThemeStore.getState().theme;
      itemRefs.current[THEMES.findIndex((x) => x.id === current)]?.focus();
    }
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function select(id: Theme) {
    setTheme(id);
    close(true);
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  // Roving focus inside the menu: arrows wrap, Home/End jump, Escape and Tab close.
  function handleMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current;
    const current = items.findIndex((el) => el === document.activeElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (current + 1) % items.length;
    else if (e.key === "ArrowUp")
      next = (current - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    } else if (e.key === "Tab") {
      close(false);
      return;
    }
    if (next >= 0) {
      e.preventDefault();
      items[next]?.focus();
    }
  }

  return (
    <div className="theme-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="theme-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("theme.current", { name: active.name })}
        title={t("theme.current", { name: active.name })}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className="theme-swatch"
          data-theme={active.id}
          aria-hidden="true"
        >
          <span />
        </span>
        <span className="theme-menu-name">{active.name}</span>
        <ChevronDown
          size={14}
          className="theme-menu-chevron"
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={menuId}
          className="theme-menu-list"
          role="menu"
          aria-label={t("theme.label")}
          onKeyDown={handleMenuKeyDown}
        >
          {THEMES.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={item.id === theme}
              tabIndex={-1}
              className="theme-menu-item"
              onClick={() => select(item.id)}
            >
              <span
                className="theme-swatch"
                data-theme={item.id}
                aria-hidden="true"
              >
                <span />
              </span>
              <span className="theme-menu-item-name">{item.name}</span>
              <span className="theme-menu-item-mode">
                {t("theme.mode." + item.mode)}
              </span>
              {item.id === theme && (
                <Check
                  size={14}
                  className="theme-menu-check"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeMenu;
