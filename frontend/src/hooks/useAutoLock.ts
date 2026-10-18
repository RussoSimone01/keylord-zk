import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { getLockSettings } from "../lib/lockSettings";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
] as const;
const CHECK_INTERVAL_MS = 5_000;

// Locks the vault after inactivity or after the tab stayed hidden too long. Active only while unlocked.
export function useAutoLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let lastActivity = Date.now();
    let hiddenAt: number | null = null;

    const lock = () => useAuthStore.getState().lock();
    const onActivity = () => {
      lastActivity = Date.now();
    };

    // Timestamp comparison, not a long timeout: background tabs get their timers throttled
    function check() {
      if (Date.now() - lastActivity >= getLockSettings().inactivityMs) lock();
    }

    function onVisibilityChange() {
      const { hiddenMs } = getLockSettings();
      if (document.hidden) {
        hiddenAt = Date.now();
        if (hiddenMs === 0) lock();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= hiddenMs) {
        lock();
        return;
      }
      hiddenAt = null;
      check();
    }

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [enabled]);
}
