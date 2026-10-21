import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { copyWithAutoClear } from "../lib/clipboard";

interface CopyButtonProps {
  value: string;
  label?: string;
  onCopied?: () => void;
}

// Icon button that copies value and shows a check for 2 seconds; the toast tells when the clipboard is emptied.
function CopyButton({ value, label, onCopied }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleClick() {
    // A refused copy is reported by a toast; the icon stays as it is
    if (!(await copyWithAutoClear(value))) {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
    onCopied?.();
  }

  return (
    <button
      type="button"
      className={copied ? "icon-button success" : "icon-button"}
      onClick={handleClick}
      title={copied ? t("common.copied") : (label ?? t("common.copy"))}
      aria-label={copied ? t("common.copied") : (label ?? t("common.copy"))}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export default CopyButton;
