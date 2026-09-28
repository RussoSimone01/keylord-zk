using backend.Data;
using backend.DTOs;
using backend.Errors;
using backend.Models;
using backend.Repositories.Interfaces;
using backend.Services.Interfaces;
using backend.Validation;

namespace backend.Services.Implementations
{
    public class VaultService(AppDbContext appDbContext, ICredentialRepository credentialRepository, IUserRepository userRepository, ITokenService tokenService) : IVaultService
    {
        private readonly AppDbContext _db = appDbContext;
        private readonly ICredentialRepository _credentialRepository = credentialRepository;
        private readonly IUserRepository _userRepository = userRepository;
        private readonly ITokenService _tokenService = tokenService;

        public async Task<CredentialResponseDto> CreateCredentialAsync(long userId, string keyStamp, CredentialDto request, CancellationToken cancellationToken)
        {
            // Disposing the transaction without committing rolls it back
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            await EnsureCurrentKeyAsync(userId, keyStamp, cancellationToken);
            if (await _credentialRepository.CountByUserAsync(userId, cancellationToken) >= VaultLimits.MaxCredentialsPerUser)
            {
                throw new ApiException(AppErrors.VaultFull);
            }
            Credential credential = new()
            {
                UserId = userId,
                EncryptedData = request.EncryptedData
            };
            await _credentialRepository.AddAsync(credential, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new()
            {
                Id = credential.Id,
                EncryptedData = credential.EncryptedData
            };
        }

        public async Task<IEnumerable<CredentialResponseDto>> GetCredentialsAsync(long userId, CancellationToken cancellationToken)
        {
            return (await _credentialRepository.GetAllByUserAsync(userId, cancellationToken))
                .Select(c => new CredentialResponseDto()
                {
                    Id = c.Id,
                    EncryptedData = c.EncryptedData
                });
        }

        public async Task UpdateCredentialAsync(long userId, string keyStamp, long credentialId, CredentialDto request, CancellationToken cancellationToken)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            await EnsureCurrentKeyAsync(userId, keyStamp, cancellationToken);
            await GetOwnedCredentialAsync(userId, credentialId, cancellationToken);
            await _credentialRepository.UpdateAsync(credentialId, request.EncryptedData, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        public async Task DeleteCredentialAsync(long userId, long credentialId, CancellationToken cancellationToken)
        {
            await GetOwnedCredentialAsync(userId, credentialId, cancellationToken);
            await _credentialRepository.DeleteAsync(credentialId, cancellationToken);
        }

        /// <summary>
        /// Guarantees that encrypted data is written only with the current key. Must run inside a transaction:
        /// the shared lock on the user row conflicts with the one taken by the password change, so a write either
        /// completes before the change starts (which then detects it and aborts) or waits for it and is rejected here,
        /// because the salt, and therefore the key stamp, has changed.
        /// </summary>
        private async Task EnsureCurrentKeyAsync(long userId, string keyStamp, CancellationToken cancellationToken)
        {
            await _userRepository.LockForKeyShareAsync(userId, cancellationToken);
            string? kdfSalt = await _userRepository.GetKdfSaltAsync(userId, cancellationToken);
            if (kdfSalt is null || _tokenService.ComputeKeyStamp(kdfSalt) != keyStamp)
            {
                throw new ApiException(AppErrors.SessionInvalid);
            }
        }

        /// <summary>
        /// Returns the credential if it belongs to the user. Credentials of other users are reported as missing, so ids cannot be probed.
        /// </summary>
        private async Task<Credential> GetOwnedCredentialAsync(long userId, long credentialId, CancellationToken cancellationToken)
        {
            Credential? credential = await _credentialRepository.GetByIdAsync(credentialId, cancellationToken);
            if (credential is null || credential.UserId != userId)
            {
                throw new ApiException(AppErrors.CredentialNotFound);
            }
            return credential;
        }
    }
}
