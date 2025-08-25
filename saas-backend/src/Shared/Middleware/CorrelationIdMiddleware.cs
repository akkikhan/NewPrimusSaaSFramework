using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace SaaSFramework.Shared.Middleware;

/// <summary>
/// Middleware for managing correlation IDs across all HTTP requests and responses
/// Ensures traceability across microservices and enables distributed request tracking
/// </summary>
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;
    private const string CORRELATION_ID_HEADER = "X-Correlation-ID";
    private const string TRACE_ID_HEADER = "X-Trace-ID";

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrCreateCorrelationId(context);
        var traceId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

        // Add correlation ID to response headers
        context.Response.Headers[CORRELATION_ID_HEADER] = correlationId;
        context.Response.Headers[TRACE_ID_HEADER] = traceId;

        // Add to HttpContext items for access throughout the request pipeline
        context.Items["CorrelationId"] = correlationId;
        context.Items["TraceId"] = traceId;

        // Configure logging scope with correlation context
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["TraceId"] = traceId,
            ["RequestPath"] = context.Request.Path,
            ["RequestMethod"] = context.Request.Method
        });

        var stopwatch = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation(
                "Request started: {Method} {Path} - CorrelationId: {CorrelationId}, TraceId: {TraceId}",
                context.Request.Method,
                context.Request.Path,
                correlationId,
                traceId);

            await _next(context);

            stopwatch.Stop();

            _logger.LogInformation(
                "Request completed: {Method} {Path} - Status: {StatusCode}, Duration: {Duration}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(ex,
                "Request failed: {Method} {Path} - Duration: {Duration}ms, Error: {ErrorMessage}",
                context.Request.Method,
                context.Request.Path,
                stopwatch.ElapsedMilliseconds,
                ex.Message);

            throw;
        }
    }

    private string GetOrCreateCorrelationId(HttpContext context)
    {
        // Try to get correlation ID from request headers
        if (context.Request.Headers.TryGetValue(CORRELATION_ID_HEADER, out var correlationId) &&
            !string.IsNullOrEmpty(correlationId))
        {
            return correlationId.FirstOrDefault() ?? GenerateCorrelationId();
        }

        // Generate new correlation ID if not present
        return GenerateCorrelationId();
    }

    private static string GenerateCorrelationId()
    {
        return Guid.NewGuid().ToString("N")[..12]; // Short correlation ID
    }
}

/// <summary>
/// Static helper class for accessing correlation context
/// </summary>
public static class CorrelationContext
{
    private static readonly AsyncLocal<string> _correlationId = new();
    private static readonly AsyncLocal<string> _traceId = new();

    public static string? CorrelationId
    {
        get => _correlationId.Value;
        set => _correlationId.Value = value;
    }

    public static string? TraceId
    {
        get => _traceId.Value;
        set => _traceId.Value = value;
    }

    /// <summary>
    /// Set correlation context from HttpContext
    /// </summary>
    public static void SetFromHttpContext(HttpContext context)
    {
        CorrelationId = context.Items["CorrelationId"]?.ToString();
        TraceId = context.Items["TraceId"]?.ToString();
    }

    /// <summary>
    /// Get headers for outbound HTTP requests
    /// </summary>
    public static Dictionary<string, string> GetHeaders()
    {
        var headers = new Dictionary<string, string>();

        if (!string.IsNullOrEmpty(CorrelationId))
        {
            headers["X-Correlation-ID"] = CorrelationId;
        }

        if (!string.IsNullOrEmpty(TraceId))
        {
            headers["X-Trace-ID"] = TraceId;
        }

        return headers;
    }

    /// <summary>
    /// Create a new correlation scope
    /// </summary>
    public static IDisposable CreateScope(string? correlationId = null, string? traceId = null)
    {
        return new CorrelationScope(correlationId, traceId);
    }

    private class CorrelationScope : IDisposable
    {
        private readonly string? _previousCorrelationId;
        private readonly string? _previousTraceId;

        public CorrelationScope(string? correlationId, string? traceId)
        {
            _previousCorrelationId = CorrelationId;
            _previousTraceId = TraceId;

            CorrelationId = correlationId ?? Guid.NewGuid().ToString("N")[..12];
            TraceId = traceId ?? Guid.NewGuid().ToString();
        }

        public void Dispose()
        {
            CorrelationId = _previousCorrelationId;
            TraceId = _previousTraceId;
        }
    }
}

/// <summary>
/// Extensions for configuring correlation ID middleware
/// </summary>
public static class CorrelationIdExtensions
{
    /// <summary>
    /// Add correlation ID middleware to the pipeline
    /// </summary>
    public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<CorrelationIdMiddleware>();
    }

    /// <summary>
    /// Get correlation ID from HttpContext
    /// </summary>
    public static string? GetCorrelationId(this HttpContext context)
    {
        return context.Items["CorrelationId"]?.ToString();
    }

    /// <summary>
    /// Get trace ID from HttpContext
    /// </summary>
    public static string? GetTraceId(this HttpContext context)
    {
        return context.Items["TraceId"]?.ToString();
    }
}
