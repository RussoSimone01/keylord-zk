import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getClipboardClearMs,
  saveClipboardClearMs,
} from "../lib/clipboardSettings";
import { formatDuration } from "../lib/duration";

const OPTIONS = [10_000, 20_000, 30_000, 60_000, 120_000];

// Clipboard clearing delay for Settings → Security. Applies from the next copy.
function ClipboardSettings() {
  const { t } = useTranslation();
  const [clearMs, setClearMs] = useState(getClipboardClearMs);
  const selectId = useId();
  const hintId = useId();
  // Keeps a value saved outside the presets selectable
  const options = OPTIONS.includes(clearMs)
    ? OPTIONS
    : [...OPTIONS, clearMs].sort((a, b) => a - b);

  function update(ms: number) {
    saveClipboardClearMs(ms);
    setClearMs(ms);
  }

  return (
    <>
      <div className="settings-field">
        <label htmlFor={selectId} className="settings-field-label">
          {t("clipboardSettings.label")}
        </label>
        <select
          id={selectId}
          className="settings-select"
          aria-describedby={hintId}
          value={clearMs}
          onChange={(e) => update(Number(e.target.value))}
        >
          {options.map((ms) => (
            <option key={ms} value={ms}>
              {formatDuration(t, ms)}
            </option>
          ))}
        </select>
      </div>
      <p id={hintId} className="settings-hint">
        {t("clipboardSettings.hint")}
      </p>
    </>
  );
}

export default ClipboardSettings;
