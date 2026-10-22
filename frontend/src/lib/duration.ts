import type { TFunction } from "i18next";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Largest whole unit that fits: "1 hour", "5 minutes", "30 seconds"
export function formatDuration(t: TFunction, ms: number): string {
  if (ms >= HOUR && ms % HOUR === 0) {
    return t("duration.hours", { count: ms / HOUR });
  }
  if (ms >= MINUTE && ms % MINUTE === 0) {
    return t("duration.minutes", { count: ms / MINUTE });
  }
  return t("duration.seconds", { count: Math.round(ms / 1000) });
}
