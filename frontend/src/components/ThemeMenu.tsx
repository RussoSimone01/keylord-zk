import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MODES, PALETTES, themeId, useThemeStore } from "../store/themeStore";
import ModeIcon from "./ModeIcon";
import "./ThemeSwitcher.css";
import "./ThemeMenu.css";
import { useTranslation } from "react-i18next";

// Shows only the active palette and mode; clicking opens a menu with two groups, Color and Mode.
// The menu stays open after a choice so both can be set in one go; Escape, Tab or a click outside closes it.
// Each swatch sets its own data-theme so it is drawn in that palette's colors (styles in ThemeSwitcher.css).
interface ThemeMenuProps {
  // "above" opens the list upwards, for controls near the bottom of the page (login and sign-up).
  placement?: "below" | "above";
}

function ThemeMenu({ placement = "below" }: ThemeMenuProps) {
  const { t } = useTranslation();
  const palette = useThemeStore((state) => state.palette);
  const mode = useThemeStore((state) => state.mode);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const setPalette = useThemeStore((state) => state.setPalette);
  const setMode = useThemeStore((state) => state.setMode);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Palette items first, then mode items: arrow keys move through both groups as one list
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const colorLabelId = useId();
  const modeLabelId = useId();
  const active = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  const current = t("theme.current", {
    name: active.name,
    mode: t(`theme.modes.${mode}`),
  });

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

  // On open, focus moves to the checked palette so arrow keys start from there.
  useEffect(() => {
    if (open) {
      const currentPalette = useThemeStore.getState().palette;
      itemRefs.current[
        PALETTES.findIndex((p) => p.id === currentPalette)
      ]?.focus();
    }
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
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
        <span
          className="theme-swatch"
          data-theme={themeId(palette, resolvedMode)}
          aria-hidden="true"
        >
          <span />
        </span>
        <span className="theme-menu-name">{active.name}</span>
        <span className="theme-menu-mode-icon">
          <ModeIcon mode={mode} size={14} />
        </span>
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
          <div role="group" aria-labelledby={colorLabelId}>
            <div id={colorLabelId} className="theme-menu-group-label">
              {t("theme.color")}
            </div>
            {PALETTES.map((item, i) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={item.id === palette}
                tabIndex={-1}
                className="theme-menu-item"
                onClick={() => setPalette(item.id)}
              >
                <span
                  className="theme-swatch"
                  data-theme={themeId(item.id, resolvedMode)}
                  aria-hidden="true"
                >
                  <span />
                </span>
                <span className="theme-menu-item-name">{item.name}</span>
                {item.id === palette && (
                  <Check
                    size={14}
                    className="theme-menu-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="theme-menu-separator" role="separator" />
          <div role="group" aria-labelledby={modeLabelId}>
            <div id={modeLabelId} className="theme-menu-group-label">
              {t("theme.modeLabel")}
            </div>
            {MODES.map((item, i) => (
              <button
                key={item}
                ref={(el) => {
                  itemRefs.current[PALETTES.length + i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={item === mode}
                tabIndex={-1}
                className="theme-menu-item"
                onClick={() => setMode(item)}
              >
                <span className="theme-menu-item-icon">
                  <ModeIcon mode={item} />
                </span>
                <span className="theme-menu-item-name">
                  {t(`theme.modes.${item}`)}
                </span>
                {item === mode && (
                  <Check
                    size={14}
                    className="theme-menu-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeMenu;
