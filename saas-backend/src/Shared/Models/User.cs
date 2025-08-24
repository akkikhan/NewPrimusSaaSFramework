using System.ComponentModel.DataAnnotations;

namespace SaaSFramework.Shared.Models;

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    public string? FirstName { get; set; }
    
    public string? LastName { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public List<string> Roles { get; set; } = new();
    
    public string? RefreshToken { get; set; }
    
    public DateTime? RefreshTokenExpiry { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastLogin { get; set; }
    
    public DateTime? LastLoginAt { get; set; }
    
    public decimal CreditBalance { get; set; } = 0;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class Session
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string Token { get; set; } = string.Empty;
    
    public DateTime ExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserResponse User { get; set; } = new();
    public DateTime ExpiresAt { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
}

public class UserResponse
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public decimal CreditBalance { get; set; }
}

public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
