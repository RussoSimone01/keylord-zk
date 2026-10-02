import axios from "axios";
import i18n from "../i18n";

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

// Mirrors VaultLimits.MaxCredentialsPerUser on the backend, used in the "vault full" message
const VAULT_MAX_CREDENTIALS = 2000;

// Client-side error whose message is a translation key, shown to the user once translated
export class UserFacingError extends Error {
  readonly params?: Record<string, unknown>;

  constructor(key: string, params?: Record<string, unknown>) {
    super(key);
    this.params = params;
  }
}

// Message to show the user for any error thrown by an API call, in the current language.
// API errors are translated by their stable "code"; the server's English text is only a fallback for unknown codes.
export function getErrorMessage(err: unknown): string {
  if (err instanceof UserFacingError) {
    return i18n.t(err.message, err.params);
  }
  if (!axios.isAxiosError<ApiProblem>(err)) {
    return i18n.t("errors.default");
  }
  if (!err.response) {
    return i18n.t("errors.unreachable");
  }
  const problem = err.response.data;
  if (problem?.code === "auth.account_locked" && problem.lockedUntil) {
    const date = new Date(problem.lockedUntil).toLocaleString(i18n.language);
    return i18n.t("errors.accountLockedUntil", { date });
  }
  const fallback =
    problem?.detail ?? problem?.title ?? i18n.t("errors.default");
  if (!problem?.code) {
    return fallback;
  }
  return i18n.t(`errors.codes.${problem.code}`, {
    defaultValue: fallback,
    max: VAULT_MAX_CREDENTIALS,
  });
}
