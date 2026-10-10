using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class ChangePasswordRequestDto
    {
        [Required]
        [Length(64, 64)]
        public string OldAuthKey { get; set; } = string.Empty;

        [Required]
        [Length(64, 64)]
        public string NewAuthKey { get; set; } = string.Empty;

        [Required]
        [Length(64, 64)]
        public string NewSalt { get; set; } = string.Empty;

        // Iterations used to derive the new keys: a password change is also the moment to raise them
        [Range(KdfLimits.MinIterations, KdfLimits.MaxIterations)]
        public long NewKdfIterations { get; set; }

        // Must contain every credential of the vault, each exactly once, re-encrypted with the new key
        // Must be empty for users on the vault-key format
        [Required]
        [MaxLength(VaultLimits.MaxCredentialsPerUser)]
        public ReencryptedCredentialDto[] Credentials { get; set; } = [];

        // Only for users on the vault-key format: the same vault key, wrapped with the key derived from the new password
        [Length(1, 512)]
        [RegularExpression(EncryptedDataRules.Pattern, ErrorMessage = EncryptedDataRules.PatternMessage)]
        public string? NewWrappedVaultKey { get; set; }
    }
}
