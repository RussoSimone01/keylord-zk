namespace backend.Validation
{
    /// <summary>
    /// Formats of the encrypted data accepted by the API, all produced by the client with AES-GCM as "ivBase64:ciphertextBase64".
    /// </summary>
    public static class EncryptedDataRules
    {
        // Credential: 12-byte IV (16 Base64 characters), ciphertext at least as long as the 16-byte GCM tag
        public const string CredentialPattern = "^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{22,}={0,2}$";
        public const string CredentialPatternMessage = "Encrypted data must have the format ivBase64:ciphertextBase64";

        // Wrapped vault key: 12-byte IV and a 32-byte key plus the 16-byte GCM tag (48 bytes, 64 Base64 characters without padding)
        public const string WrappedVaultKeyPattern = "^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{64}$";
        public const string WrappedVaultKeyPatternMessage = "Invalid wrapped vault key format";
    }
}
