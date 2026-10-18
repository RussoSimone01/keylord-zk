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

        // Must be empty only if you rotate the vault key
        [Required]
        [MaxLength(VaultLimits.MaxCredentialsPerUser)]
        public ReencryptedCredentialDto[] Credentials { get; set; } = [];

        // Only for users on the vault-key format: the same vault key, wrapped with the key derived from the new password
        [Required]
        [Length(1, 512)]
        [RegularExpression(EncryptedDataRules.Pattern, ErrorMessage = EncryptedDataRules.PatternMessage)]
        public string NewWrappedVaultKey { get; set; } = string.Empty;

        // Only for users with a vault key: also replaces the vault key itself (a rotation). The flag is explicit
        // because an empty vault cannot be told apart from a password change without it
        public bool RotateVaultKey { get; set; }

        // Epoch the client believes is current: checked only when RotateVaultKey is set
        [Range(0, int.MaxValue)]
        public int CurrentEpoch { get; set; }
    }
}
