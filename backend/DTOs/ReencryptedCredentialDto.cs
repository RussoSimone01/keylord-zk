using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class ReencryptedCredentialDto
    {
        [Range(1, long.MaxValue)]
        public long Id { get; set; }

        // SHA-256 (lowercase hex) of the encrypted data the client decrypted and re-encrypted
        [Required]
        [RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Previous digest must be a lowercase hex SHA-256")]
        public string PreviousDigest { get; set; } = string.Empty;

        [Required]
        [MaxLength(VaultLimits.MaxEncryptedDataLength)]
        [RegularExpression(VaultLimits.EncryptedDataPattern, ErrorMessage = "Encrypted data must have the format ivBase64:ciphertextBase64")]
        public string EncryptedData { get; set; } = string.Empty;
    }
}
