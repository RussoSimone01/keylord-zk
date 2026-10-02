import type { StrengthScore } from "../crypto/password";
import "./StrengthMeter.css";
import { useTranslation } from "react-i18next";

// Meter color per score; the word comes from the translations.
const TONES = ["danger", "danger", "warning", "success", "success"] as const;

interface StrengthMeterProps {
  score: StrengthScore;
}

// Four segments plus a word, so strength never depends on color alone.
function StrengthMeter({ score }: StrengthMeterProps) {
  const { t } = useTranslation();
  const tone = TONES[score];
  const word = t(`strength.level.${score}`);
  const filled = Math.max(score, 1);

  return (
    <div
      className={`strength-meter ${tone}`}
      role="meter"
      aria-label={t("strength.label")}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={score}
      aria-valuetext={word}
    >
      <div className="strength-bar">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < filled ? "on" : undefined} />
        ))}
      </div>
      <span className="strength-word">{word}</span>
    </div>
  );
}

export default StrengthMeter;
