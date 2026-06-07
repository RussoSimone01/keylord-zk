using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class RegisterRequestDto
    {
        [Required]
        [MaxLength(50)]
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
        [Range(100000, 1000000)]
        public long KdfIterations { get; set; }
    }
}