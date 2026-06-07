using backend.DTOs;

namespace backend.Services.Interfaces
{
    public interface IAuthService
    {
        public Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request);
        public Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
        public Task<AuthResponseDto> RefreshAsync(RefreshRequestDto request);
        public Task ChangePasswordAsync(ChangePasswordRequestDto request);
    }
}