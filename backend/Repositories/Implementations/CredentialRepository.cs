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

        public async Task AddRangeAsync(IEnumerable<Credential> credentials)
        {
            await _db.Credentials.AddRangeAsync(credentials);
            await _db.SaveChangesAsync();
        }

        public async Task<IEnumerable<Credential>> GetAllByUserAsync(long userId)
        {
            return await _db.Credentials.Where(c => c.UserId == userId).ToListAsync();
        }

        public async Task UpdateAsync(long credentialId, string encryptedData)
        {
            await _db.Credentials.Where(c => c.Id == credentialId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.EncryptedData, encryptedData)
                    .SetProperty(c => c.UpdatedAt, DateTime.UtcNow)
                );
        }

        public async Task DeleteAsync(long credentialId)
        {
            await _db.Credentials.Where(c => c.Id == credentialId).ExecuteDeleteAsync();
        }

        public async Task DeleteAllByUserAsync(long userId)
        {
            await _db.Credentials.Where(c => c.UserId == userId).ExecuteDeleteAsync();
        }
    }
}