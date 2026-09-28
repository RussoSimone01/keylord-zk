using System.Text;
using AspNetCoreRateLimit;
using backend.Data;
using backend.Errors;
using backend.Extensions;
using backend.Middleware;
using backend.Repositories.Implementations;
using backend.Repositories.Interfaces;
using backend.Services.Background;
using backend.Services.Implementations;
using backend.Services.Interfaces;
using backend.Settings;
using backend.Validation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Typed configuration, validated at startup (see the checks after Build)
builder.Services.AddOptions<JwtSettings>()
	.BindConfiguration(JwtSettings.SectionName)
	.ValidateDataAnnotations()
	.ValidateOnStart();
builder.Services.AddOptions<CorsSettings>()
	.BindConfiguration(CorsSettings.SectionName)
	.ValidateDataAnnotations()
	.ValidateOnStart();

// Small default body limit; change-password raises it for the whole re-encrypted vault
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = VaultLimits.DefaultMaxRequestBodyBytes);

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<ICredentialRepository, CredentialRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IVaultService, VaultService>();
builder.Services.AddHostedService<RefreshTokenCleanupService>();

// Every error response (exceptions, validation, auth challenges, unknown routes) is a ProblemDetails with a "code" field
builder.Services.AddProblemDetails(options =>
{
	options.CustomizeProblemDetails = context =>
	{
		HttpRequest request = context.HttpContext.Request;
		context.ProblemDetails.Instance ??= $"{request.Method} {request.Path}";
		if (context.ProblemDetails is HttpValidationProblemDetails validation)
		{
			// First validation message as detail, for clients that display a single string
			validation.Detail ??= validation.Errors.SelectMany(e => e.Value).FirstOrDefault();
			validation.Extensions.TryAdd("code", AppErrors.ValidationFailed.Code);
		}
		context.ProblemDetails.Extensions.TryAdd("code", AppErrors.CodeFromStatus(context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode));
	};
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Client IP and scheme from the reverse proxy headers.
// When enabled, the proxy is trusted from any address: safe only if the app is reachable exclusively through it (as on Render).
// ForwardLimit is the number of rightmost entries appended by trusted proxies: entries further left can be forged by the client.
IConfigurationSection reverseProxy = builder.Configuration.GetSection("ReverseProxy");
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
	options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
	if (reverseProxy.GetValue<bool>("Enabled"))
	{
		options.KnownIPNetworks.Clear();
		options.KnownProxies.Clear();
		options.ForwardedForHeaderName = reverseProxy.GetValue<string>("ClientIpHeader") ?? ForwardedHeadersDefaults.XForwardedForHeaderName;
		options.ForwardLimit = reverseProxy.GetValue<int?>("ForwardLimit") ?? 1;
	}
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
	.Configure<IOptions<JwtSettings>>((options, jwtSettings) =>
	{
		JwtSettings jwt = jwtSettings.Value;
		options.TokenValidationParameters = new TokenValidationParameters
		{
			ValidateIssuer = true,
			ValidateAudience = true,
			ValidateLifetime = true,
			ValidateIssuerSigningKey = true,
			ValidIssuer = jwt.Issuer,
			ValidAudience = jwt.Audience,
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
			// Tolerance for clock differences; the default (5 minutes) would extend every access token by that much
			ClockSkew = TimeSpan.FromSeconds(30)
		};
		options.Events = new JwtBearerEvents
		{
			// Rejects tokens of deleted users and tokens issued before the last password change (different salt, different stamp)
			OnTokenValidated = async context =>
			{
				string? keyStamp = context.Principal?.FindFirst(AppClaimTypes.KeyStamp)?.Value;
				if (context.Principal is null || keyStamp is null || !context.Principal.TryGetUserId(out long userId))
				{
					context.Fail("Missing token claims");
					return;
				}
				IUserRepository userRepository = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
				ITokenService tokenService = context.HttpContext.RequestServices.GetRequiredService<ITokenService>();
				string? kdfSalt = await userRepository.GetKdfSaltAsync(userId);
				if (kdfSalt is null || tokenService.ComputeKeyStamp(kdfSalt) != keyStamp)
				{
					context.Fail("Token no longer valid");
				}
			}
		};
	});

builder.Services.AddCors();
builder.Services.AddOptions<CorsOptions>()
	.Configure<IOptions<CorsSettings>>((options, corsSettings) =>
	{
		options.AddPolicy("Frontend", policy =>
		{
			policy.WithOrigins(corsSettings.Value.AllowedOrigin)
				.AllowAnyHeader()
				.AllowAnyMethod();
		});
	});

builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddAuthorization();
builder.Services.AddControllers();

var app = builder.Build();

// Fails fast on invalid or missing configuration, before touching the database
_ = app.Services.GetRequiredService<IOptions<JwtSettings>>().Value;
_ = app.Services.GetRequiredService<IOptions<CorsSettings>>().Value;
if (string.IsNullOrWhiteSpace(app.Configuration.GetConnectionString("Default")))
{
	throw new InvalidOperationException("Missing configuration value 'ConnectionStrings:Default'");
}

using (var scope = app.Services.CreateScope())
{
	var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
	db.Database.Migrate();
}

// Resolves the client IP before any middleware (rate limiting, logging) reads it
app.UseForwardedHeaders();

// Outermost handlers: exceptions and empty 4xx/5xx responses from any later middleware become ProblemDetails
app.UseExceptionHandler();
app.UseStatusCodePages();

// Before rate limiting so that 429 responses carry CORS headers and remain readable by the browser
app.UseCors("Frontend");
app.UseIpRateLimiting();

if (app.Environment.IsDevelopment())
{
	app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
