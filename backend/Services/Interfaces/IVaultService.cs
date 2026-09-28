using backend.DTOs;

namespace backend.Services.Interfaces
{
    public interface IVaultService
    {
        public Task<CredentialResponseDto> CreateCredentialAsync(long userId, string keyStamp, CredentialDto request, CancellationToken cancellationToken);
        public Task<IEnumerable<CredentialResponseDto>> GetCredentialsAsync(long userId, CancellationToken cancellationToken);
        public Task UpdateCredentialAsync(long userId, string keyStamp, long credentialId, CredentialDto request, CancellationToken cancellationToken);
        public Task DeleteCredentialAsync(long userId, long credentialId, CancellationToken cancellationToken);
    }
}
