using backend.DTOs;

namespace backend.Services.Interfaces
{
    public interface IAuthService
    {
        public Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken);
        public Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken);
        public Task<AuthResponseDto> RefreshAsync(RefreshRequestDto request, CancellationToken cancellationToken);
        public Task<AuthResponseDto> ChangePasswordAsync(long userId, ChangePasswordRequestDto request, CancellationToken cancellationToken);
        public Task<SaltResponseDto> GetSaltAsync(string username, CancellationToken cancellationToken);
        public Task<bool> VerifyPasswordAsync(long userId, VerifyPasswordRequestDto request, CancellationToken cancellationToken);
        public Task DeleteAccountAsync(long userId, DeleteAccountRequestDto request, CancellationToken cancellationToken);
        public Task LogoutAsync(RefreshRequestDto request, CancellationToken cancellationToken);
    }
}
