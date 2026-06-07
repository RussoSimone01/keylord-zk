namespace backend.DTOs
{
    public class SaltResponseDto
    {
        public string Salt { get; set; } = string.Empty;
        public long KdfIterations { get; set; }
    }
}