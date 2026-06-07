namespace backend.DTOs
{
    public class ChangePasswordRequestDto
    {
        public string OldAuthKey { get; set; } = string.Empty;
        public string NewAuthKey { get; set; } = string.Empty;
        public string NewSalt { get; set; } = string.Empty;
        public CredentialDto[] Credentials { get; set; } = [];
    }
}