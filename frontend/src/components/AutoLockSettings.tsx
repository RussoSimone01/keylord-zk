import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HIDDEN_RANGE,
  getLockSettings,
  saveLockSettings,
  type LockSettings,
} from "../lib/lockSettings";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const INACTIVITY_OPTIONS = [1, 5, 15, 30, 60].map((m) => m * MINUTE);
const HIDDEN_OPTIONS = [0, 1, 5, 15, 30].map((m) => m * MINUTE);
// "Only after inactivity" is stored as the longest hidden time: it never fires before the inactivity limit
const ONLY_INACTIVITY = "inactivity";

// Keeps a value saved outside the presets (e.g. by an earlier version) selectable
function withCurrent(options: number[], current: number) {
  return options.includes(current)
    ? options
    : [...options, current].sort((a, b) => a - b);
}

// Auto-lock timings for Settings → Security. Changes apply at once: useAutoLock reads them on every check.
function AutoLockSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(getLockSettings);
  const inactivityId = useId();
  const hiddenId = useId();
  const hintId = useId();

  function update(next: LockSettings) {
    saveLockSettings(next);
    setSettings(next);
  }

  function duration(ms: number) {
    if (ms % HOUR === 0) return t("autoLock.hours", { count: ms / HOUR });
    if (ms % MINUTE === 0) return t("autoLock.minutes", { count: ms / MINUTE });
    return t("autoLock.seconds", { count: Math.round(ms / 1000) });
  }

  // A hidden time not shorter than the inactivity limit has no effect of its own
  const onlyInactivity = settings.hiddenMs >= settings.inactivityMs;
  const hiddenOptions = (
    onlyInactivity
      ? HIDDEN_OPTIONS
      : withCurrent(HIDDEN_OPTIONS, settings.hiddenMs)
  ).filter((ms) => ms < settings.inactivityMs);

  return (
    <>
      <div className="settings-field">
        <label htmlFor={inactivityId} className="settings-field-label">
          {t("autoLock.inactivity")}
        </label>
        <select
          id={inactivityId}
          className="settings-select"
          aria-describedby={hintId}
          value={settings.inactivityMs}
          onChange={(e) =>
            update({ ...settings, inactivityMs: Number(e.target.value) })
          }
        >
          {withCurrent(INACTIVITY_OPTIONS, settings.inactivityMs).map((ms) => (
            <option key={ms} value={ms}>
              {duration(ms)}
            </option>
          ))}
        </select>
      </div>
      <div className="settings-field">
        <label htmlFor={hiddenId} className="settings-field-label">
          {t("autoLock.hidden")}
        </label>
        <select
          id={hiddenId}
          className="settings-select"
          aria-describedby={hintId}
          value={onlyInactivity ? ONLY_INACTIVITY : settings.hiddenMs}
          onChange={(e) =>
            update({
              ...settings,
              hiddenMs:
                e.target.value === ONLY_INACTIVITY
                  ? HIDDEN_RANGE.max
                  : Number(e.target.value),
            })
          }
        >
          {hiddenOptions.map((ms) => (
            <option key={ms} value={ms}>
              {ms === 0
                ? t("autoLock.immediately")
                : t("autoLock.after", { time: duration(ms) })}
            </option>
          ))}
          <option value={ONLY_INACTIVITY}>
            {t("autoLock.onlyInactivity")}
          </option>
        </select>
      </div>
      <p id={hintId} className="settings-hint">
        {t("autoLock.hint")}
      </p>
    </>
  );
}

export default AutoLockSettings;
