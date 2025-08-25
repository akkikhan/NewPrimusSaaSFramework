using Microsoft.AspNetCore.Mvc;
using SaaSFramework.Notifications.Services;

namespace SaaSFramework.Notifications.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(IEmailService emailService, ILogger<NotificationsController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("welcome")]
    public async Task<IActionResult> SendWelcomeEmail([FromBody] WelcomeEmailRequest request)
    {
        try
        {
            _logger.LogInformation("Sending welcome email to {Email} for tenant {TenantName}", 
                request.To, request.TenantName);

            await _emailService.SendWelcomeEmailAsync(
                request.To,
                request.AdminName,
                request.TenantName
            );

            _logger.LogInformation("Welcome email sent successfully to {Email}", request.To);
            return Ok(new { success = true, message = "Welcome email sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending welcome email to {Email}", request.To);
            return StatusCode(500, new { success = false, message = "Failed to send welcome email" });
        }
    }

    [HttpPost("password-reset")]
    public async Task<IActionResult> SendPasswordResetEmail([FromBody] PasswordResetEmailRequest request)
    {
        try
        {
            _logger.LogInformation("Sending password reset email to {Email}", request.To);

            await _emailService.SendPasswordResetEmailAsync(
                request.To,
                "User", // firstName - we could extract from email or make it a request parameter
                request.ResetUrl
            );

            _logger.LogInformation("Password reset email sent successfully to {Email}", request.To);
            return Ok(new { success = true, message = "Password reset email sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending password reset email to {Email}", request.To);
            return StatusCode(500, new { success = false, message = "Failed to send password reset email" });
        }
    }

    [HttpPost("invitation")]
    public async Task<IActionResult> SendInvitationEmail([FromBody] InvitationEmailRequest request)
    {
        try
        {
            _logger.LogInformation("Sending invitation email to {Email} for tenant {TenantName}", 
                request.To, request.TenantName);

            await _emailService.SendInvitationEmailAsync(
                request.To,
                "User", // firstName - could be extracted from email or made a request parameter
                request.InviterName,
                request.TenantName,
                request.InvitationUrl
            );

            _logger.LogInformation("Invitation email sent successfully to {Email}", request.To);
            return Ok(new { success = true, message = "Invitation email sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending invitation email to {Email}", request.To);
            return StatusCode(500, new { success = false, message = "Failed to send invitation email" });
        }
    }
}

// Request models
public class WelcomeEmailRequest
{
    public string To { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string TempPassword { get; set; } = string.Empty;
    public string LoginUrl { get; set; } = string.Empty;
}

public class PasswordResetEmailRequest
{
    public string To { get; set; } = string.Empty;
    public string ResetToken { get; set; } = string.Empty;
    public string ResetUrl { get; set; } = string.Empty;
}

public class InvitationEmailRequest
{
    public string To { get; set; } = string.Empty;
    public string InviterName { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string InvitationUrl { get; set; } = string.Empty;
}
