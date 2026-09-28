using System.ComponentModel.DataAnnotations;

namespace backend.Settings
{
	/// <summary>
	/// "Jwt" configuration section, validated at startup.
	/// </summary>
	public sealed class JwtSettings
	{
		public const string SectionName = "Jwt";

		// HMAC-SHA256 needs a key of at least 256 bits
		[Required]
		[MinLength(32)]
		public string Secret { get; set; } = string.Empty;

		[Required]
		public string Issuer { get; set; } = string.Empty;

		[Required]
		public string Audience { get; set; } = string.Empty;

		[Range(1, 1440)]
		public int AccessTokenExpiryMinutes { get; set; } = 15;

		[Range(1, 365)]
		public int RefreshTokenExpiryDays { get; set; } = 7;
	}
}
