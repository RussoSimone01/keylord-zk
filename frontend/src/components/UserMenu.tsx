import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, Lock, LogOut } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { lockAllTabs } from "../lib/lockChannel";
import { endSession } from "../lib/session";
import "./UserMenu.css";

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
const LOCK_SHORTCUT = IS_MAC ? "⌥⇧L" : "Alt+Shift+L";

// Alt+Shift+L (Option+Shift+L on a Mac) locks from anywhere. e.code is used because Option changes e.key on a Mac.
function isLockShortcut(e: globalThis.KeyboardEvent) {
  return (
    e.code === "KeyL" && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey
  );
}

// Account button in the navbar: shows who is signed in and opens a menu with Lock and Log out.
// Same interaction as ThemeMenu: arrows move between items, Escape returns focus to the trigger,
// Tab or a click outside closes it.
function UserMenu() {
  const { t } = useTranslation();
  const username = useAuthStore((state) => state.username);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const initial = username.charAt(0).toUpperCase() || "?";

  // The shortcut works while the vault is open, i.e. while the navbar is mounted.
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (isLockShortcut(e)) {
        e.preventDefault();
        lockAllTabs();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // On open, focus moves to the first item.
  useEffect(() => {
    if (open) {
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  function handleLock() {
    setOpen(false);
    lockAllTabs();
  }

  function handleLogout() {
    setOpen(false);
    endSession();
    navigate("/login");
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter(
      (el): el is HTMLButtonElement => el !== null,
    );
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
      items[next].focus();
    }
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("userMenu.label", { username })}
        title={t("userMenu.label", { username })}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="user-menu-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu-name">{username}</span>
        <ChevronDown
          size={14}
          className="user-menu-chevron"
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={menuId}
          className="user-menu-list"
          role="menu"
          aria-label={t("userMenu.label", { username })}
          onKeyDown={handleMenuKeyDown}
        >
          <div className="user-menu-identity" aria-hidden="true">
            <span className="user-menu-identity-label">
              {t("userMenu.signedInAs")}
            </span>
            <span className="user-menu-identity-name">{username}</span>
          </div>
          <button
            ref={(el) => {
              itemRefs.current[0] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="user-menu-item"
            aria-keyshortcuts="Alt+Shift+L"
            onClick={handleLock}
          >
            <Lock
              size={16}
              className="user-menu-item-icon"
              aria-hidden="true"
            />
            <span className="user-menu-item-text">
              <span className="user-menu-item-row">
                <span className="user-menu-item-title">
                  {t("nav.lockVault")}
                </span>
                <kbd className="user-menu-kbd">{LOCK_SHORTCUT}</kbd>
              </span>
              <span className="user-menu-item-hint">
                {t("userMenu.lockHint")}
              </span>
            </span>
          </button>
          <div className="user-menu-separator" role="separator" />
          <button
            ref={(el) => {
              itemRefs.current[1] = el;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="user-menu-item"
            onClick={handleLogout}
          >
            <LogOut
              size={16}
              className="user-menu-item-icon"
              aria-hidden="true"
            />
            <span className="user-menu-item-text">
              <span className="user-menu-item-title">{t("nav.logout")}</span>
              <span className="user-menu-item-hint">
                {t("userMenu.logoutHint")}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
