using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class CredentialDto
    {
        [Required]
        public string EncryptedData { get; set; } = string.Empty;
    }
}