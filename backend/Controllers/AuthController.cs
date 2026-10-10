using backend.DTOs;
using backend.Extensions;
using backend.Services.Interfaces;
using backend.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(IAuthService authService) : ControllerBase
    {
        private readonly IAuthService _authService = authService;

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequestDto request, CancellationToken cancellationToken)
        {
            return Ok(await _authService.RegisterAsync(request, cancellationToken));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequestDto request, CancellationToken cancellationToken)
        {
            return Ok(await _authService.LoginAsync(request, cancellationToken));
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(RefreshRequestDto request, CancellationToken cancellationToken)
        {
            return Ok(await _authService.RefreshAsync(request, cancellationToken));
        }

        // No authentication: the access token may already be expired when the user logs out
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(RefreshRequestDto request, CancellationToken cancellationToken)
        {
            await _authService.LogoutAsync(request, cancellationToken);
            return NoContent();
        }

        [HttpGet("salt/{username}")]
        public async Task<IActionResult> GetSalt(string username, CancellationToken cancellationToken)
        {
            return Ok(await _authService.GetSaltAsync(username, cancellationToken));
        }

        [Authorize]
        [HttpPut("change-password")]
        [RequestSizeLimit(VaultLimits.ChangePasswordMaxRequestBodyBytes)]
        public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto request, CancellationToken cancellationToken)
        {
            return Ok(await _authService.ChangePasswordAsync(User.GetUserId(), request, cancellationToken));
        }

        [Authorize]
        [HttpPost("verify-password")]
        public async Task<IActionResult> VerifyPassword(VerifyPasswordRequestDto request, CancellationToken cancellationToken)
        {
            bool isValid = await _authService.VerifyPasswordAsync(User.GetUserId(), request, cancellationToken);
            return Ok(new { isValid });
        }

        [Authorize]
        [HttpDelete("account")]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequestDto request, CancellationToken cancellationToken)
        {
            await _authService.DeleteAccountAsync(User.GetUserId(), request, cancellationToken);
            return NoContent();
        }

        [HttpPost("rotate-vault-key")]
        public async Task<IActionResult> RotateVaultKey(RotateVaultKeyRequestDto request, CancellationToken cancellationToken)
        {
            return Ok(await _authService.RotateVaultKeyAsync(User.GetUserId(), request, cancellationToken));
        }
    }
}
