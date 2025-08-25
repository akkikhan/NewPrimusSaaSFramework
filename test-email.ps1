# Test Email Script for Primus SaaS Framework
# Send welcome email to akki@primussoft.com

Write-Host "🔧 Starting Email Test..." -ForegroundColor Cyan

try {
    # SMTP Configuration
    $smtpServer = "smtp.office365.com"
    $smtpPort = 587
    $username = "dev-saas@primussoft.com"
    $password = "First@099"
    $fromEmail = "dev-saas@primussoft.com"
    $fromName = "SaaS Factory Platform"
    $toEmail = "akki@primussoft.com"

    Write-Host "📧 Configuring SMTP settings..." -ForegroundColor Yellow

    # Create credentials
    $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($username, $securePassword)

    # Create email content
    $subject = "🎉 Test Welcome Email - Primus Framework Onboarding"
    
    $htmlBody = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to Primus Framework</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; background-color: #e9ecef; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .credentials { background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745; }
        .highlight { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🎉 Welcome to Primus Framework!</h1>
            <p>Your SaaS Platform is Ready</p>
        </div>
        <div class='content'>
            <h2>Hello Akki,</h2>
            <p>Congratulations! Your Primus Framework tenant has been successfully created and configured. This is a <strong>test email</strong> to verify our SMTP integration is working correctly.</p>
            
            <div class='credentials'>
                <h3>🔐 Test Tenant Information</h3>
                <p><strong>Tenant Name:</strong> Primus Software</p>
                <p><strong>Admin Email:</strong> akki@primussoft.com</p>
                <p><strong>Environment:</strong> Development Testing</p>
                <p><strong>Platform:</strong> Primus SaaS Framework</p>
            </div>
            
            <div class='highlight'>
                <h3>✅ Email System Status</h3>
                <ul>
                    <li>SMTP Configuration: ✅ Working</li>
                    <li>Email Template: ✅ Rendering correctly</li>
                    <li>Delivery Test: ✅ In progress</li>
                </ul>
            </div>
            
            <h3>🚀 Next Steps</h3>
            <ol>
                <li>Verify this email arrived in your inbox</li>
                <li>Check spam folder if not in main inbox</li>
                <li>Confirm email formatting looks correct</li>
                <li>Test the onboarding workflow end-to-end</li>
            </ol>
            
            <p style='text-align: center; margin: 30px 0;'>
                <a href='http://localhost:4200' class='button'>Access Development Platform</a>
            </p>
            
            <p>If you received this email successfully, the SMTP integration is working properly and ready for production use.</p>
            
            <p>Best regards,<br>
            <strong>The Primus Framework Development Team</strong></p>
        </div>
        <div class='footer'>
            <p>📧 Email sent from: dev-saas@primussoft.com</p>
            <p>📅 Test Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")</p>
            <p>&copy; 2025 Primus Framework. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"@

    Write-Host "📤 Sending test email..." -ForegroundColor Green
    
    # Send the email
    Send-MailMessage -SmtpServer $smtpServer `
                     -Port $smtpPort `
                     -UseSsl `
                     -Credential $credential `
                     -From $fromEmail `
                     -To $toEmail `
                     -Subject $subject `
                     -Body $htmlBody `
                     -BodyAsHtml `
                     -Priority High

    Write-Host "✅ SUCCESS: Email sent successfully to $toEmail!" -ForegroundColor Green
    Write-Host "📧 Please check your inbox (and spam folder) for the test email." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Email Details:" -ForegroundColor Yellow
    Write-Host "  From: $fromEmail" -ForegroundColor White
    Write-Host "  To: $toEmail" -ForegroundColor White  
    Write-Host "  Subject: $subject" -ForegroundColor White
    Write-Host "  SMTP Server: $smtpServer port $smtpPort" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 SMTP Integration Test: PASSED" -ForegroundColor Green

} catch {
    Write-Host "❌ ERROR: Failed to send email" -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Troubleshooting Steps:" -ForegroundColor Yellow
    Write-Host "1. Verify SMTP credentials are correct" -ForegroundColor White
    Write-Host "2. Check if 'First@099' password is still valid" -ForegroundColor White
    Write-Host "3. Ensure dev-saas@primussoft.com account allows SMTP" -ForegroundColor White
    Write-Host "4. Check firewall/network restrictions" -ForegroundColor White
}

Write-Host ""
Write-Host "📋 Test completed. Check results above." -ForegroundColor Cyan
