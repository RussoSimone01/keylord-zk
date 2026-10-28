namespace backend.Validation
{
    /// <summary>
    /// Size limits of the encrypted vault data accepted by the API; the formats are in EncryptedDataRules.
    /// </summary>
    public static class VaultLimits
    {
        // Encrypted payload of a single credential: about 12 KB of JSON once IV, GCM tag and Base64 are removed,
        // room for long notes, several custom fields or an SSH private key
        public const int MaxEncryptedDataLength = 16384;

        public const int MaxCredentialsPerUser = 2000;


        // Request body limits: every endpoint but change-password and import carries at most one credential
        public const long DefaultMaxRequestBodyBytes = 64 * 1024;
        // A full vault re-encrypted on key rotation: 2,000 payloads of 16,384 characters plus ids, digests and JSON syntax
        public const long ChangePasswordMaxRequestBodyBytes = 40 * 1024 * 1024;
        // A full vault imported at once: new credentials and replacements together never exceed 2,000 payloads
        public const long ImportMaxRequestBodyBytes = 40 * 1024 * 1024;
    }
}
