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

        /// <summary>
        /// Creates and overwrites credentials in a single transaction: either the whole import is applied or nothing is.
        /// </summary>
        public async Task<ImportCredentialsResponseDto> ImportCredentialsAsync(long userId, string keyStamp, ImportCredentialsRequestDto request, CancellationToken cancellationToken)
        {
            if (request.Credentials.Length == 0 && request.Replacements.Length == 0)
            {
                throw new ApiException(AppErrors.ImportEmpty);
            }
            if (request.Replacements.DistinctBy(r => r.Id).Count() != request.Replacements.Length)
            {
                throw new ApiException(AppErrors.DuplicateCredentialIds);
            }
            Dictionary<long, CredentialReplacement> replacementsById = request.Replacements.ToDictionary(
                r => r.Id,
                r => new CredentialReplacement(r.PreviousDigest, r.EncryptedData)
            );

            // Disposing the transaction without committing rolls it back
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            await EnsureCurrentKeyAsync(userId, keyStamp, cancellationToken);
            int count = await _credentialRepository.CountByUserAsync(userId, cancellationToken);
            if (count + request.Credentials.Length > VaultLimits.MaxCredentialsPerUser)
            {
                throw new ApiException(AppErrors.VaultFull);
            }
            // Credentials deleted or edited after the client built the import abort it, so no change is overwritten unseen
            if (replacementsById.Count > 0 && !await _credentialRepository.TryReplaceEncryptedDataAsync(userId, replacementsById, cancellationToken))
            {
                throw new ApiException(AppErrors.ImportOutOfSync);
            }
            List<Credential> created = [.. request.Credentials.Select(c => new Credential()
            {
                UserId = userId,
                EncryptedData = c.EncryptedData
            })];
            if (created.Count > 0)
            {
                await _credentialRepository.AddRangeAsync(created, cancellationToken);
            }
            await transaction.CommitAsync(cancellationToken);
            return new()
            {
                Created = created.Select(c => new CredentialResponseDto()
                {
                    Id = c.Id,
                    EncryptedData = c.EncryptedData
                })
            };
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
            UserKeyState? state = await _userRepository.GetKeyStateAsync(userId, cancellationToken);
            if (state is null || _tokenService.ComputeKeyStamp(state.KdfSalt, state.VaultKeyEpoch) != keyStamp)
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
