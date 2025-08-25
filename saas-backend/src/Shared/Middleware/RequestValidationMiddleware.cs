using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace SaaSFramework.Shared.Middleware;

/// <summary>
/// Middleware for validating HTTP requests and responses
/// Provides security validation, input sanitization, and response filtering
/// </summary>
public class RequestValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestValidationMiddleware> _logger;
    private readonly RequestValidationOptions _options;

    public RequestValidationMiddleware(
        RequestDelegate next, 
        ILogger<RequestValidationMiddleware> logger,
        RequestValidationOptions? options = null)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options ?? new RequestValidationOptions();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Validate request
        var validationResult = await ValidateRequestAsync(context);
        if (!validationResult.IsValid)
        {
            await WriteValidationErrorResponse(context, validationResult);
            return;
        }

        // Continue to next middleware
        await _next(context);

        // Validate response (if enabled)
        if (_options.ValidateResponses)
        {
            await ValidateResponseAsync(context);
        }
    }

    private async Task<ValidationResult> ValidateRequestAsync(HttpContext context)
    {
        var correlationId = context.GetCorrelationId() ?? "unknown";
        
        try
        {
            // Check request size limits
            if (context.Request.ContentLength > _options.MaxRequestSize)
            {
                _logger.LogWarning(
                    "Request size exceeded limit: {Size} bytes - CorrelationId: {CorrelationId}",
                    context.Request.ContentLength,
                    correlationId);

                return ValidationResult.Invalid("Request size exceeds maximum allowed limit");
            }

            // Validate Content-Type for POST/PUT requests
            if (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method))
            {
                var contentType = context.Request.ContentType?.ToLowerInvariant();
                if (string.IsNullOrEmpty(contentType) || !_options.AllowedContentTypes.Contains(contentType))
                {
                    _logger.LogWarning(
                        "Invalid content type: {ContentType} - CorrelationId: {CorrelationId}",
                        contentType,
                        correlationId);

                    return ValidationResult.Invalid($"Content type '{contentType}' is not allowed");
                }
            }

            // Validate request headers
            var headerValidation = ValidateHeaders(context.Request.Headers);
            if (!headerValidation.IsValid)
            {
                _logger.LogWarning(
                    "Invalid request headers - CorrelationId: {CorrelationId}, Error: {Error}",
                    correlationId,
                    headerValidation.ErrorMessage);

                return headerValidation;
            }

            // Validate query parameters
            var queryValidation = ValidateQueryParameters(context.Request.Query);
            if (!queryValidation.IsValid)
            {
                _logger.LogWarning(
                    "Invalid query parameters - CorrelationId: {CorrelationId}, Error: {Error}",
                    correlationId,
                    queryValidation.ErrorMessage);

                return queryValidation;
            }

            // Validate request body (if applicable)
            if (context.Request.ContentLength > 0 && 
                (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method)))
            {
                var bodyValidation = await ValidateRequestBodyAsync(context);
                if (!bodyValidation.IsValid)
                {
                    _logger.LogWarning(
                        "Invalid request body - CorrelationId: {CorrelationId}, Error: {Error}",
                        correlationId,
                        bodyValidation.ErrorMessage);

                    return bodyValidation;
                }
            }

            _logger.LogDebug("Request validation passed - CorrelationId: {CorrelationId}", correlationId);
            return ValidationResult.Valid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during request validation - CorrelationId: {CorrelationId}", correlationId);
            return ValidationResult.Invalid("Request validation failed due to internal error");
        }
    }

    private ValidationResult ValidateHeaders(IHeaderDictionary headers)
    {
        // Check for required headers
        foreach (var requiredHeader in _options.RequiredHeaders)
        {
            if (!headers.ContainsKey(requiredHeader))
            {
                return ValidationResult.Invalid($"Required header '{requiredHeader}' is missing");
            }
        }

        // Check for forbidden headers
        foreach (var forbiddenHeader in _options.ForbiddenHeaders)
        {
            if (headers.ContainsKey(forbiddenHeader))
            {
                return ValidationResult.Invalid($"Forbidden header '{forbiddenHeader}' is present");
            }
        }

        // Validate header values
        foreach (var header in headers)
        {
            if (string.IsNullOrEmpty(header.Value))
            {
                continue;
            }

            // Check for potential security threats in headers
            var headerValue = header.Value.ToString();
            if (ContainsSuspiciousContent(headerValue))
            {
                return ValidationResult.Invalid($"Header '{header.Key}' contains suspicious content");
            }

            // Check header length
            if (headerValue.Length > _options.MaxHeaderLength)
            {
                return ValidationResult.Invalid($"Header '{header.Key}' exceeds maximum length");
            }
        }

        return ValidationResult.Valid();
    }

    private ValidationResult ValidateQueryParameters(IQueryCollection query)
    {
        foreach (var parameter in query)
        {
            // Check parameter name length
            if (parameter.Key.Length > _options.MaxParameterNameLength)
            {
                return ValidationResult.Invalid($"Query parameter name '{parameter.Key}' exceeds maximum length");
            }

            // Check parameter value
            var value = parameter.Value.ToString();
            if (value.Length > _options.MaxParameterValueLength)
            {
                return ValidationResult.Invalid($"Query parameter '{parameter.Key}' value exceeds maximum length");
            }

            // Check for suspicious content
            if (ContainsSuspiciousContent(value))
            {
                return ValidationResult.Invalid($"Query parameter '{parameter.Key}' contains suspicious content");
            }
        }

        return ValidationResult.Valid();
    }

    private async Task<ValidationResult> ValidateRequestBodyAsync(HttpContext context)
    {
        try
        {
            // Enable request body buffering to allow multiple reads
            context.Request.EnableBuffering();
            
            // Read the request body
            var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
            
            // Reset stream position for downstream middleware
            context.Request.Body.Position = 0;

            // Check body length
            if (body.Length > _options.MaxRequestBodySize)
            {
                return ValidationResult.Invalid("Request body exceeds maximum allowed size");
            }

            // Validate JSON structure (if Content-Type is JSON)
            var contentType = context.Request.ContentType?.ToLowerInvariant();
            if (contentType?.Contains("application/json") == true)
            {
                try
                {
                    using var document = JsonDocument.Parse(body);
                    
                    // Check JSON depth
                    if (GetJsonDepth(document.RootElement) > _options.MaxJsonDepth)
                    {
                        return ValidationResult.Invalid("JSON structure exceeds maximum depth");
                    }
                }
                catch (JsonException)
                {
                    return ValidationResult.Invalid("Invalid JSON format");
                }
            }

            // Check for suspicious content
            if (ContainsSuspiciousContent(body))
            {
                return ValidationResult.Invalid("Request body contains suspicious content");
            }

            return ValidationResult.Valid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating request body");
            return ValidationResult.Invalid("Request body validation failed");
        }
    }

    private async Task ValidateResponseAsync(HttpContext context)
    {
        var correlationId = context.GetCorrelationId() ?? "unknown";

        try
        {
            // Check response status code
            if (context.Response.StatusCode >= 500)
            {
                _logger.LogError(
                    "Server error response: {StatusCode} - CorrelationId: {CorrelationId}",
                    context.Response.StatusCode,
                    correlationId);
            }

            // Remove sensitive headers from response
            foreach (var sensitiveHeader in _options.SensitiveResponseHeaders)
            {
                if (context.Response.Headers.ContainsKey(sensitiveHeader))
                {
                    context.Response.Headers.Remove(sensitiveHeader);
                    _logger.LogDebug(
                        "Removed sensitive header from response: {Header} - CorrelationId: {CorrelationId}",
                        sensitiveHeader,
                        correlationId);
                }
            }

            _logger.LogDebug("Response validation completed - CorrelationId: {CorrelationId}", correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during response validation - CorrelationId: {CorrelationId}", correlationId);
        }
    }

    private bool ContainsSuspiciousContent(string content)
    {
        if (string.IsNullOrEmpty(content))
        {
            return false;
        }

        var lowerContent = content.ToLowerInvariant();

        // Check for common injection patterns
        var suspiciousPatterns = new[]
        {
            "<script", "javascript:", "onload=", "onerror=",
            "union select", "drop table", "delete from", "insert into",
            "../", "..\\", "file://", "data:",
            "<?php", "<%", "{{", "}}"
        };

        return suspiciousPatterns.Any(pattern => lowerContent.Contains(pattern));
    }

    private int GetJsonDepth(JsonElement element, int currentDepth = 1)
    {
        var maxDepth = currentDepth;

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                var propertyDepth = GetJsonDepth(property.Value, currentDepth + 1);
                maxDepth = Math.Max(maxDepth, propertyDepth);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var itemDepth = GetJsonDepth(item, currentDepth + 1);
                maxDepth = Math.Max(maxDepth, itemDepth);
            }
        }

        return maxDepth;
    }

    private async Task WriteValidationErrorResponse(HttpContext context, ValidationResult validationResult)
    {
        context.Response.StatusCode = 400;
        context.Response.ContentType = "application/json";

        var errorResponse = new
        {
            error = "Validation Error",
            message = validationResult.ErrorMessage,
            correlationId = context.GetCorrelationId(),
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

/// <summary>
/// Configuration options for request validation middleware
/// </summary>
public class RequestValidationOptions
{
    public long MaxRequestSize { get; set; } = 10 * 1024 * 1024; // 10MB
    public int MaxRequestBodySize { get; set; } = 5 * 1024 * 1024; // 5MB
    public int MaxHeaderLength { get; set; } = 8192; // 8KB
    public int MaxParameterNameLength { get; set; } = 256;
    public int MaxParameterValueLength { get; set; } = 2048;
    public int MaxJsonDepth { get; set; } = 10;
    public bool ValidateResponses { get; set; } = true;

    public HashSet<string> AllowedContentTypes { get; set; } = new()
    {
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain"
    };

    public HashSet<string> RequiredHeaders { get; set; } = new();
    
    public HashSet<string> ForbiddenHeaders { get; set; } = new()
    {
        "x-forwarded-for-internal",
        "x-real-ip-internal",
        "x-admin-override"
    };

    public HashSet<string> SensitiveResponseHeaders { get; set; } = new()
    {
        "server",
        "x-powered-by",
        "x-aspnet-version",
        "x-aspnetmvc-version"
    };
}

/// <summary>
/// Validation result container
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; init; }
    public string? ErrorMessage { get; init; }

    public static ValidationResult Valid() => new() { IsValid = true };
    public static ValidationResult Invalid(string errorMessage) => new() { IsValid = false, ErrorMessage = errorMessage };
}

/// <summary>
/// Extensions for configuring request validation middleware
/// </summary>
public static class RequestValidationExtensions
{
    /// <summary>
    /// Add request validation middleware to the pipeline
    /// </summary>
    public static IApplicationBuilder UseRequestValidation(
        this IApplicationBuilder builder, 
        RequestValidationOptions? options = null)
    {
        return builder.UseMiddleware<RequestValidationMiddleware>(options ?? new RequestValidationOptions());
    }
}
