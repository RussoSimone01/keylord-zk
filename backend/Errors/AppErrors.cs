using backend.Validation;

namespace backend.Errors
{
	/// <summary>
	/// Catalog of the errors returned by the API. Codes are stable and meant to be used by clients; messages are for display.
	/// </summary>
	public static class AppErrors
	{
		// Authentication
		public static readonly ApiError InvalidCredentials = new("auth.invalid_credentials", StatusCodes.Status401Unauthorized, "Invalid username or password");
		public static readonly ApiError AccountLocked = new("auth.account_locked", StatusCodes.Status423Locked, "Account temporarily locked due to too many failed attempts, try again later");
		public static readonly ApiError RefreshTokenInvalid = new("auth.refresh_token_invalid", StatusCodes.Status401Unauthorized, "Invalid refresh token");
		public static readonly ApiError RefreshTokenExpired = new("auth.refresh_token_expired", StatusCodes.Status401Unauthorized, "Refresh token expired");
		public static readonly ApiError RefreshTokenReused = new("auth.refresh_token_reused", StatusCodes.Status401Unauthorized, "Refresh token already used, all sessions have been revoked");
		public static readonly ApiError SessionInvalid = new("auth.session_invalid", StatusCodes.Status401Unauthorized, "Session is no longer valid");
		// 403 instead of 401 so the client does not mistake it for an expired access token
		public static readonly ApiError PasswordIncorrect = new("auth.password_incorrect", StatusCodes.Status403Forbidden, "Password is incorrect");

		// Users
		public static readonly ApiError UsernameTaken = new("user.username_taken", StatusCodes.Status409Conflict, "Username already in use");
		public static readonly ApiError EmailTaken = new("user.email_taken", StatusCodes.Status409Conflict, "Email already in use");

		// Vault
		public static readonly ApiError CredentialNotFound = new("vault.credential_not_found", StatusCodes.Status404NotFound, "Credential not found");
		public static readonly ApiError VaultOutOfSync = new("vault.out_of_sync", StatusCodes.Status409Conflict, "The vault was modified during the password change, please try again");
		public static readonly ApiError VaultFull = new("vault.limit_reached", StatusCodes.Status409Conflict, $"The vault cannot hold more than {VaultLimits.MaxCredentialsPerUser} credentials");
		public static readonly ApiError DuplicateCredentialIds = new("vault.duplicate_credential_ids", StatusCodes.Status400BadRequest, "Each credential must appear only once");

		// Generic
		public static readonly ApiError ValidationFailed = new("request.validation_failed", StatusCodes.Status400BadRequest, "One or more validation errors occurred");
		public static readonly ApiError Conflict = new("resource.conflict", StatusCodes.Status409Conflict, "The request conflicts with the current state of the resource");
		public static readonly ApiError Internal = new("server.internal_error", StatusCodes.Status500InternalServerError, "An unexpected error occurred");

		/// <summary>
		/// Fallback code for responses not produced by an ApiException (authentication challenges, unknown routes, framework errors).
		/// </summary>
		public static string CodeFromStatus(int statusCode) => statusCode switch
		{
			StatusCodes.Status400BadRequest => "request.invalid",
			StatusCodes.Status401Unauthorized => "auth.unauthorized",
			StatusCodes.Status403Forbidden => "auth.forbidden",
			StatusCodes.Status404NotFound => "resource.not_found",
			StatusCodes.Status405MethodNotAllowed => "request.method_not_allowed",
			StatusCodes.Status409Conflict => Conflict.Code,
			StatusCodes.Status413PayloadTooLarge => "request.too_large",
			StatusCodes.Status415UnsupportedMediaType => "request.unsupported_media_type",
			StatusCodes.Status429TooManyRequests => "rate_limit.exceeded",
			>= 500 => Internal.Code,
			_ => $"http.{statusCode}"
		};
	}
}
