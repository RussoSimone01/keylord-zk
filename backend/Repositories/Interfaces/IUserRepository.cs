using backend.Models;

namespace backend.Repositories.Interfaces
{
    public interface IUserRepository
    {
        public Task AddAsync(User user);
        public Task<User?> GetByIdAsync(long userId);
        public Task<User?> GetByUsernameAsync(string username);
        public Task<bool> ExistsByUsernameAsync(string username);
        public Task<bool> ExistsByEmailAsync(string email);
        public Task UpdatePasswordAsync(long userId, string newAuthKeyHash, string newSalt);
        public Task UpdateEmailAsync(long userId, string newEmail);
        public Task UpdateLoginAttemptsAsync(long userId, int attempts, DateTime? lockedUntil);
        public Task ResetLockoutAsync(long userId);
    }
}