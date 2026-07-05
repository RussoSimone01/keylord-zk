using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class VerifyPasswordRequestDto
    {

        [Required]
        [Length(64, 64)]
        public string AuthKey { get; set; } = string.Empty;
    }
}