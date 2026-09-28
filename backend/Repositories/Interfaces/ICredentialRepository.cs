using backend.Models;

namespace backend.Repositories.Interfaces
{
	public interface ICredentialRepository
	{
		public Task AddAsync(Credential credential);
		public Task<Credential?> GetByIdAsync(long credentialId);
		public Task<IEnumerable<Credential>> GetAllByUserAsync(long userId);
		public Task<int> CountByUserAsync(long userId);
		public Task UpdateAsync(long credentialId, string encryptedData);
		public Task<bool> TryReplaceAllEncryptedDataAsync(long userId, IReadOnlyDictionary<long, CredentialReplacement> replacementsById);
		public Task DeleteAsync(long credentialId);
	}
}
