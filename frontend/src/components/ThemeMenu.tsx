import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { THEMES, useThemeStore, type ThemeChoice } from "../store/themeStore";
import ThemeSwatch from "./ThemeSwatch";
import "./ThemeMenu.css";
import { useTranslation } from "react-i18next";

// Shows only the current theme; clicking opens a menu with Automatic, then the dark and the light themes.
// Choosing a theme closes the menu and returns focus to the trigger; Escape, Tab or a click outside close it too.
interface ThemeMenuProps {
  // "above" opens the list upwards, for controls near the bottom of the page (login and sign-up).
  placement?: "below" | "above";
}

const DARK = THEMES.filter((item) => item.scheme === "dark");
const LIGHT = THEMES.filter((item) => item.scheme === "light");
// Menu order, used for focus and arrow keys
const ORDER: ThemeChoice[] = [
  "system",
  ...DARK.map((item) => item.id),
  ...LIGHT.map((item) => item.id),
];

function ThemeMenu({ placement = "below" }: ThemeMenuProps) {
  const { t } = useTranslation();
  const choice = useThemeStore((state) => state.choice);
  const theme = useThemeStore((state) => state.theme);
  const setChoice = useThemeStore((state) => state.setChoice);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const darkLabelId = useId();
  const lightLabelId = useId();

  const nameOf = (id: ThemeChoice) =>
    id === "system"
      ? t("theme.system")
      : (THEMES.find((item) => item.id === id)?.name ?? id);
  // Automatic also names the theme it is showing now
  const current =
    choice === "system"
      ? t("theme.currentSystem", { name: nameOf(theme) })
      : t("theme.current", { name: nameOf(choice) });

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
      const checked = useThemeStore.getState().choice;
      itemRefs.current[ORDER.indexOf(checked)]?.focus();
    }
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function choose(id: ThemeChoice) {
    setChoice(id);
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
    const currentIndex = items.findIndex((el) => el === document.activeElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (currentIndex + 1) % items.length;
    else if (e.key === "ArrowUp")
      next = (currentIndex - 1 + items.length) % items.length;
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

  function item(id: ThemeChoice) {
    return (
      <button
        key={id}
        ref={(el) => {
          itemRefs.current[ORDER.indexOf(id)] = el;
        }}
        type="button"
        role="menuitemradio"
        aria-checked={id === choice}
        tabIndex={-1}
        className="theme-menu-item"
        onClick={() => choose(id)}
      >
        <ThemeSwatch choice={id} />
        <span className="theme-menu-item-name">{nameOf(id)}</span>
        {id === choice && (
          <Check size={14} className="theme-menu-check" aria-hidden="true" />
        )}
      </button>
    );
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
        aria-label={current}
        title={current}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <ThemeSwatch choice={choice} />
        <span className="theme-menu-name">{nameOf(choice)}</span>
        <ChevronDown
          size={14}
          className="theme-menu-chevron"
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={menuId}
          className={
            placement === "above" ? "theme-menu-list above" : "theme-menu-list"
          }
          role="menu"
          aria-label={t("theme.label")}
          onKeyDown={handleMenuKeyDown}
        >
          {item("system")}
          <div className="theme-menu-separator" role="separator" />
          <div role="group" aria-labelledby={darkLabelId}>
            <div id={darkLabelId} className="theme-menu-group-label">
              {t("theme.dark")}
            </div>
            {DARK.map((entry) => item(entry.id))}
          </div>
          <div role="group" aria-labelledby={lightLabelId}>
            <div id={lightLabelId} className="theme-menu-group-label">
              {t("theme.light")}
            </div>
            {LIGHT.map((entry) => item(entry.id))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeMenu;
