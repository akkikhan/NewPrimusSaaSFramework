using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;
using Microsoft.Azure.Cosmos;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/gateway-.txt", rollingInterval: RollingInterval.Day)
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
        var origins = builder.Configuration.GetSection("Gateway:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:4200" };
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
builder.Services.AddScoped<ICreditService, CreditService>();

// Add JWT service
var jwtSecret = builder.Configuration["JWT:Secret"] ?? 
    throw new InvalidOperationException("JWT Secret is required");
builder.Services.AddSingleton<IJwtService>(new JwtService(jwtSecret));

// Add YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

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

// Map controllers for tenant management BEFORE YARP so they take precedence
app.MapControllers();

// Map YARP routes for other services
app.MapReverseProxy();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Test endpoint for Cosmos DB
app.MapGet("/test-cosmos", async (ICosmosDbService cosmosDbService) =>
{
    try
    {
        var tenants = await cosmosDbService.GetAllItemsAsync<object>("tenants");
        return Results.Ok(new { status = "success", count = tenants?.Count() ?? 0, tenants = tenants?.Take(5) });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Cosmos DB Error: {ex.Message}");
    }
});

try
{
    Log.Information("Starting API Gateway");
    
    // Add global exception handler
    app.UseExceptionHandler("/error");
    
    app.Run("http://localhost:8080");
}
catch (Exception ex)
{
    Log.Fatal(ex, "API Gateway terminated unexpectedly");
    Console.WriteLine($"FATAL ERROR: {ex.Message}");
    Console.WriteLine($"Stack Trace: {ex.StackTrace}");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
