import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EnhancedAuthService } from '../../../core/services/enhanced-auth.service';

@Component({
  selector: 'app-login',
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
          <h2>Welcome Back</h2>
          
          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-section">
            <div class="loading-spinner"></div>
            <p>{{loadingMessage}}</p>
          </div>

          <!-- Success State -->
          <div *ngIf="isAuthenticated && !isLoading" class="success-section">
            <div class="success-icon">✅</div>
            <h3>Welcome, {{userName}}!</h3>
            <p>Redirecting to dashboard...</p>
          </div>

          <!-- Login Section -->
          <div *ngIf="!isLoading && !isAuthenticated && !showRoleSelection" class="login-section">
            <p class="login-description">
              Sign in with your corporate account to access the SaaS Factory platform
            </p>

            <!-- Single Azure AD Login Button -->
            <button 
              class="btn-login" 
              (click)="loginWithAzureAD()"
              [disabled]="isLoading">
              <span class="login-icon">
                <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
                  <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
                  <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
                  <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
                </svg>
              </span>
              Login with Azure AD
            </button>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="error-message">
              <span class="error-icon">⚠️</span>
              <div class="error-content">
                <p>{{errorMessage}}</p>
                <p class="error-help">
                  Having trouble? Try refreshing the page or contact your administrator.
                </p>
              </div>
            </div>
          </div>

          <!-- Role Selection Section -->
          <div *ngIf="showRoleSelection && availableRoles.length > 1" class="role-selection-section">
            <h3>Select Your Role</h3>
            <p class="role-description">
              You have access to multiple roles. Please select how you'd like to sign in:
            </p>
            
            <div class="role-options">
              <button 
                *ngFor="let roleOption of availableRoles"
                class="role-option-btn"
                (click)="selectRole(roleOption)"
                [disabled]="isLoading">
                <div class="role-info">
                  <div class="role-title">
                    <span class="role-icon">{{getRoleIcon(roleOption.role)}}</span>
                    {{getRoleDisplayName(roleOption.role)}}
                  </div>
                  <div class="role-context" *ngIf="roleOption.tenantName">
                    {{roleOption.tenantName}}
                  </div>
                  <div class="role-context" *ngIf="roleOption.role === 'Platform_Admin'">
                    Platform Administration
                  </div>
                </div>
                <span class="role-arrow">→</span>
              </button>
            </div>
            
            <button class="btn-back" (click)="goBackToLogin()" [disabled]="isLoading">
              ← Back to Login
            </button>
          </div>

          <!-- Features -->
          <div *ngIf="!isLoading && !isAuthenticated && !errorMessage" class="features">
            <div class="feature">
              <span class="feature-icon">🛡️</span>
              <span>Enterprise Security</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🏢</span>
              <span>Multi-Tenant Platform</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📊</span>
              <span>Advanced Analytics</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p>© 2024 SaaS Factory. Built for Enterprise Excellence.</p>
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
      max-width: 500px;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
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
      font-size: 3rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .logo h1 {
      color: #2c3e50;
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .tagline {
      color: #7f8c8d;
      margin: 0;
      font-size: 0.95rem;
    }

    .login-content h2 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.8rem;
      text-align: center;
    }

    .login-description {
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .btn-login {
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
      margin-bottom: 2rem;
    }

    .btn-login:hover:not(:disabled) {
      background: #106ebe;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 120, 212, 0.3);
    }

    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .login-icon {
      display: flex;
      align-items: center;
    }

    .loading-section, .success-section {
      text-align: center;
      padding: 2rem 0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .success-icon {
      font-size: 3rem;
      color: #4caf50;
      margin-bottom: 1rem;
    }

    .success-section h3 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .success-section p {
      color: #7f8c8d;
      margin: 0;
    }

    .error-message {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: #ffebee;
      border: 1px solid #ffcdd2;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .error-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .error-content p {
      margin: 0 0 0.5rem 0;
      color: #c62828;
      font-weight: 500;
    }

    .error-help {
      font-size: 0.95rem;
      color: #7f8c8d;
    }

    .features {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      margin: 2rem 0;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(102, 126, 234, 0.05);
      border-radius: 8px;
      color: #7f8c8d;
    }

    .feature-icon {
      font-size: 1.2rem;
    }

    .login-footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid #ecf0f1;
    }

    .login-footer p {
      color: #95a5a6;
      margin: 0;
      font-size: 0.85rem;
    }

    .role-selection-section {
      text-align: center;
      padding: 2rem 0;
    }

    .role-selection-section h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }

    .role-description {
      color: #7f8c8d;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .role-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .role-option-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      background: white;
      border: 2px solid #ecf0f1;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
    }

    .role-option-btn:hover:not(:disabled) {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
    }

    .role-option-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .role-info {
      flex: 1;
    }

    .role-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .role-icon {
      font-size: 1.5rem;
    }

    .role-context {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .role-arrow {
      color: #667eea;
      font-size: 1.2rem;
      font-weight: bold;
    }

    .btn-back {
      background: transparent;
      color: #7f8c8d;
      border: 1px solid #ecf0f1;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.95rem;
    }

    .btn-back:hover:not(:disabled) {
      color: #667eea;
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .btn-back:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .login-container { padding: 1rem; }
      .login-card { padding: 2rem; }
      .logo h1 { font-size: 1.5rem; }
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  isAuthenticated = false;
  errorMessage = '';
  loadingMessage = '';
  userName = '';
  showRoleSelection = false;
  availableRoles: any[] = [];
  userEmail = '';
  private returnUrl = '/dashboard';

  constructor(
    private authService: EnhancedAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🔄 [Login Component] Initializing...');
    
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    this.setupAuthSubscriptions();
    this.setupRoleSelectionListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Set up authentication state subscriptions
   */
  private setupAuthSubscriptions(): void {
    // Subscribe to authentication state
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        console.log('🔄 [Login Component] Auth state changed:', isAuthenticated);
        this.isAuthenticated = isAuthenticated;
        
        // Clear user name when not authenticated
        if (!isAuthenticated) {
          this.userName = '';
          this.errorMessage = '';
          this.isLoading = false;
        } else {
          // User is now authenticated - check if we should redirect
          // This will be triggered after manual login completion
          console.log('✅ [Login Component] User authenticated, checking for redirect');
          this.checkForRedirect();
        }
      });

    // Subscribe to loading state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoading = isLoading;
        if (isLoading) {
          this.loadingMessage = 'Authenticating...';
        }
      });

    // Subscribe to user profile
    this.authService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && this.isAuthenticated) {
          this.userName = user.name || user.email;
        } else {
          this.userName = '';
        }
      });

    // Subscribe to redirect path for role-based navigation
    this.authService.getRedirectPath()
      .pipe(takeUntil(this.destroy$))
      .subscribe(redirectPath => {
        console.log('🎯 [Login Component] Redirect path received:', redirectPath);
        this.returnUrl = redirectPath;
        
        // Check if we should redirect now that we have a path
        this.checkForRedirect();
      });

    // Subscribe to errors
    this.authService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          this.errorMessage = error;
          this.isLoading = false;
        }
      });
  }

  /**
   * Handle Azure AD login
   */
  async loginWithAzureAD(): Promise<void> {
    try {
      console.log('🔐 [Login Component] Initiating Azure AD login...');
      this.isLoading = true;
      this.loadingMessage = 'Redirecting to Azure AD...';
      this.errorMessage = '';
      
      // Store the return URL in session storage for after redirect
      sessionStorage.setItem('authReturnUrl', this.returnUrl);

      // Use loginRedirect instead of loginPopup for better reliability
      await this.authService.loginWithAzureAD();
      
      // The redirect will happen, and authentication will be handled
      // by the app.component.ts handleMsalRedirect method
      
    } catch (error) {
      console.error('❌ [Login Component] Azure AD login failed:', error);
      this.errorMessage = 'Login failed. Please try again.';
      this.isLoading = false;
    }
  }

  /**
   * Check if we should redirect after authentication
   */
  private checkForRedirect(): void {
    // If we have a redirect path and we're authenticated, navigate
    if (this.returnUrl && this.isAuthenticated && !this.isLoading) {
      console.log('🎯 [Login Component] Checking redirect - URL:', this.returnUrl, 'Auth:', this.isAuthenticated);
      this.handleSuccessfulLogin();
    } else {
      console.log('⏳ [Login Component] Waiting for redirect conditions - URL:', this.returnUrl, 'Auth:', this.isAuthenticated, 'Loading:', this.isLoading);
    }
  }

  /**
   * Handle successful login
   */
  private handleSuccessfulLogin(): void {
    console.log('✅ [Login Component] Login successful, redirecting to:', this.returnUrl);
    
    // Navigate to return URL or dashboard
    this.router.navigate([this.returnUrl]).then(() => {
      console.log('✅ [Login Component] Navigation completed');
    }).catch(error => {
      console.error('❌ [Login Component] Navigation failed:', error);
      // Fallback to dashboard
      this.router.navigate(['/dashboard']);
    });
  }

  /**
   * Select a role from available options
   */
  async selectRole(roleOption: any): Promise<void> {
    try {
      console.log('🎯 [Login Component] Role selected:', roleOption);
      this.isLoading = true;
      this.loadingMessage = 'Setting up your session...';
      this.errorMessage = '';

      // Ensure we have the user email for role selection
      const roleSelectionData = {
        ...roleOption,
        userEmail: this.userEmail || roleOption.userEmail,
        email: this.userEmail || roleOption.email
      };

      // Call auth service to set the selected role
      await this.authService.selectRole(roleSelectionData);
      
      // If we get here, role was selected successfully
      // Navigate to dashboard
      this.router.navigate(['/dashboard']);
      
    } catch (error: any) {
      console.error('❌ [Login Component] Role selection failed:', error);
      
      // If API fails due to quota, still proceed with mock data
      if (error.status === 404 || error.status === 403 || error.status === 0) {
        console.log('⚠️ [Login Component] API unavailable, using fallback navigation');
        // Store role selection locally
        sessionStorage.setItem('selectedRole', JSON.stringify(roleOption));
        sessionStorage.setItem('userEmail', this.userEmail);
        // Navigate anyway
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Failed to set up your session. Please try again.';
        this.isLoading = false;
      }
    }
  }

  /**
   * Go back to login from role selection
   */
  goBackToLogin(): void {
    this.showRoleSelection = false;
    this.availableRoles = [];
    this.errorMessage = '';
    this.isAuthenticated = false;
    this.userName = '';
    this.isLoading = false;
    this.loadingMessage = '';
  }

  /**
   * Get icon for role type
   */
  getRoleIcon(role: string): string {
    switch (role) {
      case 'Platform_Admin':
        return '👑';
      case 'Tenant_Admin':
        return '🏢';
      case 'Tenant_User':
        return '👤';
      default:
        return '👤';
    }
  }

  /**
   * Get display name for role
   */
  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'Platform_Admin':
        return 'Platform Administrator';
      case 'Tenant_Admin':
        return 'Tenant Administrator';
      case 'Tenant_User':
        return 'Tenant User';
      default:
        return role;
    }
  }

  /**
   * Set up role selection event listener
   */
  private setupRoleSelectionListener(): void {
    window.addEventListener('roleSelectionRequired', (event: any) => {
      console.log('🎭 [Login Component] Role selection required:', event.detail);
      this.showRoleSelection = true;
      this.availableRoles = event.detail.availableRoles;
      this.userEmail = event.detail.userEmail;
      this.isLoading = false;
    });
  }
} 