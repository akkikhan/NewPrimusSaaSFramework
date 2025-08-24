import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FixedAuthService } from '../../../core/services/fixed-auth.service';

@Component({
  selector: 'app-fixed-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <!-- Header -->
        <div class="login-header">
          <div class="logo">
            <div class="logo-icon">🏭</div>
            <h1>SaaS Factory</h1>
          </div>
          <p class="tagline">Enterprise Platform Management</p>
        </div>

        <!-- Login Content -->
        <div class="login-content">
          <h2>Platform Administrator Login</h2>
          
          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-section">
            <div class="loading-spinner"></div>
            <p>Authenticating with Azure AD...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="error && !isLoading" class="error-section">
            <div class="error-icon">⚠️</div>
            <p>{{error}}</p>
            <button class="btn-retry" (click)="retry()">Try Again</button>
          </div>

          <!-- Login Button -->
          <div *ngIf="!isLoading && !error" class="login-section">
            <p class="login-description">
              Sign in with your Azure AD account to access the platform
            </p>

            <button 
              class="btn-azure-login" 
              (click)="login()"
              [disabled]="isLoading">
              <span class="ms-logo">
                <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
                  <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
                  <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
                  <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
                  <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
                </svg>
              </span>
              Sign in with Microsoft
            </button>

            <div class="help-text">
              <p>Use your corporate Microsoft account</p>
            </div>
          </div>

          <!-- Debug Info -->
          <div class="debug-section" *ngIf="showDebug">
            <h3>Debug Information</h3>
            <div class="debug-item">
              <strong>Return URL:</strong> {{returnUrl}}
            </div>
            <div class="debug-item">
              <strong>Session Storage:</strong> {{hasSessionData ? 'Yes' : 'No'}}
            </div>
            <div class="debug-item">
              <strong>Failed Requests:</strong> {{failedRequestsCount}}
            </div>
            <button class="btn-clear" (click)="clearStorage()">Clear All Storage</button>
          </div>

          <button class="btn-debug" (click)="toggleDebug()">
            {{showDebug ? 'Hide' : 'Show'}} Debug Info
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      padding: 3rem;
      width: 100%;
      max-width: 450px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .logo-icon {
      font-size: 2.5rem;
    }

    .logo h1 {
      color: #2c3e50;
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .tagline {
      color: #7f8c8d;
      margin: 0;
      font-size: 0.95rem;
    }

    .login-content h2 {
      color: #2c3e50;
      margin: 0 0 2rem 0;
      font-size: 1.5rem;
      text-align: center;
    }

    .loading-section {
      text-align: center;
      padding: 2rem 0;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-section {
      text-align: center;
      padding: 2rem;
      background: #fee;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .error-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .error-section p {
      color: #c00;
      margin: 0 0 1rem 0;
    }

    .btn-retry {
      background: #c00;
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.95rem;
    }

    .btn-retry:hover {
      background: #a00;
    }

    .login-description {
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .btn-azure-login {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: #0078d4;
      color: white;
      border: none;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-azure-login:hover:not(:disabled) {
      background: #106ebe;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
    }

    .btn-azure-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .ms-logo {
      display: flex;
      align-items: center;
    }

    .help-text {
      text-align: center;
      margin-top: 1rem;
    }

    .help-text p {
      color: #95a5a6;
      font-size: 0.875rem;
      margin: 0;
    }

    .debug-section {
      margin-top: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .debug-section h3 {
      margin: 0 0 1rem 0;
      color: #555;
      font-size: 1rem;
    }

    .debug-item {
      margin-bottom: 0.5rem;
      color: #666;
    }

    .btn-clear {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    .btn-clear:hover {
      background: #c0392b;
    }

    .btn-debug {
      background: transparent;
      color: #95a5a6;
      border: 1px solid #ecf0f1;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 1rem;
      width: 100%;
    }

    .btn-debug:hover {
      color: #667eea;
      border-color: #667eea;
    }
  `]
})
export class FixedLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  error: string | null = null;
  returnUrl = '/dashboard';
  showDebug = false;
  hasSessionData = false;
  failedRequestsCount = 0;

  constructor(
    private authService: FixedAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get return URL
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    sessionStorage.setItem('authReturnUrl', this.returnUrl);
    
    // Subscribe to auth state
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isLoading = state.isLoading;
        this.error = state.error;
        
        if (state.isAuthenticated && !state.isLoading) {
          console.log('✅ [Fixed Login] User authenticated, redirecting...');
          this.router.navigate([this.returnUrl]);
        }
      });
    
    // Check debug info
    this.checkDebugInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async login(): Promise<void> {
    try {
      this.error = null;
      await this.authService.login();
    } catch (error) {
      console.error('❌ [Fixed Login] Login error:', error);
      this.error = 'Login failed. Please try again.';
    }
  }

  retry(): void {
    this.error = null;
    this.login();
  }

  toggleDebug(): void {
    this.showDebug = !this.showDebug;
    if (this.showDebug) {
      this.checkDebugInfo();
    }
  }

  checkDebugInfo(): void {
    // Check session storage
    this.hasSessionData = !!(sessionStorage.getItem('authToken') || sessionStorage.getItem('userData'));
    
    // Count failed requests
    this.failedRequestsCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('failedRequests')) {
        this.failedRequestsCount++;
      }
    }
  }

  clearStorage(): void {
    console.log('🧹 [Fixed Login] Clearing all storage...');
    sessionStorage.clear();
    localStorage.clear();
    this.checkDebugInfo();
    alert('Storage cleared. Please refresh the page.');
  }
}
