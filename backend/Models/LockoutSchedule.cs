namespace backend.Models
{
	/// <summary>
	/// Failed-attempt lockout: every AttemptsPerLock consecutive failures lock the account, for FirstLock, then SecondLock, then SubsequentLocks each time.
	/// </summary>
	public sealed record LockoutSchedule(int AttemptsPerLock, TimeSpan FirstLock, TimeSpan SecondLock, TimeSpan SubsequentLocks);
}
