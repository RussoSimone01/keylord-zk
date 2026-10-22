const KEY = "lockSettings";

export interface LockSettings {
  inactivityMs: number;
  hiddenMs: number;
}

const DEFAULTS: LockSettings = { inactivityMs: 5 * 60_000, hiddenMs: 60_000 };
// The settings live in localStorage, so they are clamped: tampering cannot switch the lock off
const INACTIVITY_RANGE = { min: 5_000, max: 60 * 60_000 };
export const HIDDEN_RANGE = { min: 0, max: 60 * 60_000 };

export function clamp(
  value: unknown,
  range: { min: number; max: number },
  fallback: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(range.max, Math.max(range.min, value))
    : fallback;
}

export function getLockSettings(): LockSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      inactivityMs: clamp(
        parsed.inactivityMs,
        INACTIVITY_RANGE,
        DEFAULTS.inactivityMs,
      ),
      hiddenMs: clamp(parsed.hiddenMs, HIDDEN_RANGE, DEFAULTS.hiddenMs),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveLockSettings(settings: LockSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode): the defaults keep applying
  }
}
