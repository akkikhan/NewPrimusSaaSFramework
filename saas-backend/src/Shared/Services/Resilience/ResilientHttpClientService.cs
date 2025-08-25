using Microsoft.Extensions.Logging;
using Polly;
using Polly.Extensions.Http;
using Polly.CircuitBreaker;
using Polly.Timeout;
using Polly.Retry;
using SaaSFramework.Shared.Middleware;
using System.Diagnostics;
using System.Net;

namespace SaaSFramework.Shared.Services.Resilience;

public interface IResilientHttpClientService
{
    Task<HttpResponseMessage> GetAsync(string requestUri, string? correlationId = null, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> PostAsync(string requestUri, HttpContent content, string? correlationId = null, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> PutAsync(string requestUri, HttpContent content, string? correlationId = null, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> DeleteAsync(string requestUri, string? correlationId = null, CancellationToken cancellationToken = default);
    Task<T?> GetAsync<T>(string requestUri, string? correlationId = null, CancellationToken cancellationToken = default) where T : class;
    Task<T?> PostAsync<T>(string requestUri, HttpContent content, string? correlationId = null, CancellationToken cancellationToken = default) where T : class;
    Task<TResult?> PostAsync<TRequest, TResult>(string requestUri, TRequest request, string? correlationId = null, CancellationToken cancellationToken = default) 
        where TRequest : class where TResult : class;
}

/// <summary>
/// Resilient HTTP Client Service with circuit breaker, retry, and timeout policies
/// Implements enterprise-grade resilience patterns for microservices communication
/// </summary>
public class ResilientHttpClientService : IResilientHttpClientService, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ResilientHttpClientService> _logger;
    private readonly ResiliencePipeline _resiliencePipeline;
    private bool _disposed = false;

    public ResilientHttpClientService(
        HttpClient httpClient,
        ILogger<ResilientHttpClientService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        
        // Configure comprehensive resilience pipeline
        _resiliencePipeline = ConfigureResiliencePipeline();
        
        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        // Set default timeout
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        
        // Add default headers
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "SaaSFramework-ResilientClient/1.0");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    private ResiliencePipeline ConfigureResiliencePipeline()
    {
        return new ResiliencePipelineBuilder()
            // Timeout strategy - prevents hanging requests
            .AddTimeout(new TimeoutStrategyOptions
            {
                Timeout = TimeSpan.FromSeconds(10),
                OnTimeout = (args) =>
                {
                    _logger.LogWarning("Request timeout after {Timeout}s for request", 
                        args.Timeout.TotalSeconds);
                    return ValueTask.CompletedTask;
                }
            })
            
            // Retry strategy with exponential backoff
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TaskCanceledException>()
                    .HandleResult((HttpResponseMessage response) => 
                        response.StatusCode >= HttpStatusCode.InternalServerError ||
                        response.StatusCode == HttpStatusCode.RequestTimeout ||
                        response.StatusCode == HttpStatusCode.TooManyRequests),
                        
                MaxRetryAttempts = 3,
                DelayGenerator = (args) => ValueTask.FromResult(
                    (TimeSpan?)TimeSpan.FromSeconds(Math.Pow(2, args.AttemptNumber)) // Exponential backoff
                ),
                
                OnRetry = (args) =>
                {
                    _logger.LogWarning("Retry attempt {AttemptNumber} for request. Reason: {Outcome}", 
                        args.AttemptNumber, args.Outcome);
                    return ValueTask.CompletedTask;
                }
            })
            
            // Circuit breaker pattern
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions
            {
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TaskCanceledException>()
                    .HandleResult((HttpResponseMessage response) => 
                        response.StatusCode >= HttpStatusCode.InternalServerError),
                        
                FailureRatio = 0.5,
                SamplingDuration = TimeSpan.FromSeconds(30),
                MinimumThroughput = 5,
                BreakDuration = TimeSpan.FromSeconds(30),
                
                OnOpened = (args) =>
                {
                    _logger.LogError("Circuit breaker opened for service calls. Duration: {BreakDuration}s", 
                        args.BreakDuration.TotalSeconds);
                    return ValueTask.CompletedTask;
                },
                
                OnClosed = (args) =>
                {
                    _logger.LogInformation("Circuit breaker closed. Service calls resumed.");
                    return ValueTask.CompletedTask;
                },
                
                OnHalfOpened = (args) =>
                {
                    _logger.LogInformation("Circuit breaker half-opened. Testing service availability.");
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public async Task<HttpResponseMessage> GetAsync(string requestUri, string? correlationId = null, CancellationToken cancellationToken = default)
    {
        return await ExecuteWithResilienceAsync(
            async () =>
            {
                var request = CreateRequest(HttpMethod.Get, requestUri, correlationId);
                return await _httpClient.SendAsync(request, cancellationToken);
            },
            requestUri,
            correlationId);
    }

    public async Task<HttpResponseMessage> PostAsync(string requestUri, HttpContent content, string? correlationId = null, CancellationToken cancellationToken = default)
    {
        return await ExecuteWithResilienceAsync(
            async () =>
            {
                var request = CreateRequest(HttpMethod.Post, requestUri, correlationId);
                request.Content = content;
                return await _httpClient.SendAsync(request, cancellationToken);
            },
            requestUri,
            correlationId);
    }

    public async Task<HttpResponseMessage> PutAsync(string requestUri, HttpContent content, string? correlationId = null, CancellationToken cancellationToken = default)
    {
        return await ExecuteWithResilienceAsync(
            async () =>
            {
                var request = CreateRequest(HttpMethod.Put, requestUri, correlationId);
                request.Content = content;
                return await _httpClient.SendAsync(request, cancellationToken);
            },
            requestUri,
            correlationId);
    }

    public async Task<HttpResponseMessage> DeleteAsync(string requestUri, string? correlationId = null, CancellationToken cancellationToken = default)
    {
        return await ExecuteWithResilienceAsync(
            async () =>
            {
                var request = CreateRequest(HttpMethod.Delete, requestUri, correlationId);
                return await _httpClient.SendAsync(request, cancellationToken);
            },
            requestUri,
            correlationId);
    }

    public async Task<T?> GetAsync<T>(string requestUri, string? correlationId = null, CancellationToken cancellationToken = default) where T : class
    {
        var response = await GetAsync(requestUri, correlationId, cancellationToken);
        return await DeserializeResponse<T>(response);
    }

    public async Task<T?> PostAsync<T>(string requestUri, HttpContent content, string? correlationId = null, CancellationToken cancellationToken = default) where T : class
    {
        var response = await PostAsync(requestUri, content, correlationId, cancellationToken);
        return await DeserializeResponse<T>(response);
    }

    public async Task<TResult?> PostAsync<TRequest, TResult>(string requestUri, TRequest request, string? correlationId = null, CancellationToken cancellationToken = default) 
        where TRequest : class where TResult : class
    {
        var json = System.Text.Json.JsonSerializer.Serialize(request);
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        
        var response = await PostAsync(requestUri, content, correlationId, cancellationToken);
        return await DeserializeResponse<TResult>(response);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string requestUri, string? correlationId)
    {
        var request = new HttpRequestMessage(method, requestUri);
        
        // Add correlation ID for distributed tracing
        if (!string.IsNullOrEmpty(correlationId))
        {
            request.Headers.Add("X-Correlation-ID", correlationId);
        }
        
        // Add request timestamp for monitoring
        request.Headers.Add("X-Request-Timestamp", DateTimeOffset.UtcNow.ToString("O"));
        
        return request;
    }

    private async Task<HttpResponseMessage> ExecuteWithResilienceAsync(
        Func<Task<HttpResponseMessage>> operation, 
        string requestUri, 
        string? correlationId)
    {
        var actualCorrelationId = correlationId ?? CorrelationContext.CorrelationId ?? Guid.NewGuid().ToString("N")[..12];
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogDebug("Executing HTTP request to {RequestUri} with correlation ID {CorrelationId}", 
                requestUri, actualCorrelationId);

            // Add correlation headers to the HTTP client
            if (!string.IsNullOrEmpty(actualCorrelationId))
            {
                _httpClient.DefaultRequestHeaders.Remove("X-Correlation-ID");
                _httpClient.DefaultRequestHeaders.Add("X-Correlation-ID", actualCorrelationId);
            }

            // Add trace ID if available
            var traceId = CorrelationContext.TraceId;
            if (!string.IsNullOrEmpty(traceId))
            {
                _httpClient.DefaultRequestHeaders.Remove("X-Trace-ID");
                _httpClient.DefaultRequestHeaders.Add("X-Trace-ID", traceId);
            }

            var result = await _resiliencePipeline.ExecuteAsync(async (ctx) =>
            {
                return await operation();
            });

            stopwatch.Stop();
            
            _logger.LogInformation("HTTP request completed for {RequestUri} in {ElapsedMs}ms with status {StatusCode} - CorrelationId: {CorrelationId}", 
                requestUri, stopwatch.ElapsedMilliseconds, result.StatusCode, actualCorrelationId);

            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "HTTP request failed for {RequestUri} after {ElapsedMs}ms - CorrelationId: {CorrelationId}, Error: {ErrorMessage}", 
                requestUri, stopwatch.ElapsedMilliseconds, actualCorrelationId, ex.Message);
            throw;
        }
    }

    private async Task<T?> DeserializeResponse<T>(HttpResponseMessage response) where T : class
    {
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("HTTP request failed with status {StatusCode}: {ErrorContent}", 
                response.StatusCode, errorContent);
            response.EnsureSuccessStatusCode(); // This will throw
        }

        var content = await response.Content.ReadAsStringAsync();
        
        if (string.IsNullOrEmpty(content))
        {
            return null;
        }

        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<T>(content, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (System.Text.Json.JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize response content: {Content}", content);
            throw;
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _httpClient?.Dispose();
            _disposed = true;
        }
    }
}
