using System.ComponentModel.DataAnnotations;

namespace SaaSFramework.Shared.Models;

public enum NotificationType
{
    Info,
    Warning,
    Error,
    Success
}

public class Notification
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    public string TenantId { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Message { get; set; } = string.Empty;
    
    public NotificationType Type { get; set; } = NotificationType.Info;
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? ReadAt { get; set; }

    // Cosmos DB partition key
    public string PartitionKey => TenantId;
}
