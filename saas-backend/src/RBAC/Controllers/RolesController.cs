using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;
using FluentValidation;

namespace SaaSFramework.RBAC.Controllers;

[ApiController]
[Route("api/v2/rbac/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly ILogger<RolesController> _logger;
    private const string ContainerName = "rbac";

    public RolesController(
        ICosmosDbService cosmosDbService,
        ILogger<RolesController> logger)
    {
        _cosmosDbService = cosmosDbService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RoleResponse>>>> GetRoles()
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<List<RoleResponse>>.ErrorResult("Tenant context is required"));
            }

            var roles = await _cosmosDbService.GetItemsAsync<Role>(ContainerName, tenantId);
            var response = roles.Select(MapToResponse).ToList();

            return Ok(ApiResponse<List<RoleResponse>>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving roles");
            return StatusCode(500, ApiResponse<List<RoleResponse>>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> GetRole(string id)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<RoleResponse>.ErrorResult("Tenant context is required"));
            }

            var role = await _cosmosDbService.GetItemAsync<Role>(id, tenantId, ContainerName);
            if (role == null)
            {
                return NotFound(ApiResponse<RoleResponse>.ErrorResult("Role not found"));
            }

            return Ok(ApiResponse<RoleResponse>.SuccessResult(MapToResponse(role)));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving role {RoleId}", id);
            return StatusCode(500, ApiResponse<RoleResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> CreateRole([FromBody] CreateRoleRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<RoleResponse>.ErrorResult("Tenant context is required"));
            }

            var validator = new CreateRoleRequestValidator();
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<RoleResponse>.ErrorResult("Validation failed", errors));
            }            // Check if role name already exists
            var existingRoles = await _cosmosDbService.GetItemsAsync<Role>(
                ContainerName, 
                tenantId, 
                r => r.Name == request.Name
            );

            if (existingRoles.Any())
            {
                return Conflict(ApiResponse<RoleResponse>.ErrorResult("Role name already exists"));
            }

            var role = new Role
            {
                TenantId = tenantId,
                Name = request.Name,
                Description = request.Description,
                Permissions = request.Permissions,
                IsSystem = false
            };

            var createdRole = await _cosmosDbService.CreateItemAsync(role, ContainerName);

            _logger.LogInformation("Created role {RoleId} in tenant {TenantId}", role.Id, tenantId);

            return CreatedAtAction(
                nameof(GetRole),
                new { id = createdRole.Id },
                ApiResponse<RoleResponse>.SuccessResult(MapToResponse(createdRole), "Role created successfully")
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating role");
            return StatusCode(500, ApiResponse<RoleResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> UpdateRole(string id, [FromBody] UpdateRoleRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<RoleResponse>.ErrorResult("Tenant context is required"));
            }

            var role = await _cosmosDbService.GetItemAsync<Role>(id, tenantId, ContainerName);
            if (role == null)
            {
                return NotFound(ApiResponse<RoleResponse>.ErrorResult("Role not found"));
            }

            if (role.IsSystem)
            {
                return BadRequest(ApiResponse<RoleResponse>.ErrorResult("Cannot modify system roles"));
            }

            // Update role properties
            if (!string.IsNullOrEmpty(request.Name))
                role.Name = request.Name;
                
            if (!string.IsNullOrEmpty(request.Description))
                role.Description = request.Description;

            if (request.Permissions?.Any() == true)
                role.Permissions = request.Permissions;

            var updatedRole = await _cosmosDbService.UpdateItemAsync(role, ContainerName, tenantId);

            _logger.LogInformation("Updated role {RoleId} in tenant {TenantId}", id, tenantId);

            return Ok(ApiResponse<RoleResponse>.SuccessResult(MapToResponse(updatedRole), "Role updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating role {RoleId}", id);
            return StatusCode(500, ApiResponse<RoleResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteRole(string id)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Tenant context is required"));
            }

            var role = await _cosmosDbService.GetItemAsync<Role>(id, tenantId, ContainerName);
            if (role == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("Role not found"));
            }

            if (role.IsSystem)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Cannot delete system roles"));
            }

            // Check if role is assigned to any users
            var userRoles = await _cosmosDbService.GetItemsAsync<UserRole>(
                ContainerName, 
                tenantId, 
                ur => ur.RoleId == id
            );

            if (userRoles.Any())
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Cannot delete role that is assigned to users"));
            }

            await _cosmosDbService.DeleteItemAsync(id, tenantId, ContainerName);

            _logger.LogInformation("Deleted role {RoleId} in tenant {TenantId}", id, tenantId);

            return Ok(ApiResponse<object>.SuccessResult(null, "Role deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting role {RoleId}", id);
            return StatusCode(500, ApiResponse<object>.ErrorResult("Internal server error"));
        }
    }

    private static RoleResponse MapToResponse(Role role)
    {
        return new RoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            Permissions = role.Permissions,
            IsSystem = role.IsSystem,
            CreatedAt = role.CreatedAt
        };
    }
}

public class CreateRoleRequestValidator : AbstractValidator<CreateRoleRequest>
{
    public CreateRoleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .Length(2, 100);

        RuleFor(x => x.Description)
            .MaximumLength(500);

        RuleForEach(x => x.Permissions)
            .NotEmpty()
            .Matches(@"^[a-z]+\.[a-z]+$")
            .WithMessage("Permission must be in format 'resource.action'");
    }
}