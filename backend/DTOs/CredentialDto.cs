using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class CredentialDto
    {
        [Required]
        [MaxLength(VaultLimits.MaxEncryptedDataLength)]
        [RegularExpression(EncryptedDataRules.CredentialPattern, ErrorMessage = EncryptedDataRules.CredentialPatternMessage)]
        public string EncryptedData { get; set; } = string.Empty;
    }
}
