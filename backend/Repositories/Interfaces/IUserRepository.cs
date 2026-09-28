using backend.Models;

namespace backend.Repositories.Interfaces
{
	public interface IUserRepository
	{
		public Task AddAsync(User user);
		public Task<User?> GetByIdAsync(long userId);
		public Task<User?> GetByUsernameAsync(string username);
		public Task<string?> GetKdfSaltAsync(long userId);
		public Task<DateTime?> GetLockedUntilAsync(long userId);
		public Task<bool> ExistsByUsernameAsync(string username);
		public Task<bool> ExistsByEmailAsync(string email);
		public Task LockForUpdateAsync(long userId);
		public Task LockForKeyShareAsync(long userId);
		public Task UpdatePasswordAsync(long userId, string newAuthKeyHash, string newSalt, long newKdfIterations);
		public Task UpdateEmailAsync(long userId, string newEmail);
		public Task<bool> TryRegisterAttemptAsync(long userId, DateTime now, LockoutSchedule schedule);
		public Task ResetLockoutAsync(long userId);
		public Task DeleteAsync(long userId);
	}
}
