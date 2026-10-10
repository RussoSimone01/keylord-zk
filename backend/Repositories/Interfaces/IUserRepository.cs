using backend.Models;

namespace backend.Repositories.Interfaces
{
    public record UserKeyState(string KdfSalt, int VaultKeyEpoch);

    public interface IUserRepository
    {
        public Task AddAsync(User user, CancellationToken cancellationToken);
        public Task<User?> GetByIdAsync(long userId, CancellationToken cancellationToken);
        public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken);
        public Task<UserKeyState?> GetKeyStateAsync(long userId, CancellationToken cancellationToken);
        public Task<DateTime?> GetLockedUntilAsync(long userId, CancellationToken cancellationToken);
        public Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken);
        public Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken);
        public Task LockForUpdateAsync(long userId, CancellationToken cancellationToken);
        public Task LockForKeyShareAsync(long userId, CancellationToken cancellationToken);
        public Task UpdatePasswordAsync(long userId, string newAuthKeyHash, string newSalt, long newKdfIterations, string? newWrappedVaultKey, CancellationToken cancellationToken);
        public Task UpdateEmailAsync(long userId, string newEmail, CancellationToken cancellationToken);
        public Task UpdateVaultKeyAsync(long userId, string wrappedVaultKey, CancellationToken cancellationToken);
        public Task<bool> TryRegisterAttemptAsync(long userId, DateTime now, LockoutSchedule schedule, CancellationToken cancellationToken);
        public Task ResetLockoutAsync(long userId, CancellationToken cancellationToken);
        public Task DeleteAsync(long userId, CancellationToken cancellationToken);
    }
}
