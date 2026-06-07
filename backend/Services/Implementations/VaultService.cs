using backend.DTOs;
using backend.Models;
using backend.Repositories.Interfaces;
using backend.Services.Interfaces;

namespace backend.Services.Implementations
{
    public class VaultService(ICredentialRepository credentialRepository) : IVaultService
    {
        private readonly ICredentialRepository _credentialRepository = credentialRepository;

        public async Task<CredentialResponseDto> CreateCredentialAsync(long userId, CredentialDto request)
        {
            Credential credential = new()
            {
                UserId = userId,
                EncryptedData = request.EncryptedData
            };
            await _credentialRepository.AddAsync(credential);
            return new()
            {
                Id = credential.Id,
                EncryptedData = credential.EncryptedData
            };
        }

        public async Task<IEnumerable<CredentialResponseDto>> GetCredentialsAsync(long userId)
        {
            return (await _credentialRepository.GetAllByUserAsync(userId))
                .Select(c => new CredentialResponseDto()
                {
                    Id = c.Id,
                    EncryptedData = c.EncryptedData
                });
        }

        public async Task UpdateCredentialAsync(long userId, long credentialId, CredentialDto request)
        {
            Credential credential = await _credentialRepository.GetByIdAsync(credentialId)
                ?? throw new Exception("Credential not found");
            if (credential.UserId != userId)
            {
                throw new Exception("User does not own this credential");
            }
            await _credentialRepository.UpdateAsync(credentialId, request.EncryptedData);
        }

        public async Task DeleteCredentialAsync(long userId, long credentialId)
        {
            Credential credential = await _credentialRepository.GetByIdAsync(credentialId)
                ?? throw new Exception("Credential not found");
            if (credential.UserId != userId)
            {
                throw new Exception("User does not own this credential");
            }
            await _credentialRepository.DeleteAsync(credentialId);
        }
    }
}