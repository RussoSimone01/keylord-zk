import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import CopyButton from "./CopyButton";
import "./SecretText.css";

interface SecretTextProps {
	value: string;
	// When false the value is always shown and there is no reveal button.
	masked?: boolean;
	copyLabel?: string;
	className?: string;
}

// The mask is always 12 dots so it never reveals the real length.
const MASK = "••••••••••••";

function SecretText({
	value,
	masked = true,
	copyLabel = "Copy password",
	className,
}: SecretTextProps) {
	const [revealed, setRevealed] = useState(false);
	const hidden = masked && !revealed;

	return (
		<div className={className ? `secret-text ${className}` : "secret-text"}>
			<span
				className={hidden ? "secret-value masked" : "secret-value"}
				aria-label={hidden ? "Hidden password" : undefined}
			>
				{hidden ? MASK : value}
			</span>
			<div className="secret-actions">
				{masked && (
					<button
						type="button"
						className="icon-button"
						aria-pressed={revealed}
						onClick={() => setRevealed(!revealed)}
						title={revealed ? "Hide" : "Reveal"}
						aria-label={revealed ? "Hide" : "Reveal"}
					>
						{revealed ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				)}
				<CopyButton value={value} label={copyLabel} />
			</div>
		</div>
	);
}

export default SecretText;
