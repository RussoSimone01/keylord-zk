using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface IRefreshTokenRepository
    {
        public Task AddAsync(RefreshToken token);
        public Task<RefreshToken?> GetByTokenHashAsync(string hash);
        public Task RevokeAsync(long tokenId);
        public Task RevokeAllByUserAsync(long userId);
    }
}