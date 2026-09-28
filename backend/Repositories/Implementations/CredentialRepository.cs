using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories.Implementations
{
    public class CredentialRepository(AppDbContext appDbContext) : ICredentialRepository
    {
        private readonly AppDbContext _db = appDbContext;

        public async Task AddAsync(Credential credential, CancellationToken cancellationToken)
        {
            await _db.Credentials.AddAsync(credential, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        public async Task<Credential?> GetByIdAsync(long credentialId, CancellationToken cancellationToken)
        {
            return await _db.Credentials.SingleOrDefaultAsync(c => c.Id == credentialId, cancellationToken);
        }

        public async Task<IEnumerable<Credential>> GetAllByUserAsync(long userId, CancellationToken cancellationToken)
        {
            return await _db.Credentials.Where(c => c.UserId == userId).ToListAsync(cancellationToken);
        }

        public async Task<int> CountByUserAsync(long userId, CancellationToken cancellationToken)
        {
            return await _db.Credentials.CountAsync(c => c.UserId == userId, cancellationToken);
        }

        public async Task UpdateAsync(long credentialId, string encryptedData, CancellationToken cancellationToken)
        {
            await _db.Credentials.Where(c => c.Id == credentialId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.EncryptedData, encryptedData)
                    .SetProperty(c => c.UpdatedAt, DateTime.UtcNow),
                    cancellationToken
                );
        }

        /// <summary>
        /// Overwrites the encrypted data of every credential of the user, keeping their ids.
        /// Returns false without writing if the supplied ids are not exactly the user's current credentials,
        /// or if any credential changed since the client read it (stored digest different from PreviousDigest).
        /// </summary>
        public async Task<bool> TryReplaceAllEncryptedDataAsync(long userId, IReadOnlyDictionary<long, CredentialReplacement> replacementsById, CancellationToken cancellationToken)
        {
            List<Credential> credentials = await _db.Credentials.Where(c => c.UserId == userId).ToListAsync(cancellationToken);
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
            await _db.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task DeleteAsync(long credentialId, CancellationToken cancellationToken)
        {
            await _db.Credentials.Where(c => c.Id == credentialId).ExecuteDeleteAsync(cancellationToken);
        }
    }
}
