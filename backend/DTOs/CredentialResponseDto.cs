namespace backend.DTOs
{
    public class CredentialResponseDto
    {
        public long Id { get; set; }
        public string EncryptedData { get; set; } = string.Empty;
    }
}