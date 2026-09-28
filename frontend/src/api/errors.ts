import axios from "axios";

// Error body returned by the API (RFC 9457 ProblemDetails)
export interface ApiProblem {
	type?: string;
	title?: string;
	status?: number;
	detail?: string;
	code?: string;
	lockedUntil?: string;
	errors?: Record<string, string[]>;
}

const DEFAULT_MESSAGE = "An error occurred";

// Client-side error whose message is meant to be shown to the user as is
export class UserFacingError extends Error {}

// Message to show the user for any error thrown by an API call
export function getErrorMessage(err: unknown): string {
	if (err instanceof UserFacingError) {
		return err.message;
	}
	if (!axios.isAxiosError<ApiProblem>(err)) {
		return DEFAULT_MESSAGE;
	}
	if (!err.response) {
		return "Unable to reach the server";
	}
	const problem = err.response.data;
	if (problem?.code === "auth.account_locked" && problem.lockedUntil) {
		return `Too many failed attempts, account locked until ${new Date(problem.lockedUntil).toLocaleString()}`;
	}
	return problem?.detail ?? problem?.title ?? DEFAULT_MESSAGE;
}
