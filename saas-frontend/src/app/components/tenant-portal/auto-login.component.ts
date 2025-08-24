import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpBackend } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auto-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auto-login-container">
      <div class="auto-login-card">
        <div class="loading-section" *ngIf="isLoading">
          <div class="loading-spinner"></div>
          <h2>Setting up your account...</h2>
          <p>Please wait while we securely log you in to your tenant portal.</p>
          <div class="progress-steps">
            <div class="step" [class.active]="currentStep >= 1">
              <span class="step-number">1</span>
              <span class="step-text">Validating secure token</span>
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

        <div class="error-section" *ngIf="errorMessage">
          <div class="error-icon">⚠️</div>
          <h2>Auto-Login Failed</h2>
          <p class="error-text">{{errorMessage}}</p>
          <div class="error-actions">
            <button class="btn-primary" (click)="tryManualLogin()">
              Go to Manual Login
            </button>
            <button class="btn-secondary" (click)="contactSupport()">
              Contact Support
            </button>
          </div>
        </div>

        <div class="success-section" *ngIf="successMessage">
          <div class="success-icon">✅</div>
          <h2>Welcome to Your Tenant Portal!</h2>
          <p class="success-text">{{successMessage}}</p>
          <p class="redirect-info">You will be redirected to your dashboard in {{redirectCountdown}} seconds...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auto-login-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .auto-login-card {
      background: white;
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }

    .loading-section h2 {
      color: #2c3e50;
      margin: 1rem 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .loading-section p {
      color: #6c757d;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #e9ecef;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 2rem auto;
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
    }

    .step.active .step-number {
      background: #28a745;
    }

    .step-text {
      font-weight: 500;
      color: #495057;
    }

    .error-section {
      color: #721c24;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-section h2 {
      color: #721c24;
      margin: 1rem 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .error-text {
      color: #721c24;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .success-section {
      color: #155724;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .success-section h2 {
      color: #155724;
      margin: 1rem 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .success-text {
      color: #155724;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .redirect-info {
      color: #6c757d;
      font-size: 0.9rem;
      font-style: italic;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary:hover {
      background: #5a6fd8;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-secondary:hover {
      background: #545b62;
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .auto-login-container {
        padding: 1rem;
      }

      .auto-login-card {
        padding: 2rem;
      }

      .error-actions {
        flex-direction: column;
      }
    }
  `]
})
export class AutoLoginComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  currentStep = 1;
  redirectCountdown = 3;
  
  private token = '';
  private tenantId = '';
  private httpClient: HttpClient; // Separate HTTP client without interceptors

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private httpBackend: HttpBackend
  ) {
    // Create a separate HTTP client that bypasses all interceptors
    this.httpClient = new HttpClient(httpBackend);
  }

  ngOnInit(): void {
    console.log('🔐 [Auto-Login] Component initialized');
    this.route.params.subscribe(params => {
      this.token = params['token'];
      console.log('🔐 [Auto-Login] Token received:', this.token ? 'Present' : 'Missing');
      if (this.token) {
        this.performAutoLogin();
      } else {
        this.errorMessage = 'Invalid auto-login link. No token provided.';
        this.isLoading = false;
      }
    });
  }

  private async performAutoLogin(): Promise<void> {
    try {
      console.log('🔐 [Auto-Login] Starting auto-login process...');
      
      // Step 1: Validate token
      this.currentStep = 1;
      console.log('🔐 [Auto-Login] Step 1: Validating secure token');
      await this.delay(1000);

      // Create headers without authentication for the auto-login endpoint
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-API-Version': '1.0'
      });

      // Call the auto-login API through the gateway
      console.log('🔐 [Auto-Login] Calling auto-login API through gateway...');
      const response = await this.httpClient.get<any>(
        `${environment.apiUrl}/tenants/auto-login/${this.token}`,
        { headers }
      ).toPromise();

      console.log('🔐 [Auto-Login] API response received:', response);

      // Step 2: Set up session
      this.currentStep = 2;
      console.log('🔐 [Auto-Login] Step 2: Setting up session');
      await this.delay(1000);

      if (response && response.success) {
        console.log('🔐 [Auto-Login] Auto-login successful, storing session data');
        
        // Store the session token and user data
        localStorage.setItem('tenant_token', response.token);
        localStorage.setItem('tenant_user', JSON.stringify(response.user));
        localStorage.setItem('tenant_info', JSON.stringify(response.tenant));
        
        this.tenantId = response.tenant.id;
        this.successMessage = `Welcome to ${response.tenant.name}! Your secure session has been established.`;

        // Step 3: Redirect to dashboard
        this.currentStep = 3;
        console.log('🔐 [Auto-Login] Step 3: Redirecting to dashboard');
        await this.delay(1000);

        this.isLoading = false;
        this.startRedirectCountdown();
      } else {
        throw new Error(response?.error || 'Auto-login failed');
      }
    } catch (error: any) {
      console.error('❌ [Auto-Login] Error during auto-login:', error);
      this.isLoading = false;
      
      if (error.status === 401) {
        this.errorMessage = 'Your auto-login link has expired or is invalid. Please request a new one or try manual login.';
      } else if (error.status === 400) {
        this.errorMessage = 'This auto-login link has already been used or your password is already set. Please use manual login.';
      } else if (error.status === 404) {
        this.errorMessage = 'Auto-login endpoint not found. Please contact support.';
      } else {
        this.errorMessage = error.error?.error || error.message || 'An unexpected error occurred during auto-login.';
      }
    }
  }

  private startRedirectCountdown(): void {
    console.log('🔐 [Auto-Login] Starting redirect countdown...');
    const countdown = setInterval(() => {
      this.redirectCountdown--;
      if (this.redirectCountdown <= 0) {
        clearInterval(countdown);
        console.log('🔐 [Auto-Login] Redirecting to tenant dashboard:', this.tenantId);
        this.router.navigate(['/tenant', this.tenantId, 'dashboard']);
      }
    }, 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  tryManualLogin(): void {
    console.log('🔐 [Auto-Login] User chose manual login');
    if (this.tenantId) {
      this.router.navigate(['/tenant', this.tenantId, 'login']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  contactSupport(): void {
    console.log('🔐 [Auto-Login] User chose to contact support');
    window.open('mailto:support@saasfactory.com?subject=Auto-Login Issue&body=I encountered an issue with my auto-login link. Please help.', '_blank');
  }
} 