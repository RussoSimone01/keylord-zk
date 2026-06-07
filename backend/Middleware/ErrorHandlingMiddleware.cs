namespace backend.Middleware
{
    public class ErrorHandlingMiddleware(RequestDelegate next)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "application/json";
                bool isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
                string message = isDevelopment ? ex.Message : "An error occurred";
                await context.Response.WriteAsJsonAsync(new { error = message });
            }
        }
    }
}