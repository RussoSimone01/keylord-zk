using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface IRefreshTokenRepository
    {
        public Task AddAsync(RefreshToken token, CancellationToken cancellationToken);
        public Task<RefreshToken?> GetByTokenHashAsync(string hash, CancellationToken cancellationToken);
        public Task<bool> TryRevokeAsync(long tokenId, CancellationToken cancellationToken);
        public Task RevokeAllByUserAsync(long userId, CancellationToken cancellationToken);
        public Task DeleteByHashAsync(string hash, CancellationToken cancellationToken);
        public Task DeleteAllByUserAsync(long userId, CancellationToken cancellationToken);
        public Task<int> DeleteExpiredAsync(DateTime now, CancellationToken cancellationToken);
    }
}
