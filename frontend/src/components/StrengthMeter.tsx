import type { StrengthScore } from "../crypto/password";
import "./StrengthMeter.css";

const LEVELS = [
	{ word: "Very weak", tone: "danger" },
	{ word: "Weak", tone: "danger" },
	{ word: "Fair", tone: "warning" },
	{ word: "Strong", tone: "success" },
	{ word: "Very strong", tone: "success" },
] as const;

interface StrengthMeterProps {
	score: StrengthScore;
}

// Four segments plus a word, so strength never depends on color alone.
function StrengthMeter({ score }: StrengthMeterProps) {
	const level = LEVELS[score];
	const filled = Math.max(score, 1);

	return (
		<div
			className={`strength-meter ${level.tone}`}
			role="meter"
			aria-label="Password strength"
			aria-valuemin={0}
			aria-valuemax={4}
			aria-valuenow={score}
			aria-valuetext={level.word}
		>
			<div className="strength-bar">
				{[0, 1, 2, 3].map((i) => (
					<span key={i} className={i < filled ? "on" : undefined} />
				))}
			</div>
			<span className="strength-word">{level.word}</span>
		</div>
	);
}

export default StrengthMeter;
