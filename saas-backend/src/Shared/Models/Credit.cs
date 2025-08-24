using System.ComponentModel.DataAnnotations;

namespace SaaSFramework.Shared.Models;

public class Credit
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public decimal Amount { get; set; }
    
    [Required]
    public CreditType Type { get; set; }
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    public string? ReferenceId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? ExpiresAt { get; set; }
    
    public bool IsActive { get; set; } = true;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class CreditBalance
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public decimal Balance { get; set; }
    
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public enum CreditType
{
    Earned,
    Purchased,
    Bonus,
    Spent,
    Refund,
    Expired
}

public class CreditTransaction
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public decimal Amount { get; set; }
    
    [Required]
    public CreditType Type { get; set; }
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    public string? ReferenceId { get; set; }
    
    public decimal BalanceBefore { get; set; }
    
    public decimal BalanceAfter { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}

public class AddCreditRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }
    
    [Required]
    public CreditType Type { get; set; }
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    public string? ReferenceId { get; set; }
    
    public DateTime? ExpiresAt { get; set; }
}

public class DeductCreditRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
    public decimal Amount { get; set; }
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    public string? ReferenceId { get; set; }
}

public class CreditResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public CreditType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
}

public class CreditBalanceResponse
{
    public string UserId { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class CreditTransactionResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public CreditType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ReferenceId { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public DateTime CreatedAt { get; set; }
}
