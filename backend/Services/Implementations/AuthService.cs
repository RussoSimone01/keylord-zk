using backend.DTOs;
using backend.Models;
using backend.Repositories.Interfaces;
using backend.Services.Interfaces;

namespace backend.Services.Implementations
{
    public class AuthService(IConfiguration configuration, IUserRepository userRepository, ITokenService tokenService, IRefreshTokenRepository refreshTokenRepository, ICredentialRepository credentialRepository) : IAuthService
    {
        private readonly IConfiguration _config = configuration;
        private readonly IUserRepository _userRepository = userRepository;
        private readonly ITokenService _tokenService = tokenService;
        private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
        private readonly ICredentialRepository _credentialRepository = credentialRepository;

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            if (await _userRepository.ExistsByUsernameAsync(request.Username))
            {
                throw new Exception("Username already in use");
            }
            if (!string.IsNullOrEmpty(request.Email) && await _userRepository.ExistsByEmailAsync(request.Email))
            {
                throw new Exception("Email already in use");
            }
            User user = new()
            {
                Username = request.Username,
                Email = request.Email,
                AuthKeyHash = BCrypt.Net.BCrypt.HashPassword(request.AuthKey),
                KdfSalt = request.Salt,
                KdfIterations = request.KdfIterations
            };
            await _userRepository.AddAsync(user);

            string rawRefreshToken = _tokenService.GenerateRefreshToken();
            RefreshToken refreshToken = new()
            {
                UserId = user.Id,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshTokenExpiryDays"))
            };
            await _refreshTokenRepository.AddAsync(refreshToken);
            string accessToken = _tokenService.GenerateAccessToken(user);
            return new()
            {
                AccessToken = accessToken,
                RefreshToken = rawRefreshToken
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            User user = await _userRepository.GetByUsernameAsync(request.Username)
                ?? throw new Exception("User not found");
            if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
            {
                if (user.LockedUntil == DateTime.MaxValue)
                {
                    throw new Exception($"User account locked");
                }
                else
                {
                    throw new Exception($"User account locked until {user.LockedUntil}");
                }
            }
            if (BCrypt.Net.BCrypt.Verify(request.AuthKey, user.AuthKeyHash))
            {
                await _userRepository.ResetLockoutAsync(user.Id);
            }
            else
            {
                int failedLoginAttempts = user.FailedLoginAttempts + 1;
                DateTime? lockedUntil = user.LockedUntil;
                if (failedLoginAttempts % 3 == 0)
                {
                    lockedUntil = failedLoginAttempts switch
                    {
                        3 => DateTime.UtcNow.AddMinutes(15),
                        6 => DateTime.UtcNow.AddHours(1),
                        9 => DateTime.UtcNow.AddDays(1),
                        _ => DateTime.MaxValue,
                    };
                }
                await _userRepository.UpdateLoginAttemptsAsync(user.Id, failedLoginAttempts, lockedUntil);
                throw new Exception("Password do not match");
            }
            string rawRefreshToken = _tokenService.GenerateRefreshToken();
            RefreshToken refreshToken = new()
            {
                UserId = user.Id,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshTokenExpiryDays"))
            };
            await _refreshTokenRepository.AddAsync(refreshToken);
            string accessToken = _tokenService.GenerateAccessToken(user);
            return new()
            {
                AccessToken = accessToken,
                RefreshToken = rawRefreshToken
            };
        }

        public async Task<AuthResponseDto> RefreshAsync(RefreshRequestDto request)
        {
            string hash = _tokenService.HashRefreshToken(request.RefreshToken);
            RefreshToken? refreshToken = await _refreshTokenRepository.GetByTokenHashAsync(hash)
                ?? throw new Exception("Invalid refresh token");
            if (refreshToken.ExpiresAt <= DateTime.UtcNow)
            {
                throw new Exception("Refresh token expired");
            }
            if (refreshToken.RevokedAt.HasValue)
            {
                await _refreshTokenRepository.RevokeAllByUserAsync(refreshToken.UserId);
                throw new Exception("Refresh token already revoked");
            }
            await _refreshTokenRepository.RevokeAsync(refreshToken.Id);
            string rawRefreshToken = _tokenService.GenerateRefreshToken();
            RefreshToken newRefreshToken = new()
            {
                UserId = refreshToken.UserId,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshTokenExpiryDays"))
            };
            await _refreshTokenRepository.AddAsync(newRefreshToken);
            string accessToken = _tokenService.GenerateAccessToken(refreshToken.User);
            return new()
            {
                AccessToken = accessToken,
                RefreshToken = rawRefreshToken
            };
        }

        public async Task<AuthResponseDto> ChangePasswordAsync(long userId, ChangePasswordRequestDto request)
        {
            User user = await _userRepository.GetByIdAsync(userId)
                ?? throw new Exception("User not found");
            if (!BCrypt.Net.BCrypt.Verify(request.OldAuthKey, user.AuthKeyHash))
            {
                throw new Exception("Old password does not match");
            }
            await _userRepository.UpdatePasswordAsync(userId, BCrypt.Net.BCrypt.HashPassword(request.NewAuthKey), request.NewSalt);
            await _refreshTokenRepository.RevokeAllByUserAsync(userId);
            await _credentialRepository.DeleteAllByUserAsync(userId);
            await _credentialRepository.AddRangeAsync(
                request.Credentials.Select(c => new Credential()
                {
                    UserId = userId,
                    EncryptedData = c.EncryptedData
                })
            );
            string rawRefreshToken = _tokenService.GenerateRefreshToken();
            RefreshToken refreshToken = new()
            {
                UserId = user.Id,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshTokenExpiryDays"))
            };
            await _refreshTokenRepository.AddAsync(refreshToken);
            string accessToken = _tokenService.GenerateAccessToken(user);
            return new()
            {
                AccessToken = accessToken,
                RefreshToken = rawRefreshToken
            };
        }

        public async Task<SaltResponseDto> GetSaltAsync(string username)
        {
            User user = await _userRepository.GetByUsernameAsync(username)
                ?? throw new Exception("User not found");
            return new()
            {
                Salt = user.KdfSalt,
                KdfIterations = user.KdfIterations
            };
        }
    }
}