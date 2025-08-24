using System.ComponentModel.DataAnnotations;

namespace SaaSFramework.Shared.Models;

public class Tenant
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string OrgId { get; set; } = string.Empty;
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string AdminEmail { get; set; } = string.Empty;
    
    [Required]
    public TenantStatus Status { get; set; } = TenantStatus.Pending;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public string AuthApiKey { get; set; } = string.Empty;
    
    [Required]
    public string RbacApiKey { get; set; } = string.Empty;

    // Cosmos DB partition key
    public string PartitionKey => "tenant";
}

public enum TenantStatus
{
    Pending,
    Active,
    Suspended
}

public class CreateTenantRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string AdminEmail { get; set; } = string.Empty;
    
    [Required]
    [RegularExpression(@"^[a-z0-9-]+$", ErrorMessage = "OrgId must contain only lowercase letters, numbers, and hyphens")]
    public string OrgId { get; set; } = string.Empty;
}

public class TenantResponse
{
    public string Id { get; set; } = string.Empty;
    public string OrgId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public TenantStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public string AuthApiKey { get; set; } = string.Empty;
    public string RbacApiKey { get; set; } = string.Empty;
}
