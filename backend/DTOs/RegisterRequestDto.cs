namespace backend.DTOs
{
    public class RegisterRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string AuthKey { get; set; } = string.Empty;
        public string Salt { get; set; } = string.Empty;
        public long KdfIterations { get; set; }
    }
}