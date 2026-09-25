export interface GeneratorOptions {
	upper: boolean;
	lower: boolean;
	digits: boolean;
	symbols: boolean;
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
	upper: true,
	lower: true,
	digits: true,
	symbols: true,
};

// Look-alike characters (0/O, 1/l/I) are left out so passwords can be read back safely.
const SETS: Record<keyof GeneratorOptions, string> = {
	upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
	lower: "abcdefghijkmnopqrstuvwxyz",
	digits: "23456789",
	symbols: "!#$%&*+-=?@^_~",
};

// Draws each character with crypto.getRandomValues; values above the largest multiple
// of the pool size are rejected so every character is equally likely.
export function generatePassword(
	length: number,
	options: GeneratorOptions = DEFAULT_OPTIONS,
): string {
	let pool = "";
	for (const key of Object.keys(SETS) as (keyof GeneratorOptions)[]) {
		if (options[key]) {
			pool += SETS[key];
		}
	}
	if (pool.length === 0) {
		pool = SETS.lower;
	}

	const limit = Math.floor(0x100000000 / pool.length) * pool.length;
	const buffer = new Uint32Array(1);
	let result = "";
	while (result.length < length) {
		crypto.getRandomValues(buffer);
		if (buffer[0] < limit) {
			result += pool[buffer[0] % pool.length];
		}
	}
	return result;
}

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

// Rough entropy estimate from length and character classes, minus a penalty for triple repeats.
// Good enough for UI feedback; a dictionary-aware estimator such as zxcvbn is more accurate.
export function estimateStrength(password: string): StrengthScore {
	if (password.length === 0) {
		return 0;
	}
	let classes = 0;
	if (/[a-z]/.test(password)) classes++;
	if (/[A-Z]/.test(password)) classes++;
	if (/[0-9]/.test(password)) classes++;
	if (/[^A-Za-z0-9]/.test(password)) classes++;

	const poolSize = [0, 26, 52, 62, 94][classes];
	let bits = password.length * Math.log2(Math.max(poolSize, 2));
	if (/(.)\1\1/.test(password)) {
		bits -= 10;
	}

	if (bits < 28) return 0;
	if (bits < 40) return 1;
	if (bits < 60) return 2;
	if (bits < 80) return 3;
	return 4;
}
