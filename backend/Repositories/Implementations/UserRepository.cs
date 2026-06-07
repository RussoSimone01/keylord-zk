using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories.Implementations
{
    public class UserRepository(AppDbContext appDbContext) : IUserRepository
    {
        private readonly AppDbContext _db = appDbContext;

        public async Task AddAsync(User user)
        {
            await _db.Users.AddAsync(user);
            await _db.SaveChangesAsync();
        }

        public async Task<bool> ExistsByUsernameAsync(string username)
        {
            return await _db.Users.AnyAsync(u => u.Username == username);
        }

        public async Task<bool> ExistsByEmailAsync(string email)
        {
            return await _db.Users.AnyAsync(u => u.Email == email);
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _db.Users.SingleOrDefaultAsync(u => u.Username == username);
        }

        public async Task UpdatePasswordAsync(long userId, string newAuthKeyHash, string newSalt)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.AuthKeyHash, newAuthKeyHash)
                    .SetProperty(u => u.KdfSalt, newSalt)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow)
                );
        }

        public async Task UpdateEmailAsync(long userId, string newEmail)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.Email, newEmail)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow)
                );
        }

        public async Task UpdateLoginAttemptsAsync(long userId, int attempts, DateTime? lockedUntil)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.FailedLoginAttempts, attempts)
                    .SetProperty(u => u.LockedUntil, lockedUntil)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow)
                );
        }

        public async Task ResetLockoutAsync(long userId)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.FailedLoginAttempts, 0)
                    .SetProperty(u => u.LockedUntil, (DateTime?)null)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow)
                );
        }
    }
}