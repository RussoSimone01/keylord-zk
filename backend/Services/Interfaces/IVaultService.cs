using backend.DTOs;

namespace backend.Services.Interfaces
{
    public interface IVaultService
    {
        public Task<CredentialResponseDto> CreateCredentialAsync(long userId, CredentialDto request);
        public Task<IEnumerable<CredentialResponseDto>> GetCredentialsAsync(long userId);
        public Task UpdateCredentialAsync(long userId, long credentialId, CredentialDto request);
        public Task DeleteCredentialAsync(long userId, long credentialId);
    }
}