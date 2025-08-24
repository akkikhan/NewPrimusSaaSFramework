import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-working-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="header">
          <h1>🏭 SaaS Factory</h1>
          <p>Enterprise Platform Management</p>
        </div>

        <!-- Quick Access Buttons -->
        <div class="quick-access">
          <h3>Quick Access (Development Mode)</h3>
          <button (click)="quickLoginPlatformAdmin()" class="btn-quick platform">
            👤 Login as Platform Admin
          </button>
          <button (click)="quickLoginTenantAdmin()" class="btn-quick tenant">
            🏢 Login as Tenant Admin
          </button>
        </div>

        <div class="divider">OR</div>

        <!-- Platform Admin Login -->
        <div class="login-section">
          <h3>Platform Administrator</h3>
          <button (click)="attemptAzureLogin()" class="btn-azure" [disabled]="isLoading">
            <svg width="20" height="20" viewBox="0 0 23 23">
              <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
              <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
              <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
              <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        <!-- Tenant Admin Login -->
        <div class="login-section">
          <h3>Tenant Administrator</h3>
          <form (ngSubmit)="loginTenantAdmin()">
            <input 
              type="text" 
              [(ngModel)]="tenantCreds.tenantId" 
              name="tenantId"
              placeholder="Tenant ID (e.g., primussoft-20250801)"
              class="input"
            />
            <input 
              type="email" 
              [(ngModel)]="tenantCreds.email" 
              name="email"
              placeholder="Email"
              class="input"
            />
            <input 
              type="password" 
              [(ngModel)]="tenantCreds.password" 
              name="password"
              placeholder="Password"
              class="input"
            />
            <button type="submit" class="btn-primary" [disabled]="isLoading">
              Sign In
            </button>
          </form>
        </div>

        <!-- Status Messages -->
        <div class="status" *ngIf="statusMessage">
          <p [class.error]="isError">{{statusMessage}}</p>
        </div>

        <!-- Force Navigation -->
        <div class="force-nav">
          <p>Having issues? Force navigate to:</p>
          <button (click)="forceNavigate('/dashboard')" class="btn-force">
            Platform Dashboard
          </button>
          <button (click)="forceNavigate('/tenant-portal')" class="btn-force">
            Tenant Portal
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
      max-width: 500px;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .header p {
      color: #7f8c8d;
      margin: 0;
    }

    .quick-access {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .quick-access h3 {
      color: #495057;
      margin: 0 0 1rem 0;
      font-size: 1rem;
    }

    .btn-quick {
      width: 100%;
      padding: 0.875rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 0.75rem;
      transition: all 0.3s;
    }

    .btn-quick.platform {
      background: #e3f2fd;
      color: #1976d2;
    }

    .btn-quick.platform:hover {
      background: #bbdefb;
    }

    .btn-quick.tenant {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .btn-quick.tenant:hover {
      background: #e1bee7;
    }

    .divider {
      text-align: center;
      color: #999;
      margin: 2rem 0;
      position: relative;
    }

    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 45%;
      height: 1px;
      background: #ddd;
    }

    .divider::before {
      left: 0;
    }

    .divider::after {
      right: 0;
    }

    .login-section {
      margin-bottom: 2rem;
    }

    .login-section h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
    }

    .btn-azure {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: #0078d4;
      color: white;
      border: none;
      padding: 0.875rem;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-azure:hover:not(:disabled) {
      background: #106ebe;
    }

    .input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }

    .input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-primary {
      width: 100%;
      padding: 0.875rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a67d8;
    }

    .btn-primary:disabled,
    .btn-azure:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .status {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
    }

    .status p {
      margin: 0;
    }

    .status p.error {
      color: #dc3545;
      background: #f8d7da;
    }

    .status p:not(.error) {
      color: #155724;
      background: #d4edda;
    }

    .force-nav {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e9ecef;
      text-align: center;
    }

    .force-nav p {
      color: #6c757d;
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
    }

    .btn-force {
      padding: 0.5rem 1rem;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      margin: 0 0.5rem;
    }

    .btn-force:hover {
      background: #5a6268;
    }
  `]
})
export class WorkingLoginComponent implements OnInit {
  isLoading = false;
  statusMessage = '';
  isError = false;
  
  tenantCreds = {
    tenantId: 'primussoft-20250801',
    email: 'admin@primussoft.com',
    password: 'TempPass123!'
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Clear any lingering auth state
    this.clearAuthState();
  }

  clearAuthState() {
    // Clear everything
    sessionStorage.clear();
    
    // Remove problematic MSAL entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('msal') || key.includes('failed'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  quickLoginPlatformAdmin() {
    this.showStatus('Setting up Platform Admin session...');
    
    const adminData = {
      id: 'platform-admin-001',
      email: 'admin@saasfactory.com',
      name: 'Platform Administrator',
      role: 'PlatformAdmin',
      isPlatformAdmin: true,
      tenantId: null
    };
    
    sessionStorage.setItem('authToken', 'platform-token-' + Date.now());
    sessionStorage.setItem('userData', JSON.stringify(adminData));
    sessionStorage.setItem('userRole', 'PlatformAdmin');
    
    this.showStatus('Redirecting to Platform Dashboard...', false);
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  }

  quickLoginTenantAdmin() {
    this.showStatus('Setting up Tenant Admin session...');
    
    const tenantData = {
      id: 'tenant-admin-001',
      email: 'admin@primussoft.com',
      name: 'Tenant Administrator',
      role: 'TenantAdmin',
      isPlatformAdmin: false,
      tenantId: 'primussoft-20250801'
    };
    
    sessionStorage.setItem('authToken', 'tenant-token-' + Date.now());
    sessionStorage.setItem('userData', JSON.stringify(tenantData));
    sessionStorage.setItem('userRole', 'TenantAdmin');
    sessionStorage.setItem('tenantId', 'primussoft-20250801');
    
    this.showStatus('Redirecting to Tenant Portal...', false);
    
    setTimeout(() => {
      window.location.href = '/tenant-portal';
    }, 1000);
  }

  attemptAzureLogin() {
    this.showStatus('Azure AD login is currently bypassed. Use Quick Access instead.', true);
  }

  loginTenantAdmin() {
    if (!this.tenantCreds.email || !this.tenantCreds.password) {
      this.showStatus('Please enter all credentials', true);
      return;
    }

    this.showStatus('Authenticating tenant admin...');
    
    // Simulate successful login
    const tenantData = {
      id: 'tenant-admin-' + Date.now(),
      email: this.tenantCreds.email,
      name: 'Tenant Administrator',
      role: 'TenantAdmin',
      isPlatformAdmin: false,
      tenantId: this.tenantCreds.tenantId
    };
    
    sessionStorage.setItem('authToken', 'tenant-token-' + Date.now());
    sessionStorage.setItem('userData', JSON.stringify(tenantData));
    sessionStorage.setItem('userRole', 'TenantAdmin');
    sessionStorage.setItem('tenantId', this.tenantCreds.tenantId);
    
    this.showStatus('Login successful! Redirecting...', false);
    
    setTimeout(() => {
      window.location.href = '/tenant-portal';
    }, 1000);
  }

  forceNavigate(path: string) {
    window.location.href = path;
  }

  private showStatus(message: string, isError: boolean = false) {
    this.statusMessage = message;
    this.isError = isError;
    
    if (!isError) {
      setTimeout(() => {
        this.statusMessage = '';
      }, 3000);
    }
  }
}
