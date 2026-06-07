using backend.DTOs;
using backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class VaultController(IVaultService vaultService) : ControllerBase
    {
        private readonly IVaultService _vaultService = vaultService;

        [HttpPost]
        public async Task<IActionResult> Create(CredentialDto request)
        {
            long userId = long.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            CredentialResponseDto result = await _vaultService.CreateCredentialAsync(userId, request);
            return Created($"/api/vault/{result.Id}", result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            long userId = long.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            return Ok(await _vaultService.GetCredentialsAsync(userId));
        }

        [HttpPut("{credentialId}")]
        public async Task<IActionResult> Update(long credentialId, CredentialDto request)
        {
            long userId = long.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            await _vaultService.UpdateCredentialAsync(userId, credentialId, request);
            return NoContent();
        }

        [HttpDelete("{credentialId}")]
        public async Task<IActionResult> Delete(long credentialId)
        {
            long userId = long.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            await _vaultService.DeleteCredentialAsync(userId, credentialId);
            return NoContent();
        }
    }
}