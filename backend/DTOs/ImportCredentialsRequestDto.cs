using System.ComponentModel.DataAnnotations;
using backend.Validation;

namespace backend.DTOs
{
    public class ImportCredentialsRequestDto
    {
        // New credentials, created in this order
        [Required]
        [MaxLength(VaultLimits.MaxCredentialsPerUser)]
        public CredentialDto[] Credentials { get; set; } = [];

        // Existing credentials to overwrite, each applied only if its stored content still has PreviousDigest
        [Required]
        [MaxLength(VaultLimits.MaxCredentialsPerUser)]
        public ReencryptedCredentialDto[] Replacements { get; set; } = [];
    }
}
