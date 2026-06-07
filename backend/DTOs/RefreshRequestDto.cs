using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class RefreshRequestDto
    {
        [Required]
        [Length(44, 44)]
        public string RefreshToken { get; set; } = string.Empty;
    }
}