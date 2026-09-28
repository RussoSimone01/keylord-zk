using backend.DTOs;
using backend.Extensions;
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
        public async Task<IActionResult> Create(CredentialDto request, CancellationToken cancellationToken)
        {
            CredentialResponseDto result = await _vaultService.CreateCredentialAsync(User.GetUserId(), User.GetKeyStamp(), request, cancellationToken);
            return Created($"/api/vault/{result.Id}", result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            return Ok(await _vaultService.GetCredentialsAsync(User.GetUserId(), cancellationToken));
        }

        [HttpPut("{credentialId}")]
        public async Task<IActionResult> Update(long credentialId, CredentialDto request, CancellationToken cancellationToken)
        {
            await _vaultService.UpdateCredentialAsync(User.GetUserId(), User.GetKeyStamp(), credentialId, request, cancellationToken);
            return NoContent();
        }

        [HttpDelete("{credentialId}")]
        public async Task<IActionResult> Delete(long credentialId, CancellationToken cancellationToken)
        {
            await _vaultService.DeleteCredentialAsync(User.GetUserId(), credentialId, cancellationToken);
            return NoContent();
        }
    }
}
