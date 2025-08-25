# Resilient Service Communication Implementation Guide

## Overview

This implementation provides comprehensive resilience patterns for microservices communication including:

- **Circuit Breaker Pattern**: Prevents cascade failures using Polly library
- **Retry Mechanisms**: Exponential backoff with jitter for transient failures
- **Health Checks**: Comprehensive monitoring of all dependencies
- **Distributed Caching**: Redis-based caching for session management and performance
- **Correlation ID Tracking**: Request tracing across all microservices
- **Request/Response Validation**: Security and data validation middleware
- **Graceful Degradation**: Fallback mechanisms when services are unavailable

## Architecture Components

### 1. ResilientHttpClientService

**Location**: `src/Shared/Services/Resilience/ResilientHttpClientService.cs`

**Features**:
- Circuit breaker with 50% failure ratio threshold
- Retry policy with exponential backoff (3 attempts, 2^n seconds delay)
- Timeout configuration (10 seconds default)
- Correlation ID propagation
- Structured logging with performance metrics

**Usage**:
```csharp
// In your service constructor
public class MyService
{
    private readonly IResilientHttpClientService _httpClient;
    
    public MyService(IResilientHttpClientService httpClient)
    {
        _httpClient = httpClient;
    }
    
    // GET request with resilience
    public async Task<UserDto> GetUserAsync(int userId)
    {
        return await _httpClient.GetAsync<UserDto>($"http://localhost:5001/api/users/{userId}");
    }
    
    // POST request with resilience
    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        var content = new StringContent(JsonSerializer.Serialize(request), 
                                       Encoding.UTF8, "application/json");
        return await _httpClient.PostAsync<UserDto>("http://localhost:5001/api/users", content);
    }
}
```

### 2. DistributedCacheService

**Location**: `src/Shared/Services/Caching/DistributedCacheService.cs`

**Features**:
- Redis-based distributed caching
- Session management support
- Cache-aside pattern implementation
- Batch operations for better performance
- Pattern-based cache invalidation
- Graceful degradation when Redis is unavailable

**Usage**:
```csharp
// In your service
public class UserService
{
    private readonly IDistributedCacheService _cache;
    
    public UserService(IDistributedCacheService cache)
    {
        _cache = cache;
    }
    
    // Get or set pattern
    public async Task<UserDto> GetUserAsync(int userId)
    {
        return await _cache.GetOrSetAsync(
            key: $"user:{userId}",
            factory: async () => await _userRepository.GetByIdAsync(userId),
            expiration: TimeSpan.FromHours(1)
        );
    }
    
    // Invalidate cache
    public async Task InvalidateUserCacheAsync(int userId)
    {
        await _cache.RemoveAsync($"user:{userId}");
    }
    
    // Session management
    public async Task<string> GetUserSessionDataAsync(string sessionId)
    {
        return await _cache.GetAsync<string>($"session:{sessionId}:data");
    }
}
```

### 3. HealthCheckService

**Location**: `src/Shared/Services/Resilience/HealthCheckService.cs`

**Features**:
- Database connectivity monitoring (Cosmos DB)
- Redis connectivity and performance testing
- External service health validation
- System resource monitoring (CPU, memory, disk)
- Comprehensive health reporting

**Usage**:
```csharp
// Check all dependencies
public class HealthController : ControllerBase
{
    private readonly IHealthCheckService _healthCheck;
    
    public HealthController(IHealthCheckService healthCheck)
    {
        _healthCheck = healthCheck;
    }
    
    [HttpGet("/api/health")]
    public async Task<IActionResult> GetHealthAsync()
    {
        var health = await _healthCheck.CheckAllDependenciesAsync();
        
        return health.IsHealthy ? Ok(health) : StatusCode(503, health);
    }
    
    [HttpGet("/api/health/database")]
    public async Task<IActionResult> GetDatabaseHealthAsync()
    {
        var health = await _healthCheck.CheckDatabaseAsync();
        return Ok(health);
    }
}
```

### 4. Correlation ID Middleware

**Location**: `src/Shared/Middleware/CorrelationIdMiddleware.cs`

**Features**:
- Automatic correlation ID generation
- Request/response tracing
- Structured logging with correlation context
- Cross-service propagation

**Usage**:
```csharp
// Access correlation ID in your services
public class MyService
{
    public async Task ProcessRequestAsync()
    {
        var correlationId = CorrelationContext.CorrelationId;
        var traceId = CorrelationContext.TraceId;
        
        _logger.LogInformation("Processing request - CorrelationId: {CorrelationId}", correlationId);
        
        // Correlation ID is automatically propagated to HTTP requests
        var response = await _httpClient.GetAsync("http://external-service/api/data");
    }
}
```

### 5. Request Validation Middleware

**Location**: `src/Shared/Middleware/RequestValidationMiddleware.cs`

**Features**:
- Request size validation
- Content-Type validation
- Header security validation
- JSON structure validation
- Query parameter sanitization
- Response header filtering

**Configuration**:
```csharp
// Custom validation options
var validationOptions = new RequestValidationOptions
{
    MaxRequestSize = 5 * 1024 * 1024, // 5MB
    MaxJsonDepth = 10,
    AllowedContentTypes = { "application/json", "application/xml" },
    RequiredHeaders = { "Authorization" },
    ForbiddenHeaders = { "x-admin-override" }
};
```

## Service Registration and Configuration

### Startup Configuration

```csharp
// In Startup.cs or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    var configuration = Configuration;
    
    // Add all resilience services
    services.AddResilienceServices(configuration);
    
    // Configure specific service resilience
    services.ConfigureServiceResilience(
        serviceName: "AuthenticationService",
        timeout: TimeSpan.FromSeconds(15),
        maxRetries: 3,
        circuitBreakerDuration: TimeSpan.FromMinutes(1)
    );
    
    services.ConfigureServiceResilience(
        serviceName: "NotificationService",
        timeout: TimeSpan.FromSeconds(30),
        maxRetries: 5
    );
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Add resilience middleware
    var validationOptions = new RequestValidationOptions
    {
        MaxRequestSize = 10 * 1024 * 1024, // 10MB for file uploads
        ValidateResponses = true
    };
    
    app.UseResilienceMiddleware(validationOptions);
    
    // Your other middleware...
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseRouting();
    app.UseEndpoints(endpoints => endpoints.MapControllers());
}
```

### Configuration Settings

**appsettings.json**:
```json
{
  "ConnectionStrings": {
    "CosmosDb": "AccountEndpoint=https://your-cosmos-account.documents.azure.com:443/;AccountKey=your-key;",
    "Redis": "your-redis-connection-string"
  },
  "Resilience": {
    "CircuitBreaker": {
      "FailureThreshold": 0.5,
      "MinimumThroughput": 5,
      "DurationOfBreak": "00:00:30"
    },
    "Retry": {
      "MaxAttempts": 3,
      "BaseDelay": "00:00:02"
    },
    "Timeout": {
      "DefaultTimeout": "00:00:10"
    }
  }
}
```

## Health Check Endpoints

Once configured, the following health check endpoints are available:

- `GET /health` - Overall system health
- `GET /health/ready` - Readiness probe (for Kubernetes)
- `GET /health/live` - Liveness probe (for Kubernetes)

**Response Format**:
```json
{
  "status": "Healthy",
  "checks": [
    {
      "name": "database",
      "status": "Healthy",
      "duration": 45.2,
      "data": {
        "responseTime": "45ms",
        "requestCharge": "2.1 RU"
      }
    },
    {
      "name": "redis",
      "status": "Healthy",
      "duration": 12.1,
      "data": {
        "ping": "12ms",
        "memory": "1.2GB"
      }
    }
  ],
  "totalDuration": 123.5
}
```

## Circuit Breaker Behavior

### States

1. **Closed** (Normal Operation):
   - All requests pass through
   - Failure count is tracked

2. **Open** (Circuit Breaker Activated):
   - All requests fail immediately with circuit breaker exception
   - Duration: 30 seconds (configurable)

3. **Half-Open** (Testing Recovery):
   - Limited requests are allowed to test if service has recovered
   - If successful, circuit returns to Closed state
   - If failed, circuit returns to Open state

### Failure Thresholds

- **Failure Ratio**: 50% (5 out of 10 requests must fail)
- **Minimum Throughput**: 5 requests (minimum requests before circuit can open)
- **Duration**: 30 seconds in open state

## Monitoring and Observability

### Structured Logging

All services use structured logging with correlation IDs:

```
[2024-01-15 10:30:45] INFO [CorrelationId: abc123def456] Request started: GET /api/users/123
[2024-01-15 10:30:45] WARN [CorrelationId: abc123def456] Circuit breaker opened for AuthenticationService
[2024-01-15 10:30:45] INFO [CorrelationId: abc123def456] Request completed: GET /api/users/123 - Status: 200, Duration: 234ms
```

### Performance Metrics

- Request/response timing
- Cache hit/miss rates
- Circuit breaker state changes
- Health check execution times
- System resource utilization

## Testing Failure Scenarios

### Simulate Service Failures

```bash
# Stop a microservice to test circuit breaker
docker stop authentication-service

# Test with high load to trigger circuit breaker
for i in {1..20}; do
  curl http://localhost:8080/api/users/1 &
done
```

### Test Health Checks

```bash
# Check overall health
curl http://localhost:8080/health

# Check specific dependency
curl http://localhost:8080/health/database
```

### Test Caching

```bash
# First request (cache miss)
time curl http://localhost:8080/api/users/1

# Second request (cache hit)
time curl http://localhost:8080/api/users/1
```

## Best Practices

1. **Circuit Breaker Configuration**:
   - Set appropriate failure thresholds based on service SLA
   - Configure reasonable break durations
   - Monitor circuit breaker metrics

2. **Retry Policies**:
   - Use exponential backoff with jitter
   - Set maximum retry limits
   - Don't retry non-transient errors

3. **Caching Strategy**:
   - Set appropriate cache expiration times
   - Implement cache invalidation strategies
   - Handle cache failures gracefully

4. **Health Checks**:
   - Include all critical dependencies
   - Set reasonable timeout values
   - Provide meaningful error messages

5. **Correlation Tracking**:
   - Always propagate correlation IDs
   - Include correlation IDs in all log messages
   - Use correlation IDs for distributed tracing

## Troubleshooting

### Common Issues

1. **Circuit Breaker Always Open**:
   - Check failure thresholds
   - Verify downstream service health
   - Review retry configuration

2. **Cache Misses**:
   - Verify Redis connectivity
   - Check cache key naming
   - Review expiration policies

3. **Health Check Failures**:
   - Check connection strings
   - Verify service endpoints
   - Review timeout settings

### Debug Mode

Enable detailed logging in development:

```json
{
  "Logging": {
    "LogLevel": {
      "SaaSFramework.Shared.Services": "Debug",
      "SaaSFramework.Shared.Middleware": "Debug"
    }
  }
}
```

This implementation provides enterprise-grade resilience patterns that ensure your microservices can handle failures gracefully and maintain high availability.
