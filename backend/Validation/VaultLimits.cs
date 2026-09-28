namespace backend.Validation
{
	/// <summary>
	/// Size limits and format of the encrypted vault data accepted by the API.
	/// </summary>
	public static class VaultLimits
	{
		// Encrypted payload of a single credential: ample for site, username and password
		public const int MaxEncryptedDataLength = 8192;

		public const int MaxCredentialsPerUser = 2000;

		// "ivBase64:ciphertextBase64": 12-byte IV (16 Base64 characters), ciphertext at least as long as the 16-byte GCM tag
		public const string EncryptedDataPattern = "^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{22,}={0,2}$";

		// Request body limits: every endpoint but change-password carries at most one credential
		public const long DefaultMaxRequestBodyBytes = 64 * 1024;
		public const long ChangePasswordMaxRequestBodyBytes = 24 * 1024 * 1024;
	}
}
