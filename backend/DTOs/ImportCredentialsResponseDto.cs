namespace backend.DTOs
{
    public class ImportCredentialsResponseDto
    {
        // Same order as the Credentials of the request
        public IEnumerable<CredentialResponseDto> Created { get; set; } = [];
    }
}
