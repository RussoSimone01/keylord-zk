using System.ComponentModel.DataAnnotations;

namespace backend.Settings
{
	/// <summary>
	/// "Cors" configuration section, validated at startup.
	/// </summary>
	public sealed class CorsSettings
	{
		public const string SectionName = "Cors";

		// Origin of the frontend, e.g. https://user.github.io
		[Required]
		[Url]
		public string AllowedOrigin { get; set; } = string.Empty;
	}
}
