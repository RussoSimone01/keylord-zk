namespace backend.Models
{
    public class Credential
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public string EncryptedData { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public User User { get; set; } = null!;
    }
}