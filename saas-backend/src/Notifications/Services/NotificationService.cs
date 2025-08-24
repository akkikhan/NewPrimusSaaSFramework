using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;

namespace SaaSFramework.Notifications.Services
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string tenantId, string userId, string title, string message, NotificationType type = NotificationType.Info);
        Task<IEnumerable<Notification>> GetUserNotificationsAsync(string tenantId, string userId, int page = 1, int pageSize = 20);
        Task MarkAsReadAsync(string tenantId, string notificationId);
        Task MarkAllAsReadAsync(string tenantId, string userId);
        Task DeleteNotificationAsync(string tenantId, string notificationId);
    }

    public class NotificationService : INotificationService
    {
        private readonly ICosmosDbService _cosmosDbService;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            ICosmosDbService cosmosDbService,
            ILogger<NotificationService> logger)
        {
            _cosmosDbService = cosmosDbService;
            _logger = logger;
        }

        public async Task SendNotificationAsync(string tenantId, string userId, string title, string message, NotificationType type = NotificationType.Info)
        {
            try
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = tenantId,
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Type = type,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                await _cosmosDbService.CreateItemAsync(notification, "notifications");
                _logger.LogInformation("Notification sent to user {UserId} in tenant {TenantId}", userId, tenantId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send notification to user {UserId}", userId);
                throw;
            }
        }

        public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(string tenantId, string userId, int page = 1, int pageSize = 20)
        {
            try
            {
                // Get all notifications for the tenant (simplified approach)
                var notifications = await _cosmosDbService.GetItemsAsync<Notification>("notifications", tenantId);
                
                // Filter by userId and order by createdAt in memory
                var filteredNotifications = notifications
                    .Where(n => n.UserId == userId)
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize);
                
                return filteredNotifications;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get notifications for user {UserId}", userId);
                throw;
            }
        }

        public async Task MarkAsReadAsync(string tenantId, string notificationId)
        {
            try
            {
                var notification = await _cosmosDbService.GetItemAsync<Notification>("notifications", notificationId, tenantId);
                if (notification != null)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    await _cosmosDbService.UpdateItemAsync(notification, "notifications", tenantId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark notification {NotificationId} as read", notificationId);
                throw;
            }
        }

        public async Task MarkAllAsReadAsync(string tenantId, string userId)
        {
            try
            {
                // Get all notifications for the tenant and filter unread ones for the user
                var notifications = await _cosmosDbService.GetItemsAsync<Notification>("notifications", tenantId);
                var unreadNotifications = notifications.Where(n => n.UserId == userId && !n.IsRead);
                
                foreach (var notification in unreadNotifications)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    await _cosmosDbService.UpdateItemAsync(notification, "notifications", tenantId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to mark all notifications as read for user {UserId}", userId);
                throw;
            }
        }

        public async Task DeleteNotificationAsync(string tenantId, string notificationId)
        {
            try
            {
                await _cosmosDbService.DeleteItemAsync("notifications", notificationId, tenantId);
                _logger.LogInformation("Notification {NotificationId} deleted", notificationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete notification {NotificationId}", notificationId);
                throw;
            }
        }
    }
}