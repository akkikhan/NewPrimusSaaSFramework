import { Injectable } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { delay, tap, switchMap } from 'rxjs/operators';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  useTLS: boolean;
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailResult {
  success: boolean;
  messageId: string;
  timestamp: string;
  error?: string;
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'bounced';
}

@Injectable({
  providedIn: 'root'
})
export class MockEmailService {
  private readonly EMAIL_CONFIG_KEY = 'saasfactory_email_config';
  private readonly EMAIL_QUEUE_KEY = 'saasfactory_email_queue';
  private readonly EMAIL_HISTORY_KEY = 'saasfactory_email_history';

  // Simulate realistic SMTP configuration
  private defaultConfig: EmailConfig = {
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    username: 'noreply@saasfactory.com',
    password: 'SecurePassword2024!',
    useTLS: true
  };

  constructor() {
    console.log('📧 MockEmailService initialized for realistic email simulation');
    this.initializeEmailConfig();
  }

  private initializeEmailConfig(): void {
    if (!localStorage.getItem(this.EMAIL_CONFIG_KEY)) {
      localStorage.setItem(this.EMAIL_CONFIG_KEY, JSON.stringify(this.defaultConfig));
    }
    
    // Initialize email history if it doesn't exist
    if (!localStorage.getItem(this.EMAIL_HISTORY_KEY)) {
      localStorage.setItem(this.EMAIL_HISTORY_KEY, JSON.stringify([]));
    }
  }

  // Simulate sending a welcome email with realistic SMTP flow
  sendWelcomeEmail(tenantData: any): Observable<EmailResult> {
    console.log('📧 MockEmailService: Starting SMTP email simulation');
    console.log('🔧 Connecting to SMTP server...');
    
    // Ensure we have the temp password
    if (!tenantData.tempPassword && tenantData.authType === 'jwt') {
      tenantData.tempPassword = this.generateTempPassword();
      console.log('🔐 Generated temporary password for email');
    }

    const emailMessage: EmailMessage = {
      to: tenantData.adminEmail,
      from: 'noreply@saasfactory.com',
      subject: `🎉 Welcome to Primus Framework - ${tenantData.name} Tenant Ready!`,
      htmlContent: this.generateWelcomeEmailHTML(tenantData),
      textContent: this.generateWelcomeEmailText(tenantData)
    };

    return this.simulateSmtpConnection().pipe(
      switchMap(() => this.simulateEmailSending(emailMessage)),
      tap((result) => {
        this.logEmailToHistory(emailMessage, result);
        if (result.success) {
          console.log('✅ Email sent successfully via SMTP to:', tenantData.adminEmail);
          console.log('📧 Message ID:', result.messageId);
        } else {
          console.error('❌ Email sending failed:', result.error);
        }
      })
    );
  }

  private simulateSmtpConnection(): Observable<boolean> {
    return of(null).pipe(
      delay(800), // Simulate connection time
      tap(() => console.log('🔗 Connecting to smtp.office365.com:587...')),
      delay(400),
      tap(() => console.log('🔐 Authenticating with SMTP server...')),
      delay(300),
      tap(() => console.log('✅ SMTP connection established successfully')),
      switchMap(() => of(true))
    );
  }

  private simulateEmailSending(message: EmailMessage): Observable<EmailResult> {
    return of(null).pipe(
      delay(500),
      tap(() => console.log('📝 Composing email message...')),
      delay(700),
      tap(() => console.log('📤 Sending email via SMTP...')),
      delay(1200),
      tap(() => console.log('📧 Email queued for delivery...')),
      delay(800),
      switchMap(() => {
        // Simulate occasional failures for realism (5% failure rate)
        const isSuccess = Math.random() > 0.05;
        
        const result: EmailResult = {
          success: isSuccess,
          messageId: this.generateMessageId(),
          timestamp: new Date().toISOString(),
          deliveryStatus: isSuccess ? 'sent' : 'failed',
          error: isSuccess ? undefined : 'SMTP server temporary unavailable'
        };

        if (isSuccess) {
          console.log('✅ Email sent successfully to SMTP server');
          console.log('📧 Message ID:', result.messageId);
          
          // Simulate delivery confirmation after a delay
          timer(3000).subscribe(() => {
            console.log('📬 Email delivery confirmation received');
            this.updateDeliveryStatus(result.messageId, 'delivered');
          });
        }

        return of(result);
      })
    );
  }

  private generateTempPassword(): string {
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    
    let password = '';
    password += upperCase.charAt(Math.floor(Math.random() * upperCase.length));
    password += lowerCase.charAt(Math.floor(Math.random() * lowerCase.length));
    password += digits.charAt(Math.floor(Math.random() * digits.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    for (let i = 4; i < 12; i++) {
      const allChars = upperCase + lowerCase + digits + special;
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password;
  }

  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}.${random}@saasfactory.com`;
  }

  private generateWelcomeEmailHTML(tenantData: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
                        <title>Welcome to Primus Framework</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: #fff; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                                    <h1>🎉 Welcome to Primus Framework!</h1>
                <p>Your ${tenantData.name} tenant is ready</p>
            </div>
            <div class="content">
                <h2>Congratulations!</h2>
                                  <p>Your Primus Framework tenant has been successfully created and configured. You can now start integrating our platform into your application.</p>
                
                <div class="credentials">
                    <h3>🔐 Your Tenant Credentials</h3>
                    <p><strong>Tenant ID:</strong> <code>${tenantData.tenantId || tenantData.id || 'Will be generated'}</code></p>
                    <p><strong>API Key:</strong> <code>${tenantData.apiKey || 'Will be generated'}</code></p>
                    <p><strong>Admin Email:</strong> <code>${tenantData.adminEmail}</code></p>
                    ${tenantData.tempPassword ? `<p><strong>Temporary Password:</strong> <code>${tenantData.tempPassword}</code></p>
                    <p style="color: #dc2626; font-size: 0.9em;">⚠️ Please change this password on first login</p>` : ''}
                    <p><strong>Authentication Method:</strong> ${tenantData.authType || 'JWT'}</p>
                    <p style="margin-top: 15px; padding: 10px; background: #e8f4f8; border-radius: 4px;">
                        <strong>🔗 Tenant Portal Login:</strong><br>
                        <a href="${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${tenantData.tenantId || tenantData.id}" style="color: #0078d4;">
                            ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${tenantData.tenantId || tenantData.id}
                        </a>
                    </p>
                </div>

                <h3>🚀 Getting Started</h3>
                <ol>
                    <li>Click the button below to access your tenant portal</li>
                    <li>Log in using your admin credentials</li>
                    <li>Configure your application settings</li>
                    <li>Start integrating our APIs</li>
                </ol>

                <div style="text-align: center; margin: 30px 0;">
                    ${tenantData.authType === 'azuread' ? `
                    <a href="${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/consent/${tenantData.tenantId || 'demo'}" class="button" style="background: #0078d4; margin-bottom: 10px; display: inline-block;">
                        Complete Azure AD Registration
                    </a>
                    <br>
                    <small style="color: #666;">Click above to complete your Azure AD setup, then access your portal below</small>
                    <br><br>
                    ` : ''}
                    <a href="${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${tenantData.tenantId || tenantData.id || 'demo'}" class="button">
                        Access Your Tenant Portal
                    </a>
                    <br>
                    <small style="color: #666; margin-top: 10px; display: block;">
                        Direct login URL: ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${tenantData.tenantId || tenantData.id || 'demo'}
                    </small>
                </div>

                <h3>📚 Resources</h3>
                <ul>
                    <li><a href="${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/docs">API Documentation</a></li>
                    <li><a href="${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/docs/quickstart">Quick Start Guide</a></li>
                    <li><a href="mailto:support@saasfactory.com">Technical Support</a></li>
                </ul>

                <div style="background: #e8f4f8; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p><strong>💡 Need Help?</strong></p>
                    <p>Our support team is ready to help you get started. Contact us at <a href="mailto:support@saasfactory.com">support@saasfactory.com</a> or through your tenant portal.</p>
                </div>
            </div>
            <div class="footer">
                                  <p>© 2024 Primus Framework Platform. All rights reserved.</p>
                <p>This email was sent to ${tenantData.adminEmail} regarding your tenant setup.</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  private generateWelcomeEmailText(tenantData: any): string {
    return `
      Welcome to Primus Framework!

Your ${tenantData.name} tenant is ready.

TENANT CREDENTIALS:
- Tenant ID: ${tenantData.tenantId || 'Generated automatically'}
- API Key: ${tenantData.apiKey || 'Generated automatically'}
- Admin Email: ${tenantData.adminEmail}
${tenantData.tempPassword ? `- Temporary Password: ${tenantData.tempPassword}` : ''}
- Authentication: ${tenantData.authType || 'JWT'}

GETTING STARTED:
${tenantData.authType === 'azuread' ? `1. Complete Azure AD registration: ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/consent/${tenantData.tenantId || 'demo'}
2. Visit your tenant portal: ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${tenantData.tenantId || tenantData.id || 'demo'}
3. Log in with your admin credentials
4. Configure your application settings
5. Start integrating our APIs` : `1. Visit your tenant portal: ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${tenantData.tenantId || tenantData.id || 'demo'}
2. Log in with your admin credentials
3. Configure your application settings
4. Start integrating our APIs`}

RESOURCES:
- API Documentation: ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/docs
- Quick Start Guide: ${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/docs/quickstart
- Support: support@saasfactory.com

Best regards,
      The Primus Framework Team
    `.trim();
  }

  private logEmailToHistory(message: EmailMessage, result: EmailResult): void {
    try {
      const history = JSON.parse(localStorage.getItem(this.EMAIL_HISTORY_KEY) || '[]');
      const emailRecord = {
        ...message,
        result,
        timestamp: new Date().toISOString(),
        id: result.messageId
      };
      history.push(emailRecord);
      
      // Keep only last 100 emails
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      localStorage.setItem(this.EMAIL_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error logging email to history:', error);
    }
  }

  private updateDeliveryStatus(messageId: string, status: 'delivered' | 'bounced'): void {
    try {
      const history = JSON.parse(localStorage.getItem(this.EMAIL_HISTORY_KEY) || '[]');
      const emailRecord = history.find((record: any) => record.id === messageId);
      if (emailRecord) {
        emailRecord.result.deliveryStatus = status;
        localStorage.setItem(this.EMAIL_HISTORY_KEY, JSON.stringify(history));
        console.log(`📧 Email delivery status updated: ${messageId} -> ${status}`);
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  // Public methods for monitoring email activity
  getEmailHistory(): Observable<any[]> {
    try {
      const history = JSON.parse(localStorage.getItem(this.EMAIL_HISTORY_KEY) || '[]');
      return of(history).pipe(delay(200));
    } catch (error) {
      return of([]);
    }
  }

  getEmailStats(): Observable<any> {
    try {
      const history = JSON.parse(localStorage.getItem(this.EMAIL_HISTORY_KEY) || '[]');
      const stats = {
        totalSent: history.length,
        delivered: history.filter((email: any) => email.result.deliveryStatus === 'delivered').length,
        failed: history.filter((email: any) => email.result.deliveryStatus === 'failed').length,
        pending: history.filter((email: any) => email.result.deliveryStatus === 'sent').length,
        recentEmails: history.slice(-5).reverse()
      };
      return of(stats).pipe(delay(300));
    } catch (error) {
      return of({
        totalSent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        recentEmails: []
      });
    }
  }

  // Test SMTP connection (for demo purposes)
  testSmtpConnection(): Observable<boolean> {
    console.log('🧪 Testing SMTP connection...');
    return this.simulateSmtpConnection().pipe(
      tap(() => console.log('✅ SMTP connection test successful'))
    );
  }

  // Configure SMTP settings (for demo purposes)
  configureSmtp(config: EmailConfig): Observable<boolean> {
    return of(true).pipe(
      delay(500),
      tap(() => {
        localStorage.setItem(this.EMAIL_CONFIG_KEY, JSON.stringify(config));
        console.log('⚙️ SMTP configuration updated');
      })
    );
  }

  getSmtpConfig(): Observable<EmailConfig> {
    try {
      const config = JSON.parse(localStorage.getItem(this.EMAIL_CONFIG_KEY) || '{}');
      return of({ ...this.defaultConfig, ...config }).pipe(delay(100));
    } catch (error) {
      return of(this.defaultConfig);
    }
  }
} 