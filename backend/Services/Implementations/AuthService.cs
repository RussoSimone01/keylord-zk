using backend.DTOs;
using backend.Models;
using backend.Repositories.Interfaces;
using backend.Services.Interfaces;

namespace backend.Services.Implementations
{
    public class AuthService(IConfiguration configuration, IUserRepository userRepository, ITokenService tokenService) : IAuthService
    {
        private readonly IConfiguration _config = configuration;
        private readonly IUserRepository _userRepository = userRepository;
        private readonly ITokenService _tokenService = tokenService;

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            throw new NotImplementedException();
        }

        public Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            throw new NotImplementedException();
        }

        public Task<AuthResponseDto> RefreshAsync(RefreshRequestDto request)
        {
            throw new NotImplementedException();
        }

        public Task ChangePasswordAsync(ChangePasswordRequestDto request)
        {
            throw new NotImplementedException();
        }
    }
}