using System.ComponentModel.DataAnnotations;

namespace SaaSFramework.Shared.Models;

public class Role
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public List<string> Permissions { get; set; } = new();
    
    public bool IsSystem { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class UserRole
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string RoleId { get; set; } = string.Empty;
    
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    
    public string AssignedBy { get; set; } = string.Empty;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class Permission
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string Key { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public string Category { get; set; } = string.Empty;
    
    public bool IsSystem { get; set; } = false;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class CreateRoleRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public List<string> Permissions { get; set; } = new();
}

public class UpdateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
}

public class AssignRoleRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string RoleId { get; set; } = string.Empty;
}

public class CheckPermissionRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string Permission { get; set; } = string.Empty;
}

public class CheckPermissionResponse
{
    public bool HasPermission { get; set; }
    public List<string> UserPermissions { get; set; } = new();
}

public class RoleResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public bool IsSystem { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserRoleResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public string AssignedBy { get; set; } = string.Empty;
}
