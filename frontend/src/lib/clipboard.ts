import i18n from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { getClipboardClearMs } from "./clipboardSettings";
import { formatDuration } from "./duration";

let timer: number | undefined;
// True while the clipboard may still hold something copied from the app
let pending = false;
// When the clipboard should be cleared; 0 after a refused attempt, so the next focus retries
let clearAt = 0;
// The "copied" toast with the countdown, replaced by "cleared" once the clipboard is empty
let copyToastId: number | null = null;

async function clear(silent = false) {
  try {
    await navigator.clipboard.writeText("");
    pending = false;
    const toasts = useToastStore.getState();
    if (!silent && copyToastId !== null && toasts.toast?.id === copyToastId) {
      toasts.show({
        tone: "info",
        message: i18n.t("clipboard.cleared"),
        duration: 2500,
      });
    }
    copyToastId = null;
  } catch {
    // Usually the document has no focus and writeText is refused: retry when it gets it back
    clearAt = 0;
  }
}

// Copies value and schedules the clipboard to be emptied. Reports the outcome with a toast
// and returns false when the browser refuses the copy (no permission, insecure context).
export async function copyWithAutoClear(value: string): Promise<boolean> {
  const toasts = useToastStore.getState();
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    copyToastId = null;
    toasts.show({
      tone: "danger",
      message: i18n.t("clipboard.failed"),
      duration: 6000,
    });
    return false;
  }
  // Read at every copy, so a change in Settings applies from the next one
  const delay = getClipboardClearMs();
  pending = true;
  clearAt = Date.now() + delay;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void clear(), delay);
  copyToastId = toasts.show({
    tone: "success",
    message: i18n.t("clipboard.copied"),
    announce: i18n.t("clipboard.announce", {
      time: formatDuration(i18n.t, delay),
    }),
    countdown: { until: clearAt, key: "clipboard.clearsIn" },
  });
  return true;
}

function retryIfDue() {
  if (pending && Date.now() >= clearAt) void clear();
}

window.addEventListener("focus", retryIfDue);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) retryIfDue();
});

// Locking or logging out drops the key: clean the clipboard right away, without waiting for the timer.
// Silent, because the toasts of the unlocked session are already gone.
useAuthStore.subscribe((state, prev) => {
  if (prev.encryptionKey && !state.encryptionKey && pending) {
    window.clearTimeout(timer);
    void clear(true);
  }
});
