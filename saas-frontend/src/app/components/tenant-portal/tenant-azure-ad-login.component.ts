import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TenantAzureAdService } from '../../core/services/tenant-azure-ad.service';

@Component({
  selector: 'app-tenant-azure-ad-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tenant-azure-login-container">
      <div class="tenant-azure-login-card">
        <!-- Tenant Branding Header -->
        <div class="tenant-header">
          <div class="tenant-logo">
            <div class="logo-icon">🏢</div>
            <div class="tenant-info">
              <h1>{{tenantDisplayName}}</h1>
              <p class="tenant-subtitle">Enterprise Portal Access</p>
            </div>
          </div>
          <div class="powered-by">
            <span>Powered by</span>
            <div class="saasfactory-logo">
              <span class="factory-icon">🏭</span>
              <span>SaaS Factory</span>
            </div>
          </div>
        </div>

        <!-- Azure AD Login Content -->
        <div class="login-content">
          <h2>Enterprise Authentication</h2>
          <p class="login-description">
            Sign in with your organization's Azure AD account to access {{tenantDisplayName}}
          </p>

          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-section">
            <div class="loading-spinner"></div>
            <p>{{loadingMessage}}</p>
          </div>

          <!-- Error Messages -->
          <div *ngIf="errorMessage" class="error-message">
            <span class="error-icon">⚠️</span>
            <span>{{errorMessage}}</span>
          </div>

          <!-- Success Messages -->
          <div *ngIf="successMessage" class="success-message">
            <span class="success-icon">✅</span>
            <span>{{successMessage}}</span>
          </div>

          <!-- Azure AD Login Button -->
          <div *ngIf="!isLoading && !isAuthenticated" class="azure-login-section">
            <div class="azure-info">
              <h3>🔐 Azure AD Authentication</h3>
              <p>This will:</p>
              <ul>
                <li>Register your organization in Azure AD (if not already registered)</li>
                <li>Provide enterprise-grade security and SSO</li>
                <li>Enable conditional access policies</li>
                <li>Integrate with your existing Azure AD infrastructure</li>
              </ul>
            </div>
            
            <button 
              (click)="loginWithAzureAD()" 
              class="btn-azure-login"
              [disabled]="isLoading">
              <span class="login-icon">
                <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
                  <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
                  <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
                  <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
                </svg>
              </span>
              Sign in with Azure AD
            </button>
          </div>

          <!-- Alternative Login Options removed to keep provider immutable -->

          <!-- Support Links -->
          <div class="support-section">
            <div class="support-links">
              <a href="#" class="support-link">Contact Support</a>
              <span class="separator">|</span>
              <a [routerLink]="['/login']" class="support-link">Platform Admin Login</a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="tenant-footer">
          <p>&copy; 2024 {{tenantDisplayName}}. All rights reserved.</p>
          <p class="powered-footer">Powered by SaaS Factory Platform</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-azure-login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .tenant-azure-login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tenant-header {
      background: linear-gradient(135deg, #0078d4, #106ebe);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .tenant-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .logo-icon {
      font-size: 3rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 0.5rem;
      min-width: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tenant-info h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .tenant-subtitle {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    .powered-by {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      opacity: 0.8;
    }

    .saasfactory-logo {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .login-content {
      padding: 2.5rem;
    }

    .login-content h2 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.6rem;
      text-align: center;
    }

    .login-description {
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .loading-section {
      text-align: center;
      padding: 2rem 0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(0, 120, 212, 0.2);
      border-top: 4px solid #0078d4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .azure-login-section {
      margin-bottom: 2rem;
    }

    .azure-info {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border-left: 4px solid #0078d4;
    }

    .azure-info h3 {
      color: #0078d4;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }

    .azure-info ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .azure-info li {
      margin: 0.5rem 0;
      color: #495057;
      line-height: 1.4;
    }

    .btn-azure-login {
      width: 100%;
      padding: 1rem 1.5rem;
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .btn-azure-login:hover:not(:disabled) {
      background: #106ebe;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 120, 212, 0.3);
    }

    .btn-azure-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .login-icon {
      display: flex;
      align-items: center;
    }

    .alternative-login {
      text-align: center;
      margin-top: 2rem;
    }

    .divider {
      position: relative;
      text-align: center;
      margin: 1.5rem 0;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e9ecef;
    }

    .divider span {
      background: white;
      padding: 0 1rem;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .btn-alternative-login {
      background: transparent;
      color: #0078d4;
      border: 2px solid #0078d4;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: 0 auto;
    }

    .btn-alternative-login:hover {
      background: #0078d4;
      color: white;
    }

    .alternative-note {
      color: #6c757d;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    .error-message, .success-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .success-message {
      background: #d1f2eb;
      color: #0c5460;
      border: 1px solid #bee5e0;
    }

    .support-section {
      margin-top: 2rem;
      text-align: center;
    }

    .support-links {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .support-link {
      color: #0078d4;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .support-link:hover {
      text-decoration: underline;
    }

    .separator {
      color: #6c757d;
    }

    .tenant-footer {
      background: #f8f9fa;
      padding: 1.5rem 2rem;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }

    .tenant-footer p {
      margin: 0;
      color: #6c757d;
      font-size: 0.85rem;
    }

    .powered-footer {
      margin-top: 0.5rem !important;
      font-size: 0.8rem !important;
      opacity: 0.8;
    }
  `]
})
export class TenantAzureAdLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tenantId: string = '';
  tenantDisplayName: string = '';
  email: string = '';
  
  isLoading = false;
  isAuthenticated = false;
  errorMessage = '';
  successMessage = '';
  loadingMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private tenantAzureAdService: TenantAzureAdService
  ) {}

  ngOnInit() {
    // Get tenant ID from route
    this.tenantId = this.route.snapshot.paramMap.get('tenantId') || '';
    
    // Get query parameters
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.tenantDisplayName = this.route.snapshot.queryParamMap.get('tenantName') || 'Your Organization';

    console.log('🏢 [Tenant Azure AD Login] Initialized for tenant:', this.tenantId);

    // Subscribe to tenant Azure AD service state
    this.tenantAzureAdService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoading = isLoading;
      });

    this.tenantAzureAdService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          this.successMessage = 'Authentication successful! Redirecting to dashboard...';
          setTimeout(() => {
            this.router.navigate(['/tenant', this.tenantId, 'dashboard']);
          }, 2000);
        }
      });

    this.tenantAzureAdService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error || '';
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loginWithAzureAD(): void {
    if (this.isLoading) return;

    console.log('🔐 [Tenant Azure AD Login] Starting Azure AD login:', {
      tenantId: this.tenantId,
      email: this.email,
      timestamp: new Date().toISOString(),
      source: 'tenant-portal'
    });
    
    this.loadingMessage = 'Connecting to Azure AD...';
    this.clearError();

    // Store state to ensure role resolution happens after callback
    const pendingRoleCheck = {
      tenantId: this.tenantId,
      email: this.email,
      timestamp: new Date().toISOString(),
      requiresRoleResolution: true
    };
    
    localStorage.setItem('pendingRoleResolution', JSON.stringify(pendingRoleCheck));

    this.tenantAzureAdService.loginWithAzureAD(this.tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('✅ [Tenant Azure AD Login] Azure AD login initiated successfully');
            // Store state to ensure role resolution happens after callback
            localStorage.setItem('pendingRoleResolution', JSON.stringify({
              tenantId: this.tenantId,
              email: this.email,
              timestamp: new Date().toISOString()
            }));
          } else {
            console.error('❌ [Tenant Azure AD Login] Failed to initiate Azure AD login');
            this.errorMessage = 'Failed to initiate Azure AD login. Please try again.';
          }
        },
        error: (error) => {
          console.error('❌ [Tenant Azure AD Login] Login error:', error);
          this.errorMessage = 'Failed to initiate Azure AD login. Please try again.';
        }
      });
  }

  goToLocalLogin(): void {
    console.log('🔑 [Tenant Azure AD Login] Redirecting to local login');
    this.router.navigate(['/tenant', this.tenantId, 'login'], {
      queryParams: { email: this.email }
    });
  }

  private clearError(): void {
    this.errorMessage = '';
  }
} 