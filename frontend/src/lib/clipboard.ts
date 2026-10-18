import { useAuthStore } from "../store/authStore";

const CLEAR_DELAY_MS = 5_000;

let timer: number | undefined;
// True while the clipboard may still hold something copied from the app
let pending = false;
// When the clipboard should be cleared; 0 after a refused attempt, so the next focus retries
let clearAt = 0;

async function clear() {
  try {
    await navigator.clipboard.writeText("");
    pending = false;
  } catch {
    // Usually the document has no focus and writeText is refused: retry when it gets it back
    clearAt = 0;
  }
}

export async function copyWithAutoClear(value: string) {
  await navigator.clipboard.writeText(value);
  pending = true;
  clearAt = Date.now() + CLEAR_DELAY_MS;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void clear(), CLEAR_DELAY_MS);
}

function retryIfDue() {
  if (pending && Date.now() >= clearAt) void clear();
}

window.addEventListener("focus", retryIfDue);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) retryIfDue();
});

// Locking or logging out drops the key: clean the clipboard right away, without waiting for the timer
useAuthStore.subscribe((state, prev) => {
  if (prev.encryptionKey && !state.encryptionKey && pending) {
    window.clearTimeout(timer);
    void clear();
  }
});
