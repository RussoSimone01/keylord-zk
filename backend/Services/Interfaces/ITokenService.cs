using backend.Models;

namespace backend.Services.Interfaces
{
    public interface ITokenService
    {
        public string GenerateAccessToken(User user);
        public string ComputeKeyStamp(string kdfSalt);
        public string HashRefreshToken(string token);
        public string GenerateRefreshToken();
    }
}
