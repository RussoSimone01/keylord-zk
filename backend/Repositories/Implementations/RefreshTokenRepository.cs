using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories.Implementations
{
    public class RefreshTokenRepository(AppDbContext appDbContext) : IRefreshTokenRepository
    {
        private readonly AppDbContext _db = appDbContext;

        public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken)
        {
            await _db.AddAsync(token, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        public async Task<RefreshToken?> GetByTokenHashAsync(string hash, CancellationToken cancellationToken)
        {
            return await _db.RefreshTokens.Include(t => t.User).SingleOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);
        }

        /// <summary>
        /// Revokes the token only if it is still active. Returns false if it was already revoked, e.g. by a concurrent request.
        /// </summary>
        public async Task<bool> TryRevokeAsync(long tokenId, CancellationToken cancellationToken)
        {
            int updated = await _db.RefreshTokens
                .Where(t => t.Id == tokenId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), cancellationToken);
            return updated == 1;
        }

        public async Task RevokeAllByUserAsync(long userId, CancellationToken cancellationToken)
        {
            await _db.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), cancellationToken);
        }

        public async Task DeleteByHashAsync(string hash, CancellationToken cancellationToken)
        {
            await _db.RefreshTokens.Where(t => t.TokenHash == hash).ExecuteDeleteAsync(cancellationToken);
        }

        public async Task DeleteAllByUserAsync(long userId, CancellationToken cancellationToken)
        {
            await _db.RefreshTokens.Where(t => t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        }

        /// <summary>
        /// Deletes expired tokens, revoked or not: an expired token is rejected anyway, so it is no longer needed for reuse detection.
        /// </summary>
        public async Task<int> DeleteExpiredAsync(DateTime now, CancellationToken cancellationToken)
        {
            return await _db.RefreshTokens.Where(t => t.ExpiresAt <= now).ExecuteDeleteAsync(cancellationToken);
        }
    }
}
