using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories.Implementations
{
	public class CredentialRepository(AppDbContext appDbContext) : ICredentialRepository
	{
		private readonly AppDbContext _db = appDbContext;

		public async Task AddAsync(Credential credential)
		{
			await _db.Credentials.AddAsync(credential);
			await _db.SaveChangesAsync();
		}

		public async Task<Credential?> GetByIdAsync(long credentialId)
		{
			return await _db.Credentials.SingleOrDefaultAsync(c => c.Id == credentialId);
		}

		public async Task<IEnumerable<Credential>> GetAllByUserAsync(long userId)
		{
			return await _db.Credentials.Where(c => c.UserId == userId).ToListAsync();
		}

		public async Task<int> CountByUserAsync(long userId)
		{
			return await _db.Credentials.CountAsync(c => c.UserId == userId);
		}

		public async Task UpdateAsync(long credentialId, string encryptedData)
		{
			await _db.Credentials.Where(c => c.Id == credentialId)
				.ExecuteUpdateAsync(s => s
					.SetProperty(c => c.EncryptedData, encryptedData)
					.SetProperty(c => c.UpdatedAt, DateTime.UtcNow)
				);
		}

		/// <summary>
		/// Overwrites the encrypted data of every credential of the user, keeping their ids.
		/// Returns false without writing if the supplied ids are not exactly the user's current credentials,
		/// or if any credential changed since the client read it (stored digest different from PreviousDigest).
		/// </summary>
		public async Task<bool> TryReplaceAllEncryptedDataAsync(long userId, IReadOnlyDictionary<long, CredentialReplacement> replacementsById)
		{
			List<Credential> credentials = await _db.Credentials.Where(c => c.UserId == userId).ToListAsync();
			bool matches = credentials.Count == replacementsById.Count
				&& credentials.All(c => replacementsById.TryGetValue(c.Id, out CredentialReplacement? replacement)
					&& CredentialReplacement.Digest(c.EncryptedData) == replacement.PreviousDigest);
			if (!matches)
			{
				return false;
			}
			foreach (Credential credential in credentials)
			{
				credential.EncryptedData = replacementsById[credential.Id].EncryptedData;
			}
			await _db.SaveChangesAsync();
			return true;
		}

		public async Task DeleteAsync(long credentialId)
		{
			await _db.Credentials.Where(c => c.Id == credentialId).ExecuteDeleteAsync();
		}
	}
}
