using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SaaSFramework.Shared.Services.Resilience;
using SaaSFramework.Shared.Services.Caching;
using SaaSFramework.Shared.Middleware;
using StackExchange.Redis;
using Polly;
using Polly.Extensions.Http;

namespace SaaSFramework.Shared.Extensions;

/// <summary>
/// Extension methods for configuring resilience services and middleware
/// </summary>
public static class ResilienceServiceExtensions
{
    /// <summary>
    /// Add all resilience services to the container
    /// </summary>
    public static IServiceCollection AddResilienceServices(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        // Add HTTP clients with resilience policies
        services.AddHttpClient<IResilientHttpClientService, ResilientHttpClientService>()
            .AddPolicyHandler(GetRetryPolicy())
            .AddPolicyHandler(GetCircuitBreakerPolicy())
            .AddPolicyHandler(GetTimeoutPolicy());

        // Add distributed caching
        services.AddStackExchangeRedisCache(options =>
        {
            var connectionString = configuration.GetConnectionString("Redis");
            if (!string.IsNullOrEmpty(connectionString))
            {
                options.Configuration = connectionString;
                options.InstanceName = "SaaSFramework";
            }
        });

        // Register Redis database for advanced operations
        services.AddSingleton<IDatabase>(provider =>
        {
            var connectionString = configuration.GetConnectionString("Redis");
            if (string.IsNullOrEmpty(connectionString))
            {
                // Return null database - services will handle graceful degradation
                return null!;
            }

            try
            {
                var connection = ConnectionMultiplexer.Connect(connectionString);
                return connection.GetDatabase();
            }
            catch
            {
                // Return null on connection failure - services will handle graceful degradation
                return null!;
            }
        });

        // Register caching services
        services.AddSingleton<IDistributedCacheService, DistributedCacheService>();
        services.AddScoped<SessionCacheService>();

        // Add basic health checks
        services.AddHealthChecks();

        return services;
    }

    /// <summary>
    /// Add resilience middleware to the pipeline
    /// </summary>
    public static IApplicationBuilder UseResilienceMiddleware(
        this IApplicationBuilder app, 
        RequestValidationOptions? validationOptions = null)
    {
        // Add correlation ID middleware first
        app.UseMiddleware<CorrelationIdMiddleware>();

        // Add request validation middleware
        app.UseMiddleware<RequestValidationMiddleware>(validationOptions ?? new RequestValidationOptions());

        // Add health check endpoints
        app.UseHealthChecks("/health");
        app.UseHealthChecks("/health/ready");
        app.UseHealthChecks("/health/live");

        return app;
    }

    /// <summary>
    /// Configure service-specific resilience settings
    /// </summary>
    public static IServiceCollection ConfigureServiceResilience(
        this IServiceCollection services,
        string serviceName,
        TimeSpan? timeout = null,
        int maxRetries = 3,
        TimeSpan? circuitBreakerDuration = null)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(30);
        var actualCircuitBreakerDuration = circuitBreakerDuration ?? TimeSpan.FromSeconds(60);

        services.AddHttpClient(serviceName)
            .AddPolicyHandler(GetRetryPolicy(maxRetries))
            .AddPolicyHandler(GetCircuitBreakerPolicy(actualCircuitBreakerDuration))
            .AddPolicyHandler(GetTimeoutPolicy(actualTimeout));

        return services;
    }

    private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy(int maxRetries = 3)
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .OrResult(msg => !msg.IsSuccessStatusCode)
            .WaitAndRetryAsync(
                retryCount: maxRetries,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }

    private static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy(TimeSpan duration = default)
    {
        var actualDuration = duration == default ? TimeSpan.FromSeconds(60) : duration;

        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 3,
                durationOfBreak: actualDuration);
    }

    private static IAsyncPolicy<HttpResponseMessage> GetTimeoutPolicy(TimeSpan timeout = default)
    {
        var actualTimeout = timeout == default ? TimeSpan.FromSeconds(30) : timeout;
        return Policy.TimeoutAsync<HttpResponseMessage>(actualTimeout);
    }
}
