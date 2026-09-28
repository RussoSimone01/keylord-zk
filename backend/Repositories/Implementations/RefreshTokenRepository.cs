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
			return await _db.RefreshTokens.Include(t => t.User).SingleOrDefaultAsync(t => t.TokenHash == hash);
		}

		/// <summary>
		/// Revokes the token only if it is still active. Returns false if it was already revoked, e.g. by a concurrent request.
		/// </summary>
		public async Task<bool> TryRevokeAsync(long tokenId)
		{
			int updated = await _db.RefreshTokens
				.Where(t => t.Id == tokenId && t.RevokedAt == null)
				.ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
			return updated == 1;
		}

		public async Task RevokeAllByUserAsync(long userId)
		{
			await _db.RefreshTokens
				.Where(t => t.UserId == userId && t.RevokedAt == null)
				.ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow));
		}

		public async Task DeleteByHashAsync(string hash)
		{
			await _db.RefreshTokens.Where(t => t.TokenHash == hash).ExecuteDeleteAsync();
		}

		public async Task DeleteAllByUserAsync(long userId)
		{
			await _db.RefreshTokens.Where(t => t.UserId == userId).ExecuteDeleteAsync();
		}

		/// <summary>
		/// Deletes expired tokens, revoked or not: an expired token is rejected anyway, so it is no longer needed for reuse detection.
		/// </summary>
		public async Task<int> DeleteExpiredAsync(DateTime now)
		{
			return await _db.RefreshTokens.Where(t => t.ExpiresAt <= now).ExecuteDeleteAsync();
		}
	}
}
