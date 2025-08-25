using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;
using Microsoft.Azure.Cosmos;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Serilog;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/auth-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:4200" };
        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Add Cosmos DB
var cosmosConnectionString = builder.Configuration.GetConnectionString("CosmosDB") ?? 
    throw new InvalidOperationException("CosmosDB connection string is required");

builder.Services.AddSingleton(serviceProvider =>
{
    var cosmosClientOptions = new CosmosClientOptions
    {
        SerializerOptions = new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
        }
    };
    return new CosmosClient(cosmosConnectionString, cosmosClientOptions);
});

builder.Services.AddScoped<ICosmosDbService, CosmosDbService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();

// Add JWT Service for tenant context middleware
var jwtSecret = builder.Configuration["JWT:Secret"] ?? "your-super-secret-key-that-is-at-least-32-characters-long";
var jwtIssuer = builder.Configuration["JWT:Issuer"] ?? "SaaSFramework";
var jwtAudience = builder.Configuration["JWT:Audience"] ?? "SaaSFramework";
builder.Services.AddSingleton<IJwtService>(new JwtService(jwtSecret, jwtIssuer, jwtAudience));

// Replace existing JWT authentication with Azure AD B2C
builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration, "AzureAdB2C");
builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowedOrigins");

app.UseRouting();

// Add tenant context middleware
app.UseMiddleware<TenantContextMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "authentication", timestamp = DateTime.UtcNow }));

try
{
    Log.Information("Starting Authentication API");
    app.Run("http://localhost:5001");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Authentication API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}