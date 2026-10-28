using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class ReencryptedCredentialDto
    {
        [Range(1, long.MaxValue)]
        public long Id { get; set; }

        // SHA-256 (lowercase hex) of the stored encrypted data being replaced: a different stored value rejects the write
        [Required]
        [RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Previous digest must be a lowercase hex SHA-256")]
        public string PreviousDigest { get; set; } = string.Empty;

        [Required]
        [MaxLength(VaultLimits.MaxEncryptedDataLength)]
        [RegularExpression(EncryptedDataRules.CredentialPattern, ErrorMessage = EncryptedDataRules.CredentialPatternMessage)]
        public string EncryptedData { get; set; } = string.Empty;
    }
}
