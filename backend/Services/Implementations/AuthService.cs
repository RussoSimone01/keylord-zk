using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.DTOs;
using backend.Errors;
using backend.Models;
using backend.Repositories.Interfaces;
using backend.Services.Interfaces;
using backend.Settings;
using backend.Validation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace backend.Services.Implementations
{
    public class AuthService(IOptions<JwtSettings> jwtSettings, AppDbContext appDbContext, IUserRepository userRepository, ITokenService tokenService, IRefreshTokenRepository refreshTokenRepository, ICredentialRepository credentialRepository) : IAuthService
    {
        // Verified when the username does not exist, so that both login paths cost the same bcrypt work
        private static readonly string DummyAuthKeyHash = BCrypt.Net.BCrypt.HashPassword(Convert.ToHexString(RandomNumberGenerator.GetBytes(32)));

        // Every third consecutive failure locks the account: 15 minutes, then 1 hour, then 24 hours for each further lock
        private static readonly LockoutSchedule Lockout = new(3, TimeSpan.FromMinutes(15), TimeSpan.FromHours(1), TimeSpan.FromDays(1));

        private readonly JwtSettings _jwt = jwtSettings.Value;
        private readonly AppDbContext _db = appDbContext;
        private readonly IUserRepository _userRepository = userRepository;
        private readonly ITokenService _tokenService = tokenService;
        private readonly IRefreshTokenRepository _refreshTokenRepository = refreshTokenRepository;
        private readonly ICredentialRepository _credentialRepository = credentialRepository;

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken)
        {
            // Verify that username and email are unique
            if (await _userRepository.ExistsByUsernameAsync(request.Username, cancellationToken))
            {
                throw new ApiException(AppErrors.UsernameTaken);
            }
            if (!string.IsNullOrEmpty(request.Email) && await _userRepository.ExistsByEmailAsync(request.Email, cancellationToken))
            {
                throw new ApiException(AppErrors.EmailTaken);
            }
            // Create the user
            User user = new()
            {
                Username = request.Username,
                Email = request.Email,
                AuthKeyHash = BCrypt.Net.BCrypt.HashPassword(request.AuthKey),
                KdfSalt = request.Salt,
                KdfIterations = request.KdfIterations,
                WrappedVaultKey = request.WrappedVaultKey
            };
            // User and first refresh token are stored together or not at all
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                await _userRepository.AddAsync(user, cancellationToken);
                AuthResponseDto tokens = await IssueTokensAsync(user, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return tokens;
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } unique)
            {
                // Concurrent registration that passed the checks above, stopped by the unique indexes
                throw new ApiException(unique.ConstraintName?.StartsWith("IX_Users_Email") == true ? AppErrors.EmailTaken : AppErrors.UsernameTaken);
            }
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken)
        {
            // Unknown username and wrong password produce the same response
            User? user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);
            if (user is null)
            {
                BCrypt.Net.BCrypt.Verify(request.AuthKey, DummyAuthKeyHash);
                throw new ApiException(AppErrors.InvalidCredentials);
            }
            if (!await VerifyAuthKeyAsync(user, request.AuthKey, cancellationToken))
            {
                throw new ApiException(AppErrors.InvalidCredentials);
            }
            AuthResponseDto authResponse = await IssueTokensAsync(user, cancellationToken);
            return new LoginResponseDto
            {
                AccessToken = authResponse.AccessToken,
                RefreshToken = authResponse.RefreshToken,
                WrappedVaultKey = user.WrappedVaultKey,
                VaultKeyEpoch = user.VaultKeyEpoch
            };
        }

        public async Task<AuthResponseDto> RefreshAsync(RefreshRequestDto request, CancellationToken cancellationToken)
        {
            // Retrieve the token
            string hash = _tokenService.HashRefreshToken(request.RefreshToken);
            RefreshToken refreshToken = await _refreshTokenRepository.GetByTokenHashAsync(hash, cancellationToken)
                ?? throw new ApiException(AppErrors.RefreshTokenInvalid);
            // A revoked token presented again is treated as stolen, even if expired
            if (refreshToken.RevokedAt.HasValue)
            {
                await _refreshTokenRepository.RevokeAllByUserAsync(refreshToken.UserId, cancellationToken);
                throw new ApiException(AppErrors.RefreshTokenReused);
            }
            if (refreshToken.ExpiresAt <= DateTime.UtcNow)
            {
                throw new ApiException(AppErrors.RefreshTokenExpired);
            }
            // Conditional revoke: of two concurrent requests with the same token only one wins, the other counts as reuse
            if (!await _refreshTokenRepository.TryRevokeAsync(refreshToken.Id, cancellationToken))
            {
                await _refreshTokenRepository.RevokeAllByUserAsync(refreshToken.UserId, cancellationToken);
                throw new ApiException(AppErrors.RefreshTokenReused);
            }
            return await IssueTokensAsync(refreshToken.User, cancellationToken);
        }

        public async Task<AuthResponseDto> ChangePasswordAsync(long userId, ChangePasswordRequestDto request, CancellationToken cancellationToken)
        {
            // Retrieve User
            User user = await _userRepository.GetByIdAsync(userId, cancellationToken)
                ?? throw new ApiException(AppErrors.SessionInvalid);
            // Check password
            if (!await VerifyAuthKeyInSessionAsync(user, request.OldAuthKey, cancellationToken))
            {
                throw new ApiException(AppErrors.PasswordIncorrect);
            }
            if (request.Credentials.DistinctBy(c => c.Id).Count() != request.Credentials.Length)
            {
                throw new ApiException(AppErrors.DuplicateCredentialIds);
            }
            Dictionary<long, CredentialReplacement> replacementsById = request.Credentials.ToDictionary(
                c => c.Id,
                c => new CredentialReplacement(c.PreviousDigest, c.EncryptedData)
            );
            // Hashed before opening the transaction, to keep the row lock short
            string newAuthKeyHash = BCrypt.Net.BCrypt.HashPassword(request.NewAuthKey);

            // Disposing the transaction without committing rolls it back
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            // Blocks credential inserts from other sessions until commit
            await _userRepository.LockForUpdateAsync(userId, cancellationToken);
            User current = await _userRepository.GetByIdAsync(userId, cancellationToken)
                ?? throw new ApiException(AppErrors.SessionInvalid);
            if (current.WrappedVaultKey is not null)
            {
                // The vault key does not change: only its wrapping does, so no credential must travel
                if (string.IsNullOrEmpty(request.NewWrappedVaultKey) || request.Credentials.Length != 0)
                {
                    throw new ApiException(AppErrors.VaultOutOfSync);
                }
            }
            else
            {
                if (request.NewWrappedVaultKey is not null)
                {
                    throw new ApiException(AppErrors.VaultOutOfSync);
                }
                // The client must have re-encrypted exactly the current vault: anything added, removed or edited meanwhile aborts the change
                if (!await _credentialRepository.TryReplaceAllEncryptedDataAsync(userId, replacementsById, cancellationToken))
                {
                    throw new ApiException(AppErrors.VaultOutOfSync);
                }
            }
            await _userRepository.UpdatePasswordAsync(userId, newAuthKeyHash, request.NewSalt, request.NewKdfIterations, request.NewWrappedVaultKey, cancellationToken);
            // Other sessions are deleted, not revoked: presenting them again must not look like token theft
            await _refreshTokenRepository.DeleteAllByUserAsync(userId, cancellationToken);
            // The entity is not tracked: updated in memory only, so the new access token carries the new key stamp
            user.AuthKeyHash = newAuthKeyHash;
            user.KdfSalt = request.NewSalt;
            AuthResponseDto tokens = await IssueTokensAsync(user, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return tokens;
        }

        public async Task<SaltResponseDto> GetSaltAsync(string username, CancellationToken cancellationToken)
        {
            // Unknown usernames get a fake salt indistinguishable from a real one: the subsequent login fails like a wrong password
            User? user = await _userRepository.GetByUsernameAsync(username, cancellationToken);
            return new()
            {
                Salt = user?.KdfSalt ?? ComputeFakeSalt(username),
                KdfIterations = user?.KdfIterations ?? KdfLimits.DefaultIterations
            };
        }

        public async Task<bool> VerifyPasswordAsync(long userId, VerifyPasswordRequestDto request, CancellationToken cancellationToken)
        {
            // Retrieve User
            User user = await _userRepository.GetByIdAsync(userId, cancellationToken)
                ?? throw new ApiException(AppErrors.SessionInvalid);
            return await VerifyAuthKeyInSessionAsync(user, request.AuthKey, cancellationToken);
        }

        public async Task DeleteAccountAsync(long userId, DeleteAccountRequestDto request, CancellationToken cancellationToken)
        {
            // Retrieve User
            User user = await _userRepository.GetByIdAsync(userId, cancellationToken)
                ?? throw new ApiException(AppErrors.SessionInvalid);
            // Re-authentication: a stolen access token alone is not enough to delete the account
            if (!await VerifyAuthKeyInSessionAsync(user, request.AuthKey, cancellationToken))
            {
                throw new ApiException(AppErrors.PasswordIncorrect);
            }
            await _userRepository.DeleteAsync(userId, cancellationToken);
        }

        public async Task LogoutAsync(RefreshRequestDto request, CancellationToken cancellationToken)
        {
            // Deleted rather than revoked: the token is gone for good and cannot trigger reuse detection later
            await _refreshTokenRepository.DeleteByHashAsync(_tokenService.HashRefreshToken(request.RefreshToken), cancellationToken);
        }

        /// <summary>
        /// Password check made from an authenticated session. If this failure locks the account, every session is ended:
        /// whoever is guessing from a (possibly stolen) session cannot renew it. Locks caused by failed logins do not end sessions,
        /// otherwise anyone could log the user out by guessing passwords.
        /// Access tokens already issued remain valid until they expire.
        /// </summary>
        private async Task<bool> VerifyAuthKeyInSessionAsync(User user, string authKey, CancellationToken cancellationToken)
        {
            if (await VerifyAuthKeyAsync(user, authKey, cancellationToken))
            {
                return true;
            }
            DateTime? lockedUntil = await _userRepository.GetLockedUntilAsync(user.Id, cancellationToken);
            if (lockedUntil > DateTime.UtcNow)
            {
                await _refreshTokenRepository.DeleteAllByUserAsync(user.Id, cancellationToken);
            }
            return false;
        }

        /// <summary>
        /// Checks an authKey against the stored hash, applying the failed-attempt lockout shared by every endpoint that verifies the password.
        /// The attempt is counted before the bcrypt check, so concurrent guesses cannot exceed the limit; a success resets the counter.
        /// </summary>
        private async Task<bool> VerifyAuthKeyAsync(User user, string authKey, CancellationToken cancellationToken)
        {
            DateTime now = DateTime.UtcNow;
            if (!await _userRepository.TryRegisterAttemptAsync(user.Id, now, Lockout, cancellationToken))
            {
                DateTime lockedUntil = DateTime.SpecifyKind(await _userRepository.GetLockedUntilAsync(user.Id, cancellationToken) ?? now, DateTimeKind.Utc);
                throw new ApiException(
                    AppErrors.AccountLocked,
                    lockedUntil - now,
                    new Dictionary<string, object?> { ["lockedUntil"] = lockedUntil }
                );
            }
            if (!BCrypt.Net.BCrypt.Verify(authKey, user.AuthKeyHash))
            {
                return false;
            }
            await _userRepository.ResetLockoutAsync(user.Id, cancellationToken);
            return true;
        }

        /// <summary>
        /// Deterministic salt for a username that does not exist: HMAC of the username, keyed with a secret derived from the JWT secret.
        /// The same username, in any letter case, always gets the same salt, so repeated lookups do not reveal that the account is missing.
        /// </summary>
        private string ComputeFakeSalt(string username)
        {
            // HKDF with a dedicated label: the JWT secret is never used directly for a second purpose
            byte[] key = HKDF.DeriveKey(
                HashAlgorithmName.SHA256,
                Encoding.UTF8.GetBytes(_jwt.Secret),
                32,
                info: Encoding.UTF8.GetBytes("keylord-zk/fake-salt")
            );
            // Lowercase hex of 32 bytes, the same format the client generates
            return Convert.ToHexStringLower(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(username.ToLowerInvariant())));
        }

        /// <summary>
        /// Stores a new refresh token (only its hash) for the user and returns it with a fresh access token.
        /// </summary>
        private async Task<AuthResponseDto> IssueTokensAsync(User user, CancellationToken cancellationToken)
        {
            string rawRefreshToken = _tokenService.GenerateRefreshToken();
            RefreshToken refreshToken = new()
            {
                UserId = user.Id,
                TokenHash = _tokenService.HashRefreshToken(rawRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays)
            };
            await _refreshTokenRepository.AddAsync(refreshToken, cancellationToken);
            return new()
            {
                AccessToken = _tokenService.GenerateAccessToken(user),
                RefreshToken = rawRefreshToken
            };
        }
    }
}
