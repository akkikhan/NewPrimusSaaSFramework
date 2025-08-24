import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tenant-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="tenant-header">
          <h1>{{ tenantName || 'Tenant' }} Portal</h1>
          <p class="subtitle">Administration Dashboard</p>
        </div>
        
        <div class="login-content">
          <h2>Administrator Login</h2>
          <p class="description">
            Enter your credentials to access the tenant administration dashboard.
          </p>
          
          <form (ngSubmit)="login()" #loginForm="ngForm">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email"
                [(ngModel)]="credentials.email" 
                required
                placeholder="admin@yourdomain.com"
                autocomplete="username"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password"
                [(ngModel)]="credentials.password" 
                required
                placeholder="Enter your password"
                autocomplete="current-password"
              />
            </div>
            
            <div class="form-options">
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe">
                <span class="checkmark"></span>
                Remember me
              </label>
              <a href="#" class="forgot-password" (click)="forgotPassword($event)">Forgot password?</a>
            </div>
            
            <button type="submit" class="login-btn" [disabled]="!loginForm.form.valid || loading">
              <span *ngIf="!loading">Sign In</span>
              <span *ngIf="loading" class="loading">
                <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            </button>
          </form>
          
          <div class="first-time-notice" *ngIf="isFirstTimeUser">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>First time user? Check your welcome email for temporary credentials.</span>
          </div>
        </div>

        <div class="error-message" *ngIf="errorMessage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {{ errorMessage }}
        </div>
        
        <div class="success-message" *ngIf="successMessage">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {{ successMessage }}
        </div>
      </div>
      
      <div class="footer">
        <p>Tenant ID: {{ tenantId }}</p>
        <p>© 2025 {{ tenantName || 'Your Company' }}. Powered by SaaS Factory.</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 48px;
      width: 100%;
      max-width: 420px;
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .tenant-header {
      text-align: center;
      margin-bottom: 40px;
    }

    h1 {
      color: #1a202c;
      font-size: 28px;
      font-weight: 700;
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
      margin-bottom: 24px;
    }

    h2 {
      color: #2d3748;
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 12px;
      text-align: center;
    }

    .description {
      color: #4a5568;
      font-size: 15px;
      line-height: 1.5;
      margin-bottom: 32px;
      text-align: center;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #2d3748;
      font-weight: 500;
      font-size: 14px;
    }

    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s ease;
      background: #f7fafc;
    }

    input:focus {
      outline: none;
      border-color: #4299e1;
      background: white;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #4a5568;
    }

    .checkbox-container input {
      margin-right: 8px;
    }

    .forgot-password {
      color: #4299e1;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s ease;
    }

    .forgot-password:hover {
      color: #2b6cb0;
    }

    .login-btn {
      width: 100%;
      padding: 14px 24px;
      background: #4299e1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .login-btn:hover:not(:disabled) {
      background: #3182ce;
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    .login-btn:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
      transform: none;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .first-time-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      padding: 12px;
      background: #e6f7ff;
      border-radius: 8px;
      color: #1890ff;
      font-size: 13px;
    }

    .error-message {
      background: #fed7d7;
      color: #c53030;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 16px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: shake 0.5s ease-in-out;
    }

    .success-message {
      background: #c6f6d5;
      color: #22543d;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 16px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .footer {
      margin-top: 32px;
      text-align: center;
      color: white;
      font-size: 13px;
      opacity: 0.8;
    }

    .footer p {
      margin: 4px 0;
    }
  `]
})
export class TenantAdminLoginComponent implements OnInit {
  tenantId: string = '';
  tenantName: string = '';
  credentials = {
    email: '',
    password: ''
  };
  rememberMe = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  isFirstTimeUser = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get tenant ID from route
    this.tenantId = this.route.snapshot.paramMap.get('tenantId') || '';
    
    // TODO: Fetch tenant details for branding
    this.fetchTenantDetails();
    
    // Check if user has logged in before
    const hasLoggedIn = localStorage.getItem(`tenant_${this.tenantId}_logged_in`);
    this.isFirstTimeUser = !hasLoggedIn;
  }

  async fetchTenantDetails() {
    // TODO: Replace with actual API call
    // For now, use mock data based on tenant ID
    if (this.tenantId === 'primussoft-20250801') {
      this.tenantName = 'PrimusSoft';
    } else {
      this.tenantName = this.tenantId.split('-')[0];
    }
  }

  async login() {
    try {
      this.loading = true;
      this.errorMessage = '';
      console.log(`🚀 Starting Tenant Admin login for tenant: ${this.tenantId}`);
      
      // TODO: Replace with actual API call
      // Temporary validation for demo
      if (this.tenantId === 'primussoft-20250801' && 
          this.credentials.email === 'admin@primussoft.com' && 
          this.credentials.password === 'TempPass123!') {
        
        // Store user data
        const userData = {
          id: '1',
          email: this.credentials.email,
          name: 'Tenant Admin',
          role: 'TenantAdmin',
          tenantId: this.tenantId,
          tenantName: this.tenantName,
          isPlatformAdmin: false
        };

        sessionStorage.setItem('userData', JSON.stringify(userData));
        sessionStorage.setItem('userRole', 'TenantAdmin');
        sessionStorage.setItem('authToken', 'mock-tenant-token');
        sessionStorage.setItem('tenantId', this.tenantId);
        
        // Mark as not first time user
        localStorage.setItem(`tenant_${this.tenantId}_logged_in`, 'true');
        
        console.log('✅ Tenant Admin login successful');
        this.successMessage = 'Login successful! Redirecting...';
        
        // Redirect to tenant admin dashboard
        setTimeout(() => {
          this.router.navigate(['/tenant', this.tenantId, 'admin', 'dashboard']);
        }, 1500);
      } else {
        this.errorMessage = 'Invalid email or password. Please try again.';
      }
    } catch (error: any) {
      console.error('❌ Tenant login failed:', error);
      this.errorMessage = error.message || 'Login failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  forgotPassword(event: Event) {
    event.preventDefault();
    // TODO: Implement forgot password flow
    this.successMessage = 'Password reset instructions have been sent to your email.';
  }
}
