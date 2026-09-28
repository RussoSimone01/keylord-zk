namespace backend.Validation
{
	/// <summary>
	/// Characters allowed in new usernames. ASCII only, so that case-insensitive comparison is the same in .NET and PostgreSQL.
	/// </summary>
	public static class UsernameRules
	{
		public const int MaxLength = 50;
		public const string Pattern = "^[A-Za-z0-9._-]+$";
		public const string PatternMessage = "Username can contain only letters, digits, dots, hyphens and underscores";
	}
}
