using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class DeleteAccountRequestDto
    {
        [Required]
        [Length(64, 64)]
        public string AuthKey { get; set; } = string.Empty;
    }
}
