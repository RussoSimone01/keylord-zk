using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Errors;

namespace backend.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Reads the id of the authenticated user from the "sub" claim, whether or not inbound claim mapping is enabled.
        /// </summary>
        public static bool TryGetUserId(this ClaimsPrincipal principal, out long userId)
        {
            string? value = (principal.FindFirst(ClaimTypes.NameIdentifier) ?? principal.FindFirst(JwtRegisteredClaimNames.Sub))?.Value;
            return long.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out userId);
        }

        /// <summary>
        /// Returns the key stamp of the session, or a 401 error if the claim is missing.
        /// </summary>
        public static string GetKeyStamp(this ClaimsPrincipal principal)
        {
            return principal.FindFirst(AppClaimTypes.KeyStamp)?.Value ?? throw new ApiException(AppErrors.SessionInvalid);
        }

        /// <summary>
        /// Returns the id of the authenticated user, or a 401 error if the claim is missing or malformed.
        /// </summary>
        public static long GetUserId(this ClaimsPrincipal principal)
        {
            return principal.TryGetUserId(out long userId) ? userId : throw new ApiException(AppErrors.SessionInvalid);
        }
    }
}
