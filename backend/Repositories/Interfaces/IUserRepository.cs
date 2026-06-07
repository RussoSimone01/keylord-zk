using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface IUserRepository
    {
        public Task AddAsync(User user);
        public Task<User?> GetByUsernameAsync(string username);
        public Task<bool> ExistsAsync(string username, string? email);
        public Task UpdatePasswordAsync(long userId, string newAuthKeyHash, string newSalt);
        public Task UpdateEmailAsync(long userId, string newEmail);
        public Task UpdateLoginAttemptsAsync(long userId, int attempts, DateTime? lockedUntil);
        public Task ResetLockoutAsync(long userId);
    }
}