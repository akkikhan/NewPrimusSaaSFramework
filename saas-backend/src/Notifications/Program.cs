using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;
using SaaSFramework.Notifications.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/notifications-.txt", rollingInterval: RollingInterval.Day)
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

// Add JWT authentication
var jwtSecret = builder.Configuration["JWT:Secret"] ?? 
    throw new InvalidOperationException("JWT Secret is required");

// Register JWT service (required for TenantContextMiddleware)
builder.Services.AddSingleton<IJwtService>(new JwtService(jwtSecret));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = "SaaSFramework",
            ValidateAudience = true,
            ValidAudience = "SaaSFramework",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// Add notification services
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

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
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "notifications", timestamp = DateTime.UtcNow }));

try
{
    Log.Information("Starting Notifications API");
    app.Run("http://localhost:5003");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Notifications API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}