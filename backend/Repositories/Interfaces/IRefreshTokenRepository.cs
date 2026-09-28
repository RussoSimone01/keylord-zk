using backend.Models;

namespace backend.Repositories.Interfaces
{
	public interface IRefreshTokenRepository
	{
		public Task AddAsync(RefreshToken token);
		public Task<RefreshToken?> GetByTokenHashAsync(string hash);
		public Task<bool> TryRevokeAsync(long tokenId);
		public Task RevokeAllByUserAsync(long userId);
		public Task DeleteByHashAsync(string hash);
		public Task DeleteAllByUserAsync(long userId);
		public Task<int> DeleteExpiredAsync(DateTime now);
	}
}
