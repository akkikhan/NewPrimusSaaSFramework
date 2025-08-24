using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;

namespace SaaSFramework.RBAC.Controllers;

[ApiController]
[Route("api/v2/rbac/user-roles")]
[Authorize]
public class UserRolesController : ControllerBase
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly ILogger<UserRolesController> _logger;
    private const string ContainerName = "rbac";

    public UserRolesController(
        ICosmosDbService cosmosDbService,
        ILogger<UserRolesController> logger)
    {
        _cosmosDbService = cosmosDbService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UserRoleResponse>>>> GetUserRoles([FromQuery] string? userId = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<List<UserRoleResponse>>.ErrorResult("Tenant context is required"));
            }

            var userRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId,
                ur => string.IsNullOrEmpty(userId) || ur.UserId == userId
            );

            var response = new List<UserRoleResponse>();
            foreach (var userRole in userRoles)
            {
                var role = await _cosmosDbService.GetItemAsync<Role>(userRole.RoleId, tenantId, ContainerName);
                response.Add(new UserRoleResponse
                {
                    Id = userRole.Id,
                    UserId = userRole.UserId,
                    RoleId = userRole.RoleId,
                    RoleName = role?.Name ?? "Unknown",
                    AssignedAt = userRole.AssignedAt,
                    AssignedBy = userRole.AssignedBy
                });
            }

            return Ok(ApiResponse<List<UserRoleResponse>>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user roles");
            return StatusCode(500, ApiResponse<List<UserRoleResponse>>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserRoleResponse>>> AssignRole([FromBody] AssignRoleRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var currentUserId = HttpContext.GetUserId();
            
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<UserRoleResponse>.ErrorResult("Tenant context is required"));
            }

            // Check if role exists
            var role = await _cosmosDbService.GetItemAsync<Role>(request.RoleId, tenantId, ContainerName);
            if (role == null)
            {
                return NotFound(ApiResponse<UserRoleResponse>.ErrorResult("Role not found"));
            }

            // Check if user already has this role
            var existingUserRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId, 
                ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId
            );

            if (existingUserRoles.Any())
            {
                return Conflict(ApiResponse<UserRoleResponse>.ErrorResult("User already has this role"));
            }

            var userRole = new UserRole
            {
                TenantId = tenantId,
                UserId = request.UserId,
                RoleId = request.RoleId,
                AssignedBy = currentUserId ?? "system"
            };

            var createdUserRole = await _cosmosDbService.CreateItemAsync(userRole, ContainerName);

            var response = new UserRoleResponse
            {
                Id = createdUserRole.Id,
                UserId = createdUserRole.UserId,
                RoleId = createdUserRole.RoleId,
                RoleName = role.Name,
                AssignedAt = createdUserRole.AssignedAt,
                AssignedBy = createdUserRole.AssignedBy
            };

            _logger.LogInformation("Assigned role {RoleId} to user {UserId} in tenant {TenantId}", 
                request.RoleId, request.UserId, tenantId);

            return CreatedAtAction(
                nameof(GetUserRoles),
                new { userId = request.UserId },
                ApiResponse<UserRoleResponse>.SuccessResult(response, "Role assigned successfully")
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning role");
            return StatusCode(500, ApiResponse<UserRoleResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpDelete("{userId}/{roleId}")]
    public async Task<ActionResult<ApiResponse<object>>> RemoveRole(string userId, string roleId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Tenant context is required"));
            }

            var userRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId, 
                ur => ur.UserId == userId && ur.RoleId == roleId
            );

            var userRole = userRoles.FirstOrDefault();
            if (userRole == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("User role assignment not found"));
            }

            await _cosmosDbService.DeleteItemAsync(userRole.Id, tenantId, ContainerName);

            _logger.LogInformation("Removed role {RoleId} from user {UserId} in tenant {TenantId}", 
                roleId, userId, tenantId);

            return Ok(ApiResponse<object>.SuccessResult(null, "Role removed successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing role");
            return StatusCode(500, ApiResponse<object>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("users/{userId}/permissions")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetUserPermissions(string userId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<List<string>>.ErrorResult("Tenant context is required"));
            }

            var userRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId, 
                ur => ur.UserId == userId
            );

            var permissions = new List<string>();
            foreach (var userRole in userRoles)
            {
                var role = await _cosmosDbService.GetItemAsync<Role>(userRole.RoleId, tenantId, ContainerName);
                if (role != null)
                {
                    permissions.AddRange(role.Permissions);
                }
            }

            var uniquePermissions = permissions.Distinct().ToList();
            return Ok(ApiResponse<List<string>>.SuccessResult(uniquePermissions));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user permissions for user {UserId}", userId);
            return StatusCode(500, ApiResponse<List<string>>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("users/{userId}/roles")]
    public async Task<ActionResult<ApiResponse<List<RoleResponse>>>> GetUserRolesDetailed(string userId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<List<RoleResponse>>.ErrorResult("Tenant context is required"));
            }

            var userRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId, 
                ur => ur.UserId == userId
            );

            var roles = new List<RoleResponse>();
            foreach (var userRole in userRoles)
            {
                var role = await _cosmosDbService.GetItemAsync<Role>(userRole.RoleId, tenantId, ContainerName);
                if (role != null)
                {
                    roles.Add(new RoleResponse
                    {
                        Id = role.Id,
                        Name = role.Name,
                        Description = role.Description,
                        Permissions = role.Permissions,
                        IsSystem = role.IsSystem,
                        CreatedAt = role.CreatedAt
                    });
                }
            }

            return Ok(ApiResponse<List<RoleResponse>>.SuccessResult(roles));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user roles for user {UserId}", userId);
            return StatusCode(500, ApiResponse<List<RoleResponse>>.ErrorResult("Internal server error"));
        }
    }
}