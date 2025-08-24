import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { RedirectRequest, InteractionStatus, EventType } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-platform-admin-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-section">
          <h1>SaaS Factory</h1>
          <p class="subtitle">Platform Administration Portal</p>
        </div>
        
        <div class="login-content">
          <h2>Platform Administrator Login</h2>
          <p class="description">
            Sign in with your Microsoft account to access the platform administration dashboard.
          </p>
          
          <button 
            class="azure-login-btn" 
            (click)="loginWithAzureAD()" 
            [disabled]="isLoading"
            [class.loading]="isLoading">
            <div class="button-content">
              <div class="spinner" *ngIf="isLoading"></div>
              <svg width="20" height="20" viewBox="0 0 23 23" style="margin-right: 8px;" *ngIf="!isLoading">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>{{ isLoading ? 'Signing in...' : 'Sign in with Microsoft' }}</span>
            </div>
          </button>
          
          <div class="security-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <span>Secure authentication via Microsoft Azure AD</span>
          </div>
          
          <div class="tenant-info">
            <p><strong>Platform Admin Account:</strong> khan.aakib&#64;outlook.com</p>
            <p><strong>Tenant:</strong> khanaakiboutlook.onmicrosoft.com</p>
          </div>
        </div>

        <div class="error-message" *ngIf="errorMessage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ errorMessage }}
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
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 480px;
    }

    .logo-section {
      text-align: center;
      margin-bottom: 48px;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      color: #2d3748;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .subtitle {
      color: #718096;
      font-size: 14px;
      margin-top: 8px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .login-content {
      text-align: center;
    }

    h2 {
      color: #2d3748;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .description {
      color: #4a5568;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 32px;
    }

    .azure-login-btn {
      width: 100%;
      padding: 14px 24px;
      background: #2b2b2b;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      position: relative;
      min-height: 54px;
    }

    .azure-login-btn:hover:not(:disabled) {
      background: #404040;
      transform: translateY(-1px);
      box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.15), 0 3px 6px -1px rgba(0, 0, 0, 0.08);
    }

    .azure-login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .button-content {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .security-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 24px;
      color: #718096;
      font-size: 14px;
    }

    .security-notice svg {
      margin-right: 8px;
    }

    .tenant-info {
      margin-top: 32px;
      padding: 16px;
      background: #f7fafc;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .tenant-info p {
      margin: 4px 0;
      font-size: 13px;
      color: #4a5568;
    }

    .error-message {
      margin-top: 24px;
      padding: 16px;
      background: #fed7d7;
      border: 1px solid #feb2b2;
      border-radius: 8px;
      color: #c53030;
      font-size: 14px;
      display: flex;
      align-items: center;
    }

    .error-message svg {
      margin-right: 8px;
      flex-shrink: 0;
    }
  `]
})
export class PlatformAdminLoginComponent implements OnInit, OnDestroy {
  errorMessage = '';
  isLoading = false;
  private readonly _destroying$ = new Subject<void>();

  constructor(
    private router: Router,
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {}

  ngOnInit() {
    // Listen for interaction status changes
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.checkAndSetActiveAccount();
      });

    // Listen for login success
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this._destroying$)
      )
      .subscribe((result) => {
        console.log('✅ Platform Admin login successful:', result);
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      });

    // Listen for login failure
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg) => msg.eventType === EventType.LOGIN_FAILURE),
        takeUntil(this._destroying$)
      )
      .subscribe((result) => {
        console.error('❌ Platform Admin login failed:', result);
        this.isLoading = false;
        this.errorMessage = 'Authentication failed. Please try again.';
      });
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }

  async loginWithAzureAD() {
    try {
      this.errorMessage = '';
      
      // Check if there's already an interaction in progress
      if (this.isLoading) {
        console.log('⚠️ Login already in progress, please wait...');
        return;
      }

      this.isLoading = true;
      console.log('🚀 Starting Platform Admin Azure AD login...');
      
      const loginRequest: RedirectRequest = {
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        prompt: 'select_account',
        // Platform Admin specific configuration
        authority: 'https://login.microsoftonline.com/a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e'
      };

      console.log('🔐 Using Platform Admin tenant: a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e');
      console.log('👤 Expected user: khan.aakib@outlook.com');
      
      await this.msalService.loginRedirect(loginRequest);
    } catch (error: any) {
      console.error('❌ Azure AD login failed:', error);
      this.isLoading = false;
      this.errorMessage = error.message || 'Authentication failed. Please try again.';
    }
  }

  private checkAndSetActiveAccount(): void {
    const activeAccount = this.msalService.instance.getActiveAccount();
    
    if (!activeAccount && this.msalService.instance.getAllAccounts().length > 0) {
      const accounts = this.msalService.instance.getAllAccounts();
      this.msalService.instance.setActiveAccount(accounts[0]);
    }
  }
}
