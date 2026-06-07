using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class LoginRequestDto
    {
        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [Length(64, 64)]
        public string AuthKey { get; set; } = string.Empty;
    }
}