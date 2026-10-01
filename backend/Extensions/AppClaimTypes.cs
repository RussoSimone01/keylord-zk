namespace backend.Extensions
{
    /// <summary>
    /// Custom claims carried by the access tokens.
    /// </summary>
    public static class AppClaimTypes
    {
        // Fingerprint of the KDF salt in force when the token was issued: identifies the key generation of the session
        public const string KeyStamp = "key_stamp";
    }
}
