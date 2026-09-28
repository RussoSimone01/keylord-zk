using backend.Repositories.Interfaces;

namespace backend.Services.Background
{
	/// <summary>
	/// Periodically deletes expired refresh tokens, at startup and then every <see cref="Interval"/>.
	/// </summary>
	public class RefreshTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<RefreshTokenCleanupService> logger) : BackgroundService
	{
		private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

		protected override async Task ExecuteAsync(CancellationToken stoppingToken)
		{
			using PeriodicTimer timer = new(Interval);
			do
			{
				try
				{
					// Repositories are scoped: one scope per run
					await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
					IRefreshTokenRepository repository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
					int deleted = await repository.DeleteExpiredAsync(DateTime.UtcNow);
					logger.LogInformation("Deleted {Count} expired refresh tokens", deleted);
				}
				catch (Exception ex) when (ex is not OperationCanceledException)
				{
					// A failed run is retried at the next tick instead of stopping the service
					logger.LogError(ex, "Refresh token cleanup failed");
				}
			}
			while (await timer.WaitForNextTickAsync(stoppingToken));
		}
	}
}
