using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using backend.Models;
using backend.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services.Implementations
{
    public class TokenService(IConfiguration configuration) : ITokenService
    {
        private readonly IConfiguration _config = configuration;

        public string GenerateAccessToken(User user)
        {
            SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
            SigningCredentials credentials = new(key, SecurityAlgorithms.HmacSha256);
            SecurityTokenDescriptor descriptor = new()
            {
                Subject = new([
                    new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                    new(JwtRegisteredClaimNames.Name, user.Username)
                ]),
                Expires = DateTime.UtcNow.AddMinutes(_config.GetValue<int>("Jwt:AccessTokenExpiryMinutes")),
                Issuer = _config["Jwt:Issuer"],
                Audience = _config["Jwt:Audience"],
                SigningCredentials = credentials
            };
            JwtSecurityTokenHandler handler = new();
            SecurityToken token = handler.CreateToken(descriptor);
            return handler.WriteToken(token);
        }

        public string HashRefreshToken(string token)
        {
            byte[] inputBytes = Encoding.UTF8.GetBytes(token);
            byte[] hashBytes = SHA256.HashData(inputBytes);
            return Convert.ToHexString(hashBytes);
        }

        public string GenerateRefreshToken()
        {
            byte[] randomBytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToBase64String(randomBytes);
        }
    }
}