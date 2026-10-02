import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CopyButtonProps {
  value: string;
  label?: string;
  onCopied?: () => void;
}

// Icon button that copies value and shows a check for 2 seconds.
function CopyButton({ value, label, onCopied }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleClick() {
    await navigator.clipboard.writeText(value);
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
