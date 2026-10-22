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

        // Empty unless RotateVaultKey is set: then every credential of the vault, each once, re-encrypted with the new vault key
        [Required]
        [MaxLength(VaultLimits.MaxCredentialsPerUser)]
        public ReencryptedCredentialDto[] Credentials { get; set; } = [];

        // The vault key wrapped with the key derived from the new password: the same vault key, or a new one when rotating
        [Required]
        [RegularExpression(EncryptedDataRules.WrappedVaultKeyPattern, ErrorMessage = EncryptedDataRules.WrappedVaultKeyPatternMessage)]
        public string NewWrappedVaultKey { get; set; } = string.Empty;

        // Also replaces the vault key itself (a rotation). The flag is explicit
        // because an empty vault cannot be told apart from a password change without it
        public bool RotateVaultKey { get; set; }

        // Epoch the client believes is current: a different value means the vault key changed meanwhile and the request is rejected
        [Range(0, int.MaxValue)]
        public int CurrentEpoch { get; set; }
    }
}
