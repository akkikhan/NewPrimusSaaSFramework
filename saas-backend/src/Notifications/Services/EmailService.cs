using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;namespace SaaSFramework.Notifications.Services
{
    public class EmailSettings
    {
        public string Provider { get; set; } = string.Empty;
        public string SmtpHost { get; set; } = string.Empty;
        public int SmtpPort { get; set; }
        public string SmtpUsername { get; set; } = string.Empty;
        public string SmtpPassword { get; set; } = string.Empty;
        public string FromEmail { get; set; } = string.Empty;
        public string FromName { get; set; } = string.Empty;
        public bool SmtpUseSsl { get; set; }
    }

    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body, bool isHtml = true);
        Task SendWelcomeEmailAsync(string to, string firstName, string tenantName);
        Task SendPasswordResetEmailAsync(string to, string firstName, string resetLink);
        Task SendInvitationEmailAsync(string to, string firstName, string inviterName, string tenantName, string invitationLink);
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
                message.To.Add(new MailboxAddress("", to));                message.Subject = subject;

                var bodyBuilder = new BodyBuilder();
                if (isHtml)
                {
                    bodyBuilder.HtmlBody = body;
                }
                else
                {
                    bodyBuilder.TextBody = body;
                }
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(_emailSettings.SmtpHost, _emailSettings.SmtpPort, 
                    _emailSettings.SmtpUseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None);
                
                if (!string.IsNullOrEmpty(_emailSettings.SmtpUsername))
                {
                    await client.AuthenticateAsync(_emailSettings.SmtpUsername, _emailSettings.SmtpPassword);
                }

                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation("Email sent successfully to {To}", to);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To}", to);
                throw;
            }
        }

        public async Task SendWelcomeEmailAsync(string to, string firstName, string tenantName)
        {
            var subject = $"Welcome to {tenantName}!";
            var body = GetWelcomeEmailTemplate(firstName, tenantName);
            await SendEmailAsync(to, subject, body);
        }        public async Task SendPasswordResetEmailAsync(string to, string firstName, string resetLink)
        {
            var subject = "Password Reset Request";
            var body = GetPasswordResetEmailTemplate(firstName, resetLink);
            await SendEmailAsync(to, subject, body);
        }

        public async Task SendInvitationEmailAsync(string to, string firstName, string inviterName, string tenantName, string invitationLink)
        {
            var subject = $"You're invited to join {tenantName}";
            var body = GetInvitationEmailTemplate(firstName, inviterName, tenantName, invitationLink);
            await SendEmailAsync(to, subject, body);
        }

        private string GetWelcomeEmailTemplate(string firstName, string tenantName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to {tenantName}</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .footer {{ padding: 20px; text-align: center; color: #666; }}
        .button {{ display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Welcome to {tenantName}!</h1>
        </div>
        <div class='content'>            <h2>Hello {firstName},</h2>
            <p>Welcome to our SaaS platform! We're excited to have you on board.</p>
            <p>You now have access to a powerful suite of tools and features designed to help you succeed.</p>
            <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
            <p>Best regards,<br>The {tenantName} Team</p>
        </div>
        <div class='footer'>
            <p>&copy; 2024 {tenantName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private string GetPasswordResetEmailTemplate(string firstName, string resetLink)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Password Reset Request</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #dc3545; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .footer {{ padding: 20px; text-align: center; color: #666; }}
        .button {{ display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; }}
        .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Password Reset Request</h1>
        </div>        <div class='content'>
            <h2>Hello {firstName},</h2>
            <p>We received a request to reset your password. If you made this request, click the button below to reset your password:</p>
            <p style='text-align: center;'>
                <a href='{resetLink}' class='button'>Reset Password</a>
            </p>
            <div class='warning'>
                <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, please do not share this email with anyone.</p>
            <p>Best regards,<br>The Support Team</p>
        </div>
        <div class='footer'>
            <p>&copy; 2024 SaaS Framework. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }

        private string GetInvitationEmailTemplate(string firstName, string inviterName, string tenantName, string invitationLink)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Invitation to join {tenantName}</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .footer {{ padding: 20px; text-align: center; color: #666; }}
        .button {{ display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; }}
        .highlight {{ background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin: 10px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>You're Invited!</h1>
        </div>
        <div class='content'>
            <h2>Hello {firstName},</h2>
            <p><strong>{inviterName}</strong> has invited you to join <strong>{tenantName}</strong> on our SaaS platform.</p>
            <div class='highlight'>
                <p>By accepting this invitation, you'll gain access to powerful tools and collaborate with your team.</p>
            </div>
            <p style='text-align: center;'>
                <a href='{invitationLink}' class='button'>Accept Invitation</a>
            </p>
            <p>This invitation will expire in 7 days. If you have any questions, please contact {inviterName} or our support team.</p>
            <p>Best regards,<br>The {tenantName} Team</p>
        </div>
        <div class='footer'>
            <p>&copy; 2024 SaaS Framework. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
        }
    }
}