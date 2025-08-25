using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        try
        {
            Console.WriteLine("📧 Starting email test...");
            
            // SMTP configuration from appsettings.json
            var smtpClient = new SmtpClient("smtp.office365.com")
            {
                Port = 587,
                Credentials = new NetworkCredential("dev-saas@primussoft.com", "First@099"),
                EnableSsl = true,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress("dev-saas@primussoft.com", "SaaS Factory Platform"),
                Subject = "🎉 Test Welcome Email - Primus Framework",
                Body = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to Primus Framework</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .credentials { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🎉 Welcome to Primus Framework!</h1>
        </div>
        <div class='content'>
            <h2>Hello Akki,</h2>
            <p>Welcome to Primus Framework! Your tenant has been successfully created and configured.</p>
            
            <div class='credentials'>
                <h3>🔐 Your Test Credentials</h3>
                <p><strong>Tenant:</strong> Primus Software</p>
                <p><strong>Email:</strong> akki@primussoft.com</p>
                <p><strong>Environment:</strong> Development</p>
            </div>
            
            <p>This is a test email to verify SMTP configuration is working correctly.</p>
            
            <p style='text-align: center;'>
                <a href='http://localhost:4200' class='button'>Access Platform</a>
            </p>
            
            <p>Best regards,<br>The Primus Framework Team</p>
        </div>
        <div class='footer'>
            <p>&copy; 2025 Primus Framework. All rights reserved.</p>
        </div>
    </div>
</body>
</html>",
                IsBodyHtml = true
            };

            mailMessage.To.Add("akki@primussoft.com");

            Console.WriteLine("📤 Sending email to akki@primussoft.com...");
            await smtpClient.SendMailAsync(mailMessage);
            Console.WriteLine("✅ Email sent successfully!");
            
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error sending email: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }
        
        Console.WriteLine("Press any key to exit...");
        Console.ReadKey();
    }
}
