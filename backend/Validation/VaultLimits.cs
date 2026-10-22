namespace backend.Validation
{
    /// <summary>
    /// Size limits of the encrypted vault data accepted by the API; the formats are in EncryptedDataRules.
    /// </summary>
    public static class VaultLimits
    {
        // Encrypted payload of a single credential: ample for site, username and password
        public const int MaxEncryptedDataLength = 8192;

        public const int MaxCredentialsPerUser = 2000;


        // Request body limits: every endpoint but change-password carries at most one credential
        public const long DefaultMaxRequestBodyBytes = 64 * 1024;
        public const long ChangePasswordMaxRequestBodyBytes = 24 * 1024 * 1024;
    }
}
