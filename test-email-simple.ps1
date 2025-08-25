# Test Email Script - Simple Version
Write-Host "🔧 Starting Email Test..." -ForegroundColor Cyan

$smtpServer = "smtp.office365.com"
$smtpPort = 587
$username = "dev-saas@primussoft.com"
$password = "First@099"
$fromEmail = "dev-saas@primussoft.com"
$toEmail = "akki@primussoft.com"

Write-Host "📧 Configuring SMTP settings..." -ForegroundColor Yellow

$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($username, $securePassword)

$subject = "🎉 Test Welcome Email - Primus Framework Onboarding"

$htmlBody = @"
<html>
<head><title>Welcome to Primus Framework</title></head>
<body style='font-family: Arial, sans-serif;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;'>
            <h1>🎉 Welcome to Primus Framework!</h1>
            <p>Your SaaS Platform is Ready</p>
        </div>
        <div style='padding: 30px; background-color: #f9f9f9;'>
            <h2>Hello Akki,</h2>
            <p>Congratulations! Your Primus Framework tenant has been successfully created and configured. This is a <strong>test email</strong> to verify our SMTP integration is working correctly.</p>
            
            <div style='background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;'>
                <h3>🔐 Test Tenant Information</h3>
                <p><strong>Tenant Name:</strong> Primus Software</p>
                <p><strong>Admin Email:</strong> akki@primussoft.com</p>
                <p><strong>Environment:</strong> Development Testing</p>
                <p><strong>Platform:</strong> Primus SaaS Framework</p>
            </div>
            
            <p>If you received this email successfully, the SMTP integration is working properly and ready for production use.</p>
            
            <p style='text-align: center; margin: 30px 0;'>
                <a href='http://localhost:4200' style='display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;'>Access Development Platform</a>
            </p>
            
            <p>Best regards,<br><strong>The Primus Framework Development Team</strong></p>
        </div>
        <div style='padding: 20px; text-align: center; color: #666; background-color: #e9ecef; border-radius: 0 0 8px 8px;'>
            <p>📧 Email sent from: dev-saas@primussoft.com</p>
            <p>&copy; 2025 Primus Framework. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"@

try {
    Write-Host "📤 Sending test email..." -ForegroundColor Green
    
    Send-MailMessage -SmtpServer $smtpServer -Port $smtpPort -UseSsl -Credential $credential -From $fromEmail -To $toEmail -Subject $subject -Body $htmlBody -BodyAsHtml
    
    Write-Host "✅ SUCCESS: Email sent successfully to $toEmail!" -ForegroundColor Green
    Write-Host "📧 Please check your inbox (and spam folder) for the test email." -ForegroundColor Cyan
}
catch {
    Write-Host "❌ ERROR: Failed to send email" -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Message)" -ForegroundColor Red
}
