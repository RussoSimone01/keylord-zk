using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class RegisterRequestDto
    {
        [Required]
        [MaxLength(UsernameRules.MaxLength)]
        [RegularExpression(UsernameRules.Pattern, ErrorMessage = UsernameRules.PatternMessage)]
        public string Username { get; set; } = string.Empty;

        [EmailAddress]
        public string? Email { get; set; }

        [Required]
        [Length(64, 64)]
        public string AuthKey { get; set; } = string.Empty;

        [Required]
        [Length(64, 64)]
        public string Salt { get; set; } = string.Empty;

        [Required]
        [Range(KdfLimits.MinIterations, KdfLimits.MaxIterations)]
        public long KdfIterations { get; set; }
    }
}
