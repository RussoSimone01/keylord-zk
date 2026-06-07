using System.ComponentModel.DataAnnotations;

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

        [Required]
        public CredentialDto[] Credentials { get; set; } = [];
    }
}