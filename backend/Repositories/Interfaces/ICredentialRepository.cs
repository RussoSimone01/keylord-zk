using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface ICredentialRepository
    {
        public Task AddAsync(Credential credential);
        public Task AddRangeAsync(IEnumerable<Credential> credentials);
        public Task<IEnumerable<Credential>> GetAllByUserAsync(long userId);
        public Task UpdateAsync(long credentialId, string encryptedData);
        public Task DeleteAsync(long credentialId);
        public Task DeleteAllByUserAsync(long userId);
    }
}