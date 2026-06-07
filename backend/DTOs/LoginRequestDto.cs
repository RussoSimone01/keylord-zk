namespace backend.DTOs
{
    public class LoginRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string AuthKey { get; set; } = string.Empty;
    }
}