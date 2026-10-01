using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class CredentialDto
    {
        [Required]
        [MaxLength(VaultLimits.MaxEncryptedDataLength)]
        [RegularExpression(VaultLimits.EncryptedDataPattern, ErrorMessage = "Encrypted data must have the format ivBase64:ciphertextBase64")]
        public string EncryptedData { get; set; } = string.Empty;
    }
}
