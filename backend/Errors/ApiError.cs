namespace backend.Errors
{
	/// <summary>
	/// Describes an expected error: machine-readable code, HTTP status and message shown to the client.
	/// </summary>
	public sealed record ApiError(string Code, int StatusCode, string Message);
}
