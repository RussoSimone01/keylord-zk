import { useEffect, useState } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToastStore, type ToastTone } from "../store/toastStore";
import "./Toaster.css";

const TONE_ICON: Record<ToastTone, typeof Info> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  danger: TriangleAlert,
};

// Seconds left until `until`, refreshed every second. Mounted per toast, so it starts from the right time.
function Countdown({ until, label }: { until: number; label: string }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return <span className="toast-countdown">{t(label, { seconds })}</span>;
}

// Shows the current toast above the content. Rendered only while the vault is unlocked:
// unmounting on lock or logout also drops the toast, so nothing reappears after unlocking.
function Toaster() {
  const { t } = useTranslation();
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => () => useToastStore.getState().dismiss(), []);

  useEffect(() => {
    if (!toast?.duration) {
      return;
    }
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  const Icon = toast ? TONE_ICON[toast.tone] : null;

  // The live region is always in the page, so screen readers announce a toast as soon as it appears
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toast && Icon && (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <Icon size={16} className="toast-icon" aria-hidden="true" />
          <span
            className="toast-text"
            aria-hidden={toast.announce ? true : undefined}
          >
            <span className="toast-message">{toast.message}</span>
            {toast.countdown && (
              <Countdown
                until={toast.countdown.until}
                label={toast.countdown.key}
              />
            )}
          </span>
          {toast.announce && <span className="sr-only">{toast.announce}</span>}
          <button
            type="button"
            className="icon-button"
            onClick={() => dismiss(toast.id)}
            title={t("toast.dismiss")}
            aria-label={t("toast.dismiss")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Toaster;
