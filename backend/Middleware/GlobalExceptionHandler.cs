using System.Globalization;
using backend.Errors;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Middleware
{
    /// <summary>
    /// Converts every exception escaping the pipeline into an RFC 9457 ProblemDetails response and logs it at a level matching its severity.
    /// </summary>
    public class GlobalExceptionHandler(IProblemDetailsService problemDetailsService, IHostEnvironment environment, ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            // The client is gone: there is no one to answer
            if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
            {
                logger.LogDebug("Request {Method} {Path} aborted by the client", httpContext.Request.Method, httpContext.Request.Path);
                httpContext.Response.StatusCode = StatusCodes.Status499ClientClosedRequest;
                return true;
            }

            ApiError error;
            string detail;
            IReadOnlyDictionary<string, object?> extensions = new Dictionary<string, object?>();

            switch (exception)
            {
                case ApiException apiException:
                    error = apiException.Error;
                    detail = error.Message;
                    extensions = apiException.Extensions;
                    if (apiException.RetryAfter is TimeSpan retryAfter)
                    {
                        httpContext.Response.Headers.RetryAfter = Math.Max(1, (long)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                    }
                    logger.LogInformation("Request {Method} {Path} failed with {ErrorCode} ({StatusCode})", httpContext.Request.Method, httpContext.Request.Path, error.Code, error.StatusCode);
                    break;

                // Concurrent inserts that pass the application-level uniqueness checks
                case DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } } dbException:
                    error = AppErrors.Conflict;
                    detail = error.Message;
                    logger.LogWarning(dbException, "Unique constraint violation on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
                    break;

                // Malformed requests rejected by Kestrel (e.g. body too large)
                case BadHttpRequestException badRequest:
                    error = new ApiError(AppErrors.CodeFromStatus(badRequest.StatusCode), badRequest.StatusCode, "Invalid request");
                    detail = error.Message;
                    logger.LogInformation("Bad request on {Method} {Path}: {Reason}", httpContext.Request.Method, httpContext.Request.Path, badRequest.Message);
                    break;

                default:
                    error = AppErrors.Internal;
                    // Exception messages may contain internal details: shown only in Development
                    detail = environment.IsDevelopment() ? exception.Message : error.Message;
                    logger.LogError(exception, "Unhandled exception on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
                    break;
            }

            httpContext.Response.StatusCode = error.StatusCode;
            ProblemDetails problem = new()
            {
                Status = error.StatusCode,
                Title = ReasonPhrases.GetReasonPhrase(error.StatusCode),
                Detail = detail
            };
            problem.Extensions["code"] = error.Code;
            foreach (KeyValuePair<string, object?> extension in extensions)
            {
                problem.Extensions[extension.Key] = extension.Value;
            }

            return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = httpContext,
                ProblemDetails = problem,
                Exception = exception
            });
        }
    }
}
