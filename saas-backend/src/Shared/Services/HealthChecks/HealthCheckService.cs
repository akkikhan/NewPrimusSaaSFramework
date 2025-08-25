using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;
using StackExchange.Redis;
using System.Diagnostics;
using System.Net.NetworkInformation;

namespace SaaSFramework.Shared.Services.HealthChecks;

public interface IHealthCheckService
{
    Task<HealthCheckResult> CheckDatabaseAsync(CancellationToken cancellationToken = default);
    Task<HealthCheckResult> CheckRedisAsync(CancellationToken cancellationToken = default);
    Task<HealthCheckResult> CheckExternalServiceAsync(string serviceUrl, string serviceName, CancellationToken cancellationToken = default);
    Task<HealthReport> CheckAllDependenciesAsync(CancellationToken cancellationToken = default);
    Task<HealthCheckResult> CheckSystemResourcesAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Comprehensive health check service for monitoring all system dependencies
/// Includes database, cache, external services, and system resources monitoring
/// </summary>
public class HealthCheckService : IHealthCheckService
{
    private readonly ILogger<HealthCheckService> _logger;
    private readonly CosmosClient? _cosmosClient;
    private readonly IDatabase? _redisDatabase;
    private readonly HttpClient _httpClient;

    public HealthCheckService(
        ILogger<HealthCheckService> logger,
        CosmosClient? cosmosClient = null,
        IDatabase? redisDatabase = null,
        HttpClient? httpClient = null)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _cosmosClient = cosmosClient;
        _redisDatabase = redisDatabase;
        _httpClient = httpClient ?? new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<HealthCheckResult> CheckDatabaseAsync(CancellationToken cancellationToken = default)
    {
        if (_cosmosClient == null)
        {
            return HealthCheckResult.Degraded("Cosmos DB client not configured");
        }

        var stopwatch = Stopwatch.StartNew();
        try
        {
            _logger.LogDebug("Starting Cosmos DB health check");

            // Simple connectivity test - get database info
            var databaseResponse = await _cosmosClient.GetDatabase("SaaSFrameworkDB")
                .ReadAsync(cancellationToken: cancellationToken);

            stopwatch.Stop();

            var responseTime = stopwatch.ElapsedMilliseconds;
            var data = new Dictionary<string, object>
            {
                { "responseTime", $"{responseTime}ms" },
                { "requestCharge", databaseResponse.RequestCharge },
                { "activityId", databaseResponse.ActivityId }
            };

            if (responseTime > 1000)
            {
                _logger.LogWarning("Cosmos DB responded slowly: {ResponseTime}ms", responseTime);
                return HealthCheckResult.Degraded($"Cosmos DB responding slowly ({responseTime}ms)", data: data);
            }

            _logger.LogDebug("Cosmos DB health check passed in {ResponseTime}ms", responseTime);
            return HealthCheckResult.Healthy($"Cosmos DB operational ({responseTime}ms)", data);
        }
        catch (CosmosException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Cosmos DB health check failed: {StatusCode} - {Message}", ex.StatusCode, ex.Message);
            
            var data = new Dictionary<string, object>
            {
                { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" },
                { "statusCode", ex.StatusCode.ToString() },
                { "activityId", ex.ActivityId ?? "unknown" }
            };

            return HealthCheckResult.Unhealthy($"Cosmos DB error: {ex.Message}", ex, data);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Cosmos DB health check failed unexpectedly");
            
            return HealthCheckResult.Unhealthy($"Cosmos DB connection failed: {ex.Message}", ex, 
                new Dictionary<string, object> { { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" } });
        }
    }

    public async Task<HealthCheckResult> CheckRedisAsync(CancellationToken cancellationToken = default)
    {
        if (_redisDatabase == null)
        {
            return HealthCheckResult.Degraded("Redis database not configured");
        }

        var stopwatch = Stopwatch.StartNew();
        try
        {
            _logger.LogDebug("Starting Redis health check");

            // Test Redis connectivity with a simple ping
            var testKey = $"health-check-{Guid.NewGuid()}";
            var testValue = DateTimeOffset.UtcNow.ToString("O");

            // Set a value with short expiration
            await _redisDatabase.StringSetAsync(testKey, testValue, TimeSpan.FromSeconds(10));
            
            // Retrieve the value
            var retrievedValue = await _redisDatabase.StringGetAsync(testKey);
            
            // Clean up
            await _redisDatabase.KeyDeleteAsync(testKey);

            stopwatch.Stop();

            if (!retrievedValue.HasValue || retrievedValue != testValue)
            {
                _logger.LogWarning("Redis health check failed: value mismatch");
                return HealthCheckResult.Degraded("Redis data consistency issue");
            }

            var responseTime = stopwatch.ElapsedMilliseconds;
            var data = new Dictionary<string, object>
            {
                { "responseTime", $"{responseTime}ms" },
                { "testKey", testKey }
            };

            if (responseTime > 500)
            {
                _logger.LogWarning("Redis responded slowly: {ResponseTime}ms", responseTime);
                return HealthCheckResult.Degraded($"Redis responding slowly ({responseTime}ms)", data: data);
            }

            _logger.LogDebug("Redis health check passed in {ResponseTime}ms", responseTime);
            return HealthCheckResult.Healthy($"Redis operational ({responseTime}ms)", data);
        }
        catch (RedisException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Redis health check failed: {Message}", ex.Message);
            
            return HealthCheckResult.Unhealthy($"Redis error: {ex.Message}", ex, 
                new Dictionary<string, object> { { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" } });
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Redis health check failed unexpectedly");
            
            return HealthCheckResult.Unhealthy($"Redis connection failed: {ex.Message}", ex, 
                new Dictionary<string, object> { { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" } });
        }
    }

    public async Task<HealthCheckResult> CheckExternalServiceAsync(string serviceUrl, string serviceName, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            _logger.LogDebug("Starting health check for {ServiceName} at {ServiceUrl}", serviceName, serviceUrl);

            var response = await _httpClient.GetAsync(serviceUrl, cancellationToken);
            stopwatch.Stop();

            var responseTime = stopwatch.ElapsedMilliseconds;
            var data = new Dictionary<string, object>
            {
                { "responseTime", $"{responseTime}ms" },
                { "statusCode", response.StatusCode.ToString() },
                { "serviceUrl", serviceUrl }
            };

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("{ServiceName} health check failed with status {StatusCode}", serviceName, response.StatusCode);
                return HealthCheckResult.Unhealthy($"{serviceName} returned {response.StatusCode}", data: data);
            }

            if (responseTime > 2000)
            {
                _logger.LogWarning("{ServiceName} responded slowly: {ResponseTime}ms", serviceName, responseTime);
                return HealthCheckResult.Degraded($"{serviceName} responding slowly ({responseTime}ms)", data: data);
            }

            _logger.LogDebug("{ServiceName} health check passed in {ResponseTime}ms", serviceName, responseTime);
            return HealthCheckResult.Healthy($"{serviceName} operational ({responseTime}ms)", data);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            stopwatch.Stop();
            _logger.LogError("Health check for {ServiceName} timed out after {ElapsedMs}ms", serviceName, stopwatch.ElapsedMilliseconds);
            
            return HealthCheckResult.Unhealthy($"{serviceName} timeout", ex, 
                new Dictionary<string, object> { { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" } });
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Health check for {ServiceName} failed: {Message}", serviceName, ex.Message);
            
            return HealthCheckResult.Unhealthy($"{serviceName} connection failed: {ex.Message}", ex, 
                new Dictionary<string, object> { { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" } });
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Health check for {ServiceName} failed unexpectedly", serviceName);
            
            return HealthCheckResult.Unhealthy($"{serviceName} health check failed: {ex.Message}", ex, 
                new Dictionary<string, object> { { "responseTime", $"{stopwatch.ElapsedMilliseconds}ms" } });
        }
    }

    public async Task<HealthCheckResult> CheckSystemResourcesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Starting system resources health check");

            var data = new Dictionary<string, object>();
            var issues = new List<string>();

            // Check memory usage
            var process = Process.GetCurrentProcess();
            var memoryUsageMB = process.WorkingSet64 / 1024 / 1024;
            data["memoryUsageMB"] = memoryUsageMB;

            if (memoryUsageMB > 1000) // More than 1GB
            {
                issues.Add($"High memory usage: {memoryUsageMB}MB");
            }

            // Check available disk space (simplified - checks current drive)
            var drives = DriveInfo.GetDrives().Where(d => d.IsReady && d.DriveType == DriveType.Fixed);
            foreach (var drive in drives)
            {
                var freeSpaceGB = drive.AvailableFreeSpace / 1024 / 1024 / 1024;
                var totalSpaceGB = drive.TotalSize / 1024 / 1024 / 1024;
                var usagePercent = ((double)(totalSpaceGB - freeSpaceGB) / totalSpaceGB) * 100;

                data[$"disk_{drive.Name.Replace("\\", "")}_freeGB"] = freeSpaceGB;
                data[$"disk_{drive.Name.Replace("\\", "")}_usagePercent"] = Math.Round(usagePercent, 1);

                if (usagePercent > 90)
                {
                    issues.Add($"Disk {drive.Name} usage high: {usagePercent:F1}%");
                }
                else if (freeSpaceGB < 1)
                {
                    issues.Add($"Disk {drive.Name} low space: {freeSpaceGB}GB");
                }
            }

            // Check CPU usage (simplified - use process CPU time)
            var startTime = DateTime.UtcNow;
            var startCpuUsage = process.TotalProcessorTime;
            await Task.Delay(100, cancellationToken);
            var endTime = DateTime.UtcNow;
            var endCpuUsage = process.TotalProcessorTime;
            
            var cpuUsedMs = (endCpuUsage - startCpuUsage).TotalMilliseconds;
            var totalMsPassed = (endTime - startTime).TotalMilliseconds;
            var cpuUsagePercent = cpuUsedMs / (Environment.ProcessorCount * totalMsPassed) * 100;
            
            data["cpuUsagePercent"] = Math.Round(cpuUsagePercent, 1);

            if (cpuUsagePercent > 80)
            {
                issues.Add($"High CPU usage: {cpuUsagePercent:F1}%");
            }

            // Check thread count
            var threadCount = process.Threads.Count;
            data["threadCount"] = threadCount;

            if (threadCount > 100)
            {
                issues.Add($"High thread count: {threadCount}");
            }

            _logger.LogDebug("System resources check completed");

            if (issues.Any())
            {
                var issueDescription = string.Join("; ", issues);
                _logger.LogWarning("System resources issues detected: {Issues}", issueDescription);
                return HealthCheckResult.Degraded($"System resource issues: {issueDescription}", data: data);
            }

            return HealthCheckResult.Healthy("System resources normal", data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "System resources health check failed");
            return HealthCheckResult.Unhealthy($"System resources check failed: {ex.Message}", ex);
        }
    }

    public async Task<HealthReport> CheckAllDependenciesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting comprehensive health check of all dependencies");

        var stopwatch = Stopwatch.StartNew();
        var healthChecks = new Dictionary<string, HealthCheckResult>();

        // Check database
        healthChecks["database"] = await CheckDatabaseAsync(cancellationToken);

        // Check Redis
        healthChecks["redis"] = await CheckRedisAsync(cancellationToken);

        // Check system resources
        healthChecks["system"] = await CheckSystemResourcesAsync(cancellationToken);

        // Check external services (microservices)
        var externalServices = new[]
        {
            ("authentication", "http://localhost:5001/health"),
            ("rbac", "http://localhost:5002/health"),
            ("notifications", "http://localhost:5003/health")
        };

        foreach (var (name, url) in externalServices)
        {
            healthChecks[name] = await CheckExternalServiceAsync(url, name, cancellationToken);
        }

        stopwatch.Stop();

        // Determine overall status
        var overallStatus = DetermineOverallStatus(healthChecks.Values);
        
        var totalTime = stopwatch.ElapsedMilliseconds;
        _logger.LogInformation("Health check completed in {TotalTime}ms with status {Status}", totalTime, overallStatus);

        // Create health report
        var entries = healthChecks.ToDictionary(
            kvp => kvp.Key,
            kvp => new HealthReportEntry(
                kvp.Value.Status,
                kvp.Value.Description,
                TimeSpan.FromMilliseconds(0), // Individual timing not tracked in this simplified version
                kvp.Value.Exception,
                kvp.Value.Data
            )
        );

        return new HealthReport(entries, TimeSpan.FromMilliseconds(totalTime));
    }

    private static HealthStatus DetermineOverallStatus(IEnumerable<HealthCheckResult> results)
    {
        var statuses = results.Select(r => r.Status).ToList();

        if (statuses.Any(s => s == HealthStatus.Unhealthy))
            return HealthStatus.Unhealthy;

        if (statuses.Any(s => s == HealthStatus.Degraded))
            return HealthStatus.Degraded;

        return HealthStatus.Healthy;
    }
}
