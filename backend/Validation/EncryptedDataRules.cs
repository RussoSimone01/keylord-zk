namespace backend.Validation
{
    public static class EncryptedDataRules
    {
        public const string Pattern = @"^[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$";
        public const string PatternMessage = "Invalid wrapped vault key format";
    }
}