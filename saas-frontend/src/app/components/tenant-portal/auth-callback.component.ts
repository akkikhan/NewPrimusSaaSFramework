import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TenantAuthService } from '../../services/tenant-auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="callback-card">
        <div class="callback-header">
          <div class="logo">
            <span class="factory-icon">🏭</span>
            <h1>SaaS Factory</h1>
          </div>
        </div>

        <!-- Processing State -->
        <div class="callback-content" *ngIf="isProcessing">
          <div class="processing-section">
            <div class="loading-spinner"></div>
            <h2>Processing Authentication...</h2>
            <p>{{statusMessage}}</p>
            <div class="progress-steps">
              <div class="step" [class.active]="currentStep >= 1">
                <span class="step-number">1</span>
                <span class="step-text">Verifying credentials</span>
              </div>
              <div class="step" [class.active]="currentStep >= 2">
                <span class="step-number">2</span>
                <span class="step-text">Setting up session</span>
              </div>
              <div class="step" [class.active]="currentStep >= 3">
                <span class="step-number">3</span>
                <span class="step-text">Redirecting to dashboard</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Success State -->
        <div class="callback-content" *ngIf="isSuccess && !isProcessing">
          <div class="success-section">
            <div class="success-icon">✅</div>
            <h2>Authentication Successful!</h2>
            <p>Welcome back! You will be redirected to your dashboard shortly...</p>
            <div class="redirect-info">
              <p>Redirecting in {{redirectCountdown}} seconds...</p>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div class="callback-content" *ngIf="hasError && !isProcessing">
          <div class="error-section">
            <div class="error-icon">⚠️</div>
            <h2>Authentication Failed</h2>
            <p class="error-message">{{errorMessage}}</p>
            <div class="error-details" *ngIf="errorDetails">
              <details>
                <summary>Error Details</summary>
                <pre>{{errorDetails}}</pre>
              </details>
            </div>
            <div class="error-actions">
              <button class="btn-retry" (click)="retryAuthentication()">
                🔄 Try Again
              </button>
              <button class="btn-support" (click)="contactSupport()">
                📞 Contact Support
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="callback-footer">
          <p>© 2024 SaaS Factory. Secure Authentication Platform.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .callback-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .callback-header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .factory-icon {
      font-size: 2.5rem;
    }

    .logo h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .callback-content {
      padding: 2.5rem;
      text-align: center;
    }

    .processing-section h2, .success-section h2, .error-section h2 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.8rem;
    }

    .processing-section p, .success-section p, .error-section p {
      color: #7f8c8d;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .progress-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 2rem;
      text-align: left;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      background: #f8f9fa;
      opacity: 0.5;
      transition: all 0.3s ease;
    }

    .step.active {
      opacity: 1;
      background: #e8f5e8;
      border-left: 4px solid #28a745;
    }

    .step-number {
      background: #6c757d;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .step.active .step-number {
      background: #28a745;
    }

    .step-text {
      font-weight: 500;
      color: #495057;
    }

    .success-icon {
      font-size: 4rem;
      color: #28a745;
      margin-bottom: 1rem;
    }

    .redirect-info {
      margin-top: 2rem;
      padding: 1rem;
      background: #e8f5e8;
      border-radius: 8px;
      border: 1px solid #c3e6c3;
    }

    .redirect-info p {
      margin: 0;
      color: #2d5a2d;
      font-weight: 500;
      font-style: italic;
    }

    .error-icon {
      font-size: 4rem;
      color: #e74c3c;
      margin-bottom: 1rem;
    }

    .error-message {
      color: #e74c3c !important;
      font-weight: 500;
      background: #ffebee;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #ffcdd2;
    }

    .error-details {
      margin: 1.5rem 0;
      text-align: left;
    }

    .error-details details {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1rem;
    }

    .error-details summary {
      cursor: pointer;
      font-weight: 600;
      color: #495057;
      margin-bottom: 0.5rem;
    }

    .error-details pre {
      background: #f1f3f4;
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      overflow-x: auto;
      margin: 0.5rem 0 0 0;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
      flex-wrap: wrap;
    }

    .btn-retry, .btn-support {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-retry {
      background: #667eea;
      color: white;
    }

    .btn-retry:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }

    .btn-support {
      background: #6c757d;
      color: white;
    }

    .btn-support:hover {
      background: #545b62;
      transform: translateY(-1px);
    }

    .callback-footer {
      background: #f8f9fa;
      padding: 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: #95a5a6;
      border-top: 1px solid #ecf0f1;
    }

    .callback-footer p {
      margin: 0;
    }

    @media (max-width: 768px) {
      .callback-container { padding: 1rem; }
      .callback-content { padding: 2rem; }
      .error-actions { flex-direction: column; }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  tenantId: string = '';
  isProcessing = true;
  isSuccess = false;
  hasError = false;
  statusMessage = 'Initializing authentication...';
  errorMessage = '';
  errorDetails = '';
  currentStep = 1;
  redirectCountdown = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantAuthService: TenantAuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tenantId = params['tenantId'];
    });

    this.route.queryParams.subscribe(queryParams => {
      const code = queryParams['code'];
      const state = queryParams['state'];
      const error = queryParams['error'];
      const errorDescription = queryParams['error_description'];

      if (error) {
        this.handleAuthError(error, errorDescription);
      } else if (code && state) {
        this.handleAuthCallback(code, state);
      } else {
        this.handleAuthError('invalid_request', 'Missing authorization code or state parameter');
      }
    });
  }

  private async handleAuthCallback(code: string, state: string): Promise<void> {
    try {
      this.currentStep = 1;
      this.statusMessage = 'Processing Azure AD authentication...';
      await this.delay(1000);

      if (environment.features?.enableDebugLogs) {
        console.log(`🔐 [AuthCallback] Processing Azure AD callback for tenant: ${this.tenantId}`);
      }
      
      this.currentStep = 2;
      this.statusMessage = 'Validating authentication with tenant configuration...';
      await this.delay(1000);

      // Use our tenant authentication service to handle the callback
      await this.tenantAuthService.handleAuthCallback(this.tenantId);

      this.currentStep = 3;
      this.statusMessage = 'Authentication successful! Setting up session...';
      await this.delay(1000);

      this.isProcessing = false;
      this.isSuccess = true;
      
      if (environment.features?.enableDebugLogs) {
        console.log(`✅ [AuthCallback] Authentication successful for tenant: ${this.tenantId}`);
      }
      
      // Start redirect countdown
      this.startRedirectCountdown();
      
    } catch (error: any) {
      console.error(`❌ [AuthCallback] Authentication error for tenant ${this.tenantId}:`, error);
      this.handleAuthError('authentication_failed', error?.message || 'Failed to complete Azure AD authentication');
    }
  }

  private handleAuthError(error: string, description?: string): void {
    this.isProcessing = false;
    this.hasError = true;
    
    switch (error) {
      case 'access_denied':
        this.errorMessage = 'Access was denied. You may have cancelled the login or your account may not have permission to access this tenant.';
        break;
      case 'invalid_request':
        this.errorMessage = 'Invalid authentication request. Please try logging in again.';
        break;
      case 'server_error':
        this.errorMessage = 'A server error occurred during authentication. Please try again later.';
        break;
      case 'temporarily_unavailable':
        this.errorMessage = 'Authentication service is temporarily unavailable. Please try again in a few minutes.';
        break;
      default:
        this.errorMessage = description || 'An unknown error occurred during authentication.';
        break;
    }

    if (description && description !== this.errorMessage) {
      this.errorDetails = JSON.stringify({ error, description }, null, 2);
    }

    console.error(`❌ OAuth error for tenant ${this.tenantId}:`, { error, description });
  }

  private startRedirectCountdown(): void {
    const interval = setInterval(() => {
      this.redirectCountdown--;
      if (this.redirectCountdown <= 0) {
        clearInterval(interval);
        this.router.navigate(['/tenants', this.tenantId, 'dashboard']);
      }
    }, 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  retryAuthentication(): void {
    this.router.navigate(['/tenants', this.tenantId, 'login']);
  }

  contactSupport(): void {
    // In a real app, this would open a support ticket or contact form
    alert('Please contact your system administrator for assistance with authentication issues.');
  }
} 