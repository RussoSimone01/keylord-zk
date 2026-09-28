using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface ICredentialRepository
    {
        public Task AddAsync(Credential credential, CancellationToken cancellationToken);
        public Task<Credential?> GetByIdAsync(long credentialId, CancellationToken cancellationToken);
        public Task<IEnumerable<Credential>> GetAllByUserAsync(long userId, CancellationToken cancellationToken);
        public Task<int> CountByUserAsync(long userId, CancellationToken cancellationToken);
        public Task UpdateAsync(long credentialId, string encryptedData, CancellationToken cancellationToken);
        public Task<bool> TryReplaceAllEncryptedDataAsync(long userId, IReadOnlyDictionary<long, CredentialReplacement> replacementsById, CancellationToken cancellationToken);
        public Task DeleteAsync(long credentialId, CancellationToken cancellationToken);
    }
}
