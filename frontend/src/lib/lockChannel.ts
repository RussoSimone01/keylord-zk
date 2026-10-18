import { useAuthStore } from "../store/authStore";

const CHANNEL_NAME = "keylord-lock";
const LOCK_MESSAGE = "lock";

// One channel for the whole app: it does not deliver a message to the object that sent it
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

// Locks this tab and asks every other tab of the app to do the same
export function lockAllTabs() {
  useAuthStore.getState().lock();
  channel?.postMessage(LOCK_MESSAGE);
}

// Runs onLock when another tab asks for a lock. Only this exact message is accepted,
// and it can only lock: nothing received here can unlock or carry data
export function onRemoteLock(onLock: () => void) {
  if (!channel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data === LOCK_MESSAGE) onLock();
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
