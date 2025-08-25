using Microsoft.AspNetCore.Mvc;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using FluentValidation;
using System.Security.Cryptography;

namespace SaaSFramework.Gateway.Controllers;

// Request/Response models for onboarding
public class OnboardingRequest
{
    public string Name { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string? AdminFirstName { get; set; }
    public string? AdminLastName { get; set; }
    public string? Domain { get; set; }
    public string? CompanySize { get; set; }
    public string? Industry { get; set; }
}

public class OnboardingResponse
{
    public object Tenant { get; set; } = new();
    public object AdminUser { get; set; } = new();
    public object Credentials { get; set; } = new();
}

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

    private string GenerateTempPassword()
    {
        const string chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789@#$%";
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[12];
        rng.GetBytes(bytes);
        
        var result = new char[12];
        for (int i = 0; i < 12; i++)
        {
            result[i] = chars[bytes[i] % chars.Length];
        }
        
        return new string(result);
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
            
            // Use cross-partition query to get all tenants from all partitions
            var tenants = await _cosmosDbService.GetAllItemsAsync<Tenant>(ContainerName);
            
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

    [HttpPost("onboard")]
    public async Task<ActionResult<ApiResponse<OnboardingResponse>>> OnboardTenant([FromBody] OnboardingRequest request)
    {
        try
        {
            _logger.LogInformation("Starting tenant onboarding for {TenantName}", request.Name);

            // Validate request
            if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.AdminEmail))
            {
                return BadRequest(ApiResponse<OnboardingResponse>.ErrorResult("Name and AdminEmail are required"));
            }

            // Generate unique tenant ID and credentials
            var tenantId = Guid.NewGuid().ToString();
            var tempPassword = GenerateTempPassword();
            
            // Create tenant
            var tenant = new Tenant
            {
                Id = tenantId,
                OrgId = request.Domain?.ToLowerInvariant() ?? tenantId.ToLowerInvariant(),
                Name = request.Name,
                AdminEmail = request.AdminEmail.ToLowerInvariant(),
                Status = TenantStatus.Active,
                AuthApiKey = _apiKeyService.GenerateApiKey("auth"),
                RbacApiKey = _apiKeyService.GenerateApiKey("rbac"),
                CreatedAt = DateTime.UtcNow
            };

            var createdTenant = await _cosmosDbService.CreateItemAsync(tenant, ContainerName);

            // Create admin user (simplified - in real implementation this would call User service)
            var adminUser = new
            {
                Email = request.AdminEmail,
                TempPassword = tempPassword,
                MustChangePassword = true,
                TenantId = tenantId
            };

            // Send welcome email via Notifications service
            try
            {
                var emailData = new
                {
                    To = request.AdminEmail,
                    TenantName = request.Name,
                    AdminName = request.AdminFirstName ?? "Admin",
                    TenantId = tenantId,
                    TempPassword = tempPassword,
                    LoginUrl = $"http://localhost:4200/tenant/{tenantId}/login"
                };

                // Call notifications service
                using var httpClient = new HttpClient();
                var notificationsUrl = "http://localhost:5003/api/notifications/welcome";
                var jsonContent = System.Text.Json.JsonSerializer.Serialize(emailData);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
                
                var emailResponse = await httpClient.PostAsync(notificationsUrl, content);
                
                if (!emailResponse.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to send welcome email for tenant {TenantId}", tenantId);
                }
                else
                {
                    _logger.LogInformation("Welcome email sent successfully for tenant {TenantId}", tenantId);
                }
            }
            catch (Exception emailEx)
            {
                _logger.LogError(emailEx, "Error sending welcome email for tenant {TenantId}", tenantId);
                // Don't fail the onboarding process if email fails
            }

            // Build response
            var response = new OnboardingResponse
            {
                Tenant = new
                {
                    Id = tenantId,
                    Name = request.Name,
                    Status = "Active",
                    IsVerified = true
                },
                AdminUser = new
                {
                    Email = request.AdminEmail,
                    TempPassword = tempPassword,
                    MustChangePassword = true
                },
                Credentials = new
                {
                    TenantId = tenantId,
                    ApiKey = createdTenant.AuthApiKey,
                    ClientId = $"client_{tenantId[..8]}"
                }
            };

            _logger.LogInformation("Tenant onboarding completed successfully for {TenantId}", tenantId);

            return Ok(ApiResponse<OnboardingResponse>.SuccessResult(response, "Tenant onboarded successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error onboarding tenant");
            return StatusCode(500, ApiResponse<OnboardingResponse>.ErrorResult("Internal server error"));
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

    [HttpGet("modules/catalog")]
    public ActionResult<ApiResponse<List<ModuleCatalogItem>>> GetModulesCatalog()
    {
        try
        {
            _logger.LogInformation("Getting modules catalog");
            
            var modules = new List<ModuleCatalogItem>
            {
                new ModuleCatalogItem 
                { 
                    Id = "user-management", 
                    Name = "User Management", 
                    Description = "Comprehensive user management with roles and permissions",
                    Category = "Core",
                    Price = 29.99m,
                    IsActive = true,
                    Features = new[] { "User CRUD", "Role Management", "Permission Control", "Audit Trail" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "analytics", 
                    Name = "Analytics & Reporting", 
                    Description = "Advanced analytics and custom reporting dashboard",
                    Category = "Analytics",
                    Price = 49.99m,
                    IsActive = true,
                    Features = new[] { "Custom Dashboards", "Data Export", "Real-time Analytics", "Custom Reports" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "rbac", 
                    Name = "Role-Based Access Control", 
                    Description = "Fine-grained access control with custom roles",
                    Category = "Security",
                    Price = 39.99m,
                    IsActive = true,
                    Features = new[] { "Custom Roles", "Permission Matrix", "Access Policies", "Security Audit" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "api-access", 
                    Name = "API Access", 
                    Description = "Full API access with rate limiting and monitoring",
                    Category = "Integration",
                    Price = 19.99m,
                    IsActive = true,
                    Features = new[] { "REST API", "Rate Limiting", "API Keys", "Usage Analytics" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "notifications", 
                    Name = "Notifications", 
                    Description = "Multi-channel notification system",
                    Category = "Communication",
                    Price = 24.99m,
                    IsActive = true,
                    Features = new[] { "Email Notifications", "SMS Alerts", "Push Notifications", "Notification Templates" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "workflow", 
                    Name = "Workflow Automation", 
                    Description = "Automate business processes and workflows",
                    Category = "Automation",
                    Price = 59.99m,
                    IsActive = true,
                    Features = new[] { "Visual Workflow Builder", "Custom Triggers", "Task Automation", "Process Analytics" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "integration", 
                    Name = "Third-party Integrations", 
                    Description = "Connect with popular third-party services",
                    Category = "Integration",
                    Price = 34.99m,
                    IsActive = true,
                    Features = new[] { "Salesforce Integration", "Office 365 Sync", "Slack Notifications", "Zapier Webhooks" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "advanced-security", 
                    Name = "Advanced Security", 
                    Description = "Enhanced security features and compliance tools",
                    Category = "Security",
                    Price = 79.99m,
                    IsActive = true,
                    Features = new[] { "Two-Factor Authentication", "IP Whitelisting", "Compliance Reports", "Security Monitoring" }
                },
                new ModuleCatalogItem 
                { 
                    Id = "auth", 
                    Name = "Authentication System", 
                    Description = "Advanced authentication and session management",
                    Category = "Core",
                    Price = 34.99m,
                    IsActive = true,
                    Features = new[] { "OAuth 2.0", "SAML Integration", "Multi-Factor Auth", "Session Management", "Password Policies" }
                }
            };

            return Ok(ApiResponse<List<ModuleCatalogItem>>.SuccessResult(modules));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving modules catalog");
            return StatusCode(500, ApiResponse<List<ModuleCatalogItem>>.ErrorResult("Internal server error"));
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
