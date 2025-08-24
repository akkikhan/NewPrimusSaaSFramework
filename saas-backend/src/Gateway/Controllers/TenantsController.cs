using Microsoft.AspNetCore.Mvc;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using FluentValidation;

namespace SaaSFramework.Gateway.Controllers;

[ApiController]
[Route("api/v2/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<TenantsController> _logger;
    private const string ContainerName = "tenants";

    public TenantsController(
        ICosmosDbService cosmosDbService,
        IApiKeyService apiKeyService,
        ILogger<TenantsController> logger)
    {
        _cosmosDbService = cosmosDbService;
        _apiKeyService = apiKeyService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<TenantResponse>>>> GetTenants(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] TenantStatus? status = null)
    {
        try
        {
            _logger.LogInformation("Getting tenants - Page: {Page}, PageSize: {PageSize}", page, pageSize);
            
            var tenants = await _cosmosDbService.GetItemsAsync<Tenant>(ContainerName, "tenant");
            
            // Apply filters
            var filteredTenants = tenants.AsQueryable();
            
            if (!string.IsNullOrEmpty(search))
            {
                filteredTenants = filteredTenants.Where(t => 
                    t.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    t.OrgId.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    t.AdminEmail.Contains(search, StringComparison.OrdinalIgnoreCase));
            }
            
            if (status.HasValue)
            {
                filteredTenants = filteredTenants.Where(t => t.Status == status.Value);
            }
            
            var totalCount = filteredTenants.Count();
            var pagedTenants = filteredTenants
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToResponse)
                .ToList();

            var response = new PagedResult<TenantResponse>
            {
                Items = pagedTenants,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            _logger.LogInformation("Returning {Count} tenants", response.Items.Count);
            return Ok(ApiResponse<PagedResult<TenantResponse>>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenants");
            return StatusCode(500, ApiResponse<PagedResult<TenantResponse>>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<TenantResponse>>> GetTenant(string id)
    {
        try
        {
            var tenant = await _cosmosDbService.GetItemAsync<Tenant>(id, "tenant", ContainerName);
            if (tenant == null)
            {
                return NotFound(ApiResponse<TenantResponse>.ErrorResult("Tenant not found"));
            }

            return Ok(ApiResponse<TenantResponse>.SuccessResult(MapToResponse(tenant)));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant {TenantId}", id);
            return StatusCode(500, ApiResponse<TenantResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TenantResponse>>> CreateTenant([FromBody] CreateTenantRequest request)
    {
        try
        {
            // Validate request
            var validator = new CreateTenantRequestValidator();
            var validationResult = await validator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<TenantResponse>.ErrorResult("Validation failed", errors));
            }

            // Check if orgId already exists
            var existingTenants = await _cosmosDbService.GetItemsAsync<Tenant>(
                ContainerName, 
                "tenant", 
                t => t.OrgId == request.OrgId
            );

            if (existingTenants.Any())
            {
                return Conflict(ApiResponse<TenantResponse>.ErrorResult("OrgId already exists"));
            }

            // Create new tenant
            var tenant = new Tenant
            {
                OrgId = request.OrgId.ToLowerInvariant(),
                Name = request.Name,
                AdminEmail = request.AdminEmail.ToLowerInvariant(),
                Status = TenantStatus.Pending,
                AuthApiKey = _apiKeyService.GenerateApiKey("auth"),
                RbacApiKey = _apiKeyService.GenerateApiKey("rbac")
            };

            var createdTenant = await _cosmosDbService.CreateItemAsync(tenant, ContainerName);

            _logger.LogInformation("Created tenant {TenantId} with orgId {OrgId}", tenant.Id, tenant.OrgId);

            return CreatedAtAction(
                nameof(GetTenant),
                new { id = createdTenant.Id },
                ApiResponse<TenantResponse>.SuccessResult(MapToResponse(createdTenant), "Tenant created successfully")
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tenant");
            return StatusCode(500, ApiResponse<TenantResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<TenantResponse>>> UpdateTenant(string id, [FromBody] UpdateTenantRequest request)
    {
        try
        {
            var tenant = await _cosmosDbService.GetItemAsync<Tenant>(id, "tenant", ContainerName);
            if (tenant == null)
            {
                return NotFound(ApiResponse<TenantResponse>.ErrorResult("Tenant not found"));
            }

            // Update tenant properties
            if (!string.IsNullOrEmpty(request.Name))
                tenant.Name = request.Name;
                
            if (request.Status.HasValue)
                tenant.Status = request.Status.Value;

            var updatedTenant = await _cosmosDbService.UpdateItemAsync(tenant, ContainerName, "tenant");

            _logger.LogInformation("Updated tenant {TenantId}", id);

            return Ok(ApiResponse<TenantResponse>.SuccessResult(MapToResponse(updatedTenant), "Tenant updated successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tenant {TenantId}", id);
            return StatusCode(500, ApiResponse<TenantResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteTenant(string id)
    {
        try
        {
            var tenant = await _cosmosDbService.GetItemAsync<Tenant>(id, "tenant", ContainerName);
            if (tenant == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("Tenant not found"));
            }

            await _cosmosDbService.DeleteItemAsync(id, "tenant", ContainerName);

            _logger.LogInformation("Deleted tenant {TenantId}", id);

            return Ok(ApiResponse<object>.SuccessResult(new object(), "Tenant deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tenant {TenantId}", id);
            return StatusCode(500, ApiResponse<object>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("by-org/{orgId}")]
    public async Task<ActionResult<ApiResponse<TenantResponse>>> GetTenantByOrgId(string orgId)
    {
        try
        {
            var tenants = await _cosmosDbService.GetItemsAsync<Tenant>(
                ContainerName, 
                "tenant", 
                t => t.OrgId == orgId.ToLowerInvariant()
            );

            var tenant = tenants.FirstOrDefault();
            if (tenant == null)
            {
                return NotFound(ApiResponse<TenantResponse>.ErrorResult("Tenant not found"));
            }

            return Ok(ApiResponse<TenantResponse>.SuccessResult(MapToResponse(tenant)));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant by orgId {OrgId}", orgId);
            return StatusCode(500, ApiResponse<TenantResponse>.ErrorResult("Internal server error"));
        }
    }

    private static TenantResponse MapToResponse(Tenant tenant)
    {
        return new TenantResponse
        {
            Id = tenant.Id,
            OrgId = tenant.OrgId,
            Name = tenant.Name,
            AdminEmail = tenant.AdminEmail,
            Status = tenant.Status,
            CreatedAt = tenant.CreatedAt,
            AuthApiKey = tenant.AuthApiKey,
            RbacApiKey = tenant.RbacApiKey
        };
    }
}

public class CreateTenantRequestValidator : AbstractValidator<CreateTenantRequest>
{
    public CreateTenantRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .Length(2, 100);

        RuleFor(x => x.AdminEmail)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.OrgId)
            .NotEmpty()
            .Length(2, 50)
            .Matches(@"^[a-z0-9-]+$")
            .WithMessage("OrgId must contain only lowercase letters, numbers, and hyphens");
    }
}

public class UpdateTenantRequest
{
    public string? Name { get; set; }
    public TenantStatus? Status { get; set; }
}
