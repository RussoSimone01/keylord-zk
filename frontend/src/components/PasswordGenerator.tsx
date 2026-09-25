import { useState } from "react";
import { Check, Dices } from "lucide-react";
import {
	DEFAULT_OPTIONS,
	estimateStrength,
	generatePassword,
	type GeneratorOptions,
} from "../crypto/password";
import SecretText from "./SecretText";
import StrengthMeter from "./StrengthMeter";
import "./PasswordGenerator.css";

interface PasswordGeneratorProps {
	initialLength?: number;
	// When set, shows a "Use this password" button that hands the value back.
	onUse?: (password: string) => void;
}

const OPTION_LABELS: Record<keyof GeneratorOptions, string> = {
	upper: "A–Z",
	lower: "a–z",
	digits: "0–9",
	symbols: "!#$",
};

function PasswordGenerator({ initialLength = 20, onUse }: PasswordGeneratorProps) {
	const [length, setLength] = useState(initialLength);
	const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_OPTIONS);
	const [password, setPassword] = useState(() =>
		generatePassword(initialLength, DEFAULT_OPTIONS),
	);

	// Every setting change produces a fresh password immediately.
	function update(nextLength: number, nextOptions: GeneratorOptions) {
		setLength(nextLength);
		setOptions(nextOptions);
		setPassword(generatePassword(nextLength, nextOptions));
	}

	function toggle(key: keyof GeneratorOptions) {
		const next = { ...options, [key]: !options[key] };
		// Keep at least one character set enabled.
		if (!Object.values(next).some(Boolean)) {
			return;
		}
		update(length, next);
	}

	return (
		<div className="generator">
			<div className="generator-output">
				<SecretText value={password} masked={false} />
				<button
					type="button"
					className="icon-button"
					onClick={() => update(length, options)}
					title="Regenerate"
					aria-label="Regenerate"
				>
					<Dices size={16} />
				</button>
			</div>
			<StrengthMeter score={estimateStrength(password)} />
			<div className="generator-length">
				<label htmlFor="generator-length">Length</label>
				<input
					id="generator-length"
					type="range"
					min={8}
					max={64}
					value={length}
					onChange={(e) => update(Number(e.target.value), options)}
				/>
				<span className="mono">{length}</span>
			</div>
			<div className="generator-options">
				{(Object.keys(OPTION_LABELS) as (keyof GeneratorOptions)[]).map(
					(key) => (
						<button
							key={key}
							type="button"
							role="switch"
							aria-checked={options[key]}
							className={options[key] ? "chip on" : "chip"}
							onClick={() => toggle(key)}
						>
							{options[key] && <Check size={12} />}
							{OPTION_LABELS[key]}
						</button>
					),
				)}
			</div>
			{onUse && (
				<button
					type="button"
					className="primary generator-use"
					onClick={() => onUse(password)}
				>
					Use this password
				</button>
			)}
		</div>
	);
}

export default PasswordGenerator;
