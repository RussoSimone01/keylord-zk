using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using backend.Extensions;
using backend.Models;
using backend.Services.Interfaces;
using backend.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services.Implementations
{
	public class TokenService(IOptions<JwtSettings> jwtSettings) : ITokenService
	{
		private readonly JwtSettings _jwt = jwtSettings.Value;

		public string GenerateAccessToken(User user)
		{
			SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(_jwt.Secret));
			SigningCredentials credentials = new(key, SecurityAlgorithms.HmacSha256);
			SecurityTokenDescriptor descriptor = new()
			{
				Subject = new([
					new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
					new Claim(JwtRegisteredClaimNames.Name, user.Username),
					new Claim(AppClaimTypes.KeyStamp, ComputeKeyStamp(user.KdfSalt))
				]),
				Expires = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenExpiryMinutes),
				Issuer = _jwt.Issuer,
				Audience = _jwt.Audience,
				SigningCredentials = credentials
			};
			JwtSecurityTokenHandler handler = new();
			SecurityToken token = handler.CreateToken(descriptor);
			return handler.WriteToken(token);
		}

		/// <summary>
		/// Short fingerprint of the salt. The salt changes at every password change, so the stamp identifies the password generation.
		/// </summary>
		public string ComputeKeyStamp(string kdfSalt)
		{
			byte[] hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(kdfSalt));
			return Convert.ToHexString(hashBytes, 0, 16);
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
