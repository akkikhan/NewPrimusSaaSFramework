using Microsoft.AspNetCore.Http;
using SaaSFramework.Shared.Services;
using System.Security.Claims;

namespace SaaSFramework.Shared.Middleware;

public class TenantContextMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IJwtService _jwtService;

    public TenantContextMiddleware(RequestDelegate next, IJwtService jwtService)
    {
        _next = next;
        _jwtService = jwtService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract tenant context from JWT token or API key
        var tenantId = ExtractTenantId(context);
        
        if (!string.IsNullOrEmpty(tenantId))
        {
            context.Items["TenantId"] = tenantId;
        }

        await _next(context);
    }

    private string? ExtractTenantId(HttpContext context)
    {
        // Try to get tenant from JWT token first
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        if (authHeader?.StartsWith("Bearer ") == true)
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var principal = _jwtService.ValidateToken(token);
            if (principal != null)
            {
                return principal.FindFirst("tenantId")?.Value;
            }
        }

        // Try to get tenant from API key header
        var apiKeyHeader = context.Request.Headers["X-API-Key"].FirstOrDefault();
        if (!string.IsNullOrEmpty(apiKeyHeader))
        {
            // API key validation should be handled by the specific service
            // This middleware just extracts tenant context
            return ExtractTenantFromApiKey(apiKeyHeader);
        }

        // Try to get tenant from custom header
        var tenantHeader = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(tenantHeader))
        {
            return tenantHeader;
        }

        return null;
    }

    private string? ExtractTenantFromApiKey(string apiKey)
    {
        // This would need to be implemented based on your API key storage
        // For now, return null as tenant validation happens in each service
        return null;
    }
}

public static class TenantContextExtensions
{
    public static string? GetTenantId(this HttpContext context)
    {
        return context.Items["TenantId"]?.ToString();
    }

    public static string? GetUserId(this HttpContext context)
    {
        return context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    public static string? GetUserEmail(this HttpContext context)
    {
        return context.User?.FindFirst(ClaimTypes.Email)?.Value;
    }

    public static List<string> GetUserRoles(this HttpContext context)
    {
        return context.User?.FindAll(ClaimTypes.Role)?.Select(c => c.Value).ToList() ?? new List<string>();
    }
}
