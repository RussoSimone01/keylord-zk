using System.Security.Cryptography;
using System.Text;

namespace backend.Models
{
    /// <summary>
    /// New encrypted content for an existing credential, applied only if the stored content still has the digest the client started from.
    /// </summary>
    public sealed record CredentialReplacement(string PreviousDigest, string EncryptedData)
    {
        // Lowercase hex SHA-256 of the encrypted data, computed the same way by the client
        public static string Digest(string encryptedData)
        {
            return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(encryptedData)));
        }
    }
}
