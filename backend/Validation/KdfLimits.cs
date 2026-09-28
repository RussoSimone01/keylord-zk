namespace backend.Validation
{
	/// <summary>
	/// PBKDF2 iteration counts accepted by the API. The client enforces the same range on the values it receives.
	/// </summary>
	public static class KdfLimits
	{
		public const long MinIterations = 600_000;
		public const long MaxIterations = 2_000_000;

		// Value used by the client at signup, also returned for unknown usernames
		public const long DefaultIterations = 600_000;
	}
}
