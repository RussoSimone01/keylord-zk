using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class RotateVaultKeyRequestDto
    {
        // Current authKey: rotating the key is as sensitive as changing the password
        [Required]
        [Length(64, 64)]
        public string AuthKey { get; set; } = string.Empty;

        // Epoch the client believes is current (0 for a user not migrated yet)
        [Range(0, int.MaxValue)]
        public int CurrentEpoch { get; set; }

        // The new vault key, wrapped with the key derived from the current password
        [Required]
        [Length(1, 512)]
        [RegularExpression(EncryptedDataRules.Pattern, ErrorMessage = EncryptedDataRules.PatternMessage)]
        public string NewWrappedVaultKey { get; set; } = string.Empty;

        // Every credential of the vault, each exactly once, re-encrypted with the new vault key
        [Required]
        [MaxLength(VaultLimits.MaxCredentialsPerUser)]
        public ReencryptedCredentialDto[] Credentials { get; set; } = [];
    }
}