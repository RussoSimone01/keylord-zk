import { clamp } from "./lockSettings";

const KEY = "clipboardClearMs";

export const CLIPBOARD_CLEAR_DEFAULT_MS = 30_000;
// Stored in localStorage, so clamped: tampering cannot leave a secret on the clipboard indefinitely
export const CLIPBOARD_CLEAR_RANGE = { min: 10_000, max: 2 * 60_000 };

// How long a copied value stays on the clipboard before it is overwritten
export function getClipboardClearMs(): number {
  try {
    return clamp(
      Number(localStorage.getItem(KEY) ?? NaN),
      CLIPBOARD_CLEAR_RANGE,
      CLIPBOARD_CLEAR_DEFAULT_MS,
    );
  } catch {
    return CLIPBOARD_CLEAR_DEFAULT_MS;
  }
}

export function saveClipboardClearMs(ms: number) {
  try {
    localStorage.setItem(KEY, String(ms));
  } catch {
    // Storage unavailable (private mode): the default keeps applying
  }
}
