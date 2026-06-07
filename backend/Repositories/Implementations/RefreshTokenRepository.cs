using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories.Implementations
{
    public class RefreshTokenRepository(AppDbContext appDbContext) : IRefreshTokenRepository
    {
        private readonly AppDbContext _db = appDbContext;

        public async Task AddAsync(RefreshToken token)
        {
            await _db.AddAsync(token);
            await _db.SaveChangesAsync();
        }

        public async Task<RefreshToken?> GetByTokenHashAsync(string hash)
        {
            return await _db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash);
        }

        public async Task RevokeAsync(long tokenId)
        {
            await _db.RefreshTokens.Where(t => t.Id == tokenId).ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
        }

        public async Task RevokeAllByUserAsync(long userId)
        {
            await _db.RefreshTokens.Where(t => t.UserId == userId).ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
        }
    }
}