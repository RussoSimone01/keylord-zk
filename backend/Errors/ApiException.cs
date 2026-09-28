namespace backend.Errors
{
	/// <summary>
	/// Expected error raised by the business logic; converted to a ProblemDetails response by GlobalExceptionHandler.
	/// </summary>
	public class ApiException(ApiError error, TimeSpan? retryAfter = null, IReadOnlyDictionary<string, object?>? extensions = null) : Exception(error.Message)
	{
		public ApiError Error { get; } = error;

		// Emitted as Retry-After header when set
		public TimeSpan? RetryAfter { get; } = retryAfter;

		// Additional fields added to the ProblemDetails body
		public IReadOnlyDictionary<string, object?> Extensions { get; } = extensions ?? new Dictionary<string, object?>();
	}
}
