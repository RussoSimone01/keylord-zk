using backend.Data;
using backend.Models;
using backend.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories.Implementations
{
    // Reads are not tracked: every update goes through ExecuteUpdate.
    // Username and email comparisons are case-insensitive, backed by unique indexes on LOWER(...) (see migration CaseInsensitiveUniqueness).
    public class UserRepository(AppDbContext appDbContext) : IUserRepository
    {
        private readonly AppDbContext _db = appDbContext;

        public async Task AddAsync(User user, CancellationToken cancellationToken)
        {
            await _db.Users.AddAsync(user, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        public async Task<User?> GetByIdAsync(long userId, CancellationToken cancellationToken)
        {
            return await _db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }

        public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken)
        {
            string normalized = username.ToLowerInvariant();
            return await _db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Username.ToLower() == normalized, cancellationToken);
        }

        public async Task<string?> GetKdfSaltAsync(long userId, CancellationToken cancellationToken)
        {
            return await _db.Users.Where(u => u.Id == userId).Select(u => u.KdfSalt).SingleOrDefaultAsync(cancellationToken);
        }

        public async Task<DateTime?> GetLockedUntilAsync(long userId, CancellationToken cancellationToken)
        {
            return await _db.Users.Where(u => u.Id == userId).Select(u => u.LockedUntil).SingleOrDefaultAsync(cancellationToken);
        }

        public async Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken)
        {
            string normalized = username.ToLowerInvariant();
            return await _db.Users.AnyAsync(u => u.Username.ToLower() == normalized, cancellationToken);
        }

        public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken)
        {
            string normalized = email.ToLowerInvariant();
            return await _db.Users.AnyAsync(u => u.Email != null && u.Email.ToLower() == normalized, cancellationToken);
        }

        /// <summary>
        /// Locks the user row until the end of the current transaction.
        /// Inserts into tables referencing the user wait as well, since the foreign key check takes a conflicting lock on the row.
        /// </summary>
        public async Task LockForUpdateAsync(long userId, CancellationToken cancellationToken)
        {
            await _db.Database.ExecuteSqlAsync($"""SELECT 1 FROM "Users" WHERE "Id" = {userId} FOR UPDATE""", cancellationToken);
        }

        /// <summary>
        /// Takes a shared lock on the user row until the end of the current transaction.
        /// It conflicts only with LockForUpdateAsync (password change), not with updates of non-key columns such as the lockout counters.
        /// </summary>
        public async Task LockForKeyShareAsync(long userId, CancellationToken cancellationToken)
        {
            await _db.Database.ExecuteSqlAsync($"""SELECT 1 FROM "Users" WHERE "Id" = {userId} FOR KEY SHARE""", cancellationToken);
        }

        public async Task UpdatePasswordAsync(long userId, string newAuthKeyHash, string newSalt, long newKdfIterations, CancellationToken cancellationToken)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.AuthKeyHash, newAuthKeyHash)
                    .SetProperty(u => u.KdfSalt, newSalt)
                    .SetProperty(u => u.KdfIterations, newKdfIterations)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow),
                    cancellationToken
                );
        }

        public async Task UpdateEmailAsync(long userId, string newEmail, CancellationToken cancellationToken)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.Email, newEmail)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow),
                    cancellationToken
                );
        }

        /// <summary>
        /// Counts an authentication attempt and, when it reaches a multiple of the schedule, locks the account.
        /// Returns false if the account is currently locked (nothing is updated).
        /// A single UPDATE: the row lock serializes concurrent attempts and PostgreSQL re-evaluates the WHERE after waiting,
        /// so attempts arriving after a lock has been set are rejected.
        /// </summary>
        public async Task<bool> TryRegisterAttemptAsync(long userId, DateTime now, LockoutSchedule schedule, CancellationToken cancellationToken)
        {
            int attemptsPerLock = schedule.AttemptsPerLock;
            DateTime? firstLockUntil = now + schedule.FirstLock;
            DateTime? secondLockUntil = now + schedule.SecondLock;
            DateTime? subsequentLockUntil = now + schedule.SubsequentLocks;
            // SET expressions read the values before the update, hence the explicit "+ 1"
            int updated = await _db.Users
                .Where(u => u.Id == userId && (u.LockedUntil == null || u.LockedUntil <= now))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.FailedLoginAttempts, u => u.FailedLoginAttempts + 1)
                    .SetProperty(u => u.LockedUntil, u => (u.FailedLoginAttempts + 1) % attemptsPerLock != 0
                        ? u.LockedUntil
                        : u.FailedLoginAttempts + 1 == attemptsPerLock
                            ? firstLockUntil
                            : u.FailedLoginAttempts + 1 == attemptsPerLock * 2
                                ? secondLockUntil
                                : subsequentLockUntil)
                    .SetProperty(u => u.UpdatedAt, now),
                    cancellationToken
                );
            return updated == 1;
        }

        public async Task ResetLockoutAsync(long userId, CancellationToken cancellationToken)
        {
            await _db.Users.Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.FailedLoginAttempts, 0)
                    .SetProperty(u => u.LockedUntil, (DateTime?)null)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow),
                    cancellationToken
                );
        }

        public async Task DeleteAsync(long userId, CancellationToken cancellationToken)
        {
            await _db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(cancellationToken);
        }
    }
}
