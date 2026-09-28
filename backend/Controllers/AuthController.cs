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
		public async Task<IActionResult> Register(RegisterRequestDto request)
		{
			return Ok(await _authService.RegisterAsync(request));
		}

		[HttpPost("login")]
		public async Task<IActionResult> Login(LoginRequestDto request)
		{
			return Ok(await _authService.LoginAsync(request));
		}

		[HttpPost("refresh")]
		public async Task<IActionResult> Refresh(RefreshRequestDto request)
		{
			return Ok(await _authService.RefreshAsync(request));
		}

		// No authentication: the access token may already be expired when the user logs out
		[HttpPost("logout")]
		public async Task<IActionResult> Logout(RefreshRequestDto request)
		{
			await _authService.LogoutAsync(request);
			return NoContent();
		}

		[HttpGet("salt/{username}")]
		public async Task<IActionResult> GetSalt(string username)
		{
			return Ok(await _authService.GetSaltAsync(username));
		}

		[Authorize]
		[HttpPut("change-password")]
		[RequestSizeLimit(VaultLimits.ChangePasswordMaxRequestBodyBytes)]
		public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto request)
		{
			return Ok(await _authService.ChangePasswordAsync(User.GetUserId(), request));
		}

		[Authorize]
		[HttpPost("verify-password")]
		public async Task<IActionResult> VerifyPassword(VerifyPasswordRequestDto request)
		{
			bool isValid = await _authService.VerifyPasswordAsync(User.GetUserId(), request);
			return Ok(new { isValid });
		}

		[Authorize]
		[HttpDelete("account")]
		public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequestDto request)
		{
			await _authService.DeleteAccountAsync(User.GetUserId(), request);
			return NoContent();
		}
	}
}
