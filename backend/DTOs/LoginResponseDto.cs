namespace backend.DTOs
{
    public class LoginResponseDto : AuthResponseDto
    {
        public string? WrappedVaultKey { get; set; }
        public int VaultKeyEpoch { get; set; } = 0;
    }
}