using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;

namespace SaaSFramework.RBAC.Controllers;

[ApiController]
[Route("api/v2/rbac/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly ILogger<PermissionsController> _logger;
    private const string ContainerName = "rbac";

    public PermissionsController(
        ICosmosDbService cosmosDbService,
        ILogger<PermissionsController> logger)
    {
        _cosmosDbService = cosmosDbService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Permission>>>> GetPermissions()
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<List<Permission>>.ErrorResult("Tenant context is required"));
            }

            var permissions = await _cosmosDbService.GetItemsAsync<Permission>(ContainerName, tenantId);
            return Ok(ApiResponse<List<Permission>>.SuccessResult(permissions));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving permissions");
            return StatusCode(500, ApiResponse<List<Permission>>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Permission>>> CreatePermission([FromBody] CreatePermissionRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<Permission>.ErrorResult("Tenant context is required"));
            }

            // Check if permission key already exists
            var existingPermissions = await _cosmosDbService.GetItemsAsync<Permission>(
                ContainerName, 
                tenantId, 
                p => p.Key == request.Key
            );

            if (existingPermissions.Any())
            {
                return Conflict(ApiResponse<Permission>.ErrorResult("Permission key already exists"));
            }

            var permission = new Permission
            {
                TenantId = tenantId,
                Key = request.Key,
                Description = request.Description,
                Category = request.Category,
                IsSystem = false
            };

            var createdPermission = await _cosmosDbService.CreateItemAsync(permission, ContainerName);

            _logger.LogInformation("Created permission {PermissionKey} in tenant {TenantId}", request.Key, tenantId);

            return CreatedAtAction(
                nameof(GetPermissions),
                null,
                ApiResponse<Permission>.SuccessResult(createdPermission, "Permission created successfully")
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating permission");
            return StatusCode(500, ApiResponse<Permission>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost("check")]
    public async Task<ActionResult<ApiResponse<CheckPermissionResponse>>> CheckPermission([FromBody] CheckPermissionRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<CheckPermissionResponse>.ErrorResult("Tenant context is required"));
            }

            // Get user roles
            var userRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId, 
                ur => ur.UserId == request.UserId
            );

            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
            
            // Get all permissions from user's roles
            var userPermissions = new List<string>();
            foreach (var roleId in roleIds)
            {
                var role = await _cosmosDbService.GetItemAsync<Role>(roleId, tenantId, ContainerName);
                if (role != null)
                {
                    userPermissions.AddRange(role.Permissions);
                }
            }

            var hasPermission = userPermissions.Contains(request.Permission);

            var response = new CheckPermissionResponse
            {
                HasPermission = hasPermission,
                UserPermissions = userPermissions.Distinct().ToList()
            };

            return Ok(ApiResponse<CheckPermissionResponse>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking permission for user {UserId}", request.UserId);
            return StatusCode(500, ApiResponse<CheckPermissionResponse>.ErrorResult("Internal server error"));
        }
    }
}

public class CreatePermissionRequest
{
    public string Key { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}