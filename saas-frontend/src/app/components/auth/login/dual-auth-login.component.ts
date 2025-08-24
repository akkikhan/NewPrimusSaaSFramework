import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { RedirectRequest } from '@azure/msal-browser';

@Component({
  selector: 'app-dual-auth-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>SaaS Factory Login</h1>
        
        <!-- Azure AD Login -->
        <div class="auth-section">
          <h2>Platform Administrator</h2>
          <button class="azure-login-btn" (click)="loginWithAzureAD()">
            <svg width="20" height="20" viewBox="0 0 23 23" style="margin-right: 8px;">
              <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Sign in with Microsoft
          </button>
          <p class="hint">Use your Microsoft account (khan.aakib&#64;outlook.com)</p>
        </div>

        <div class="divider">
          <span>OR</span>
        </div>

        <!-- Tenant Login -->
        <div class="auth-section">
          <h2>Tenant Login</h2>
          <form (ngSubmit)="loginWithTenantCredentials()" #loginForm="ngForm">
            <div class="form-group">
              <label for="tenantId">Tenant ID</label>
              <input 
                type="text" 
                id="tenantId" 
                name="tenantId"
                [(ngModel)]="credentials.tenantId" 
                required
                placeholder="e.g., primussoft-20250801"
              />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email"
                [(ngModel)]="credentials.email" 
                required
                placeholder="admin&#64;primussoft.com"
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
              />
            </div>
            <button type="submit" class="tenant-login-btn" [disabled]="!loginForm.form.valid">
              Sign in as Tenant
            </button>
          </form>
          
          <div class="temp-creds">
            <p><strong>Temporary Credentials:</strong></p>
            <p>Tenant ID: primussoft-20250801</p>
            <p>Email: admin&#64;primussoft.com</p>
            <p>Password: TempPass123!</p>
          </div>
        </div>

        <div class="error-message" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 450px;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
      font-size: 28px;
    }

    h2 {
      color: #555;
      font-size: 18px;
      margin-bottom: 15px;
    }

    .auth-section {
      margin-bottom: 25px;
    }

    .azure-login-btn {
      width: 100%;
      padding: 12px 20px;
      background: #2b2b2b;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s;
    }

    .azure-login-btn:hover {
      background: #404040;
    }

    .tenant-login-btn {
      width: 100%;
      padding: 12px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.3s;
      margin-top: 10px;
    }

    .tenant-login-btn:hover:not(:disabled) {
      background: #0056b3;
    }

    .tenant-login-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    input:focus {
      outline: none;
      border-color: #007bff;
    }

    .divider {
      text-align: center;
      margin: 30px 0;
      position: relative;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e0e0e0;
    }

    .divider span {
      background: white;
      padding: 0 15px;
      position: relative;
      color: #888;
      font-size: 14px;
    }

    .hint {
      font-size: 13px;
      color: #666;
      margin-top: 8px;
      text-align: center;
    }

    .temp-creds {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 12px;
      margin-top: 15px;
      font-size: 13px;
    }

    .temp-creds p {
      margin: 4px 0;
      color: #666;
    }

    .error-message {
      background: #fee;
      color: #c00;
      padding: 12px;
      border-radius: 4px;
      margin-top: 20px;
      text-align: center;
      font-size: 14px;
    }
  `]
})
export class DualAuthLoginComponent {
  credentials = {
    tenantId: 'primussoft-20250801',
    email: 'admin@primussoft.com',
    password: ''
  };
  
  errorMessage = '';

  constructor(
    private router: Router,
    private msalService: MsalService
  ) {}

  async loginWithAzureAD() {
    try {
      this.errorMessage = '';
      console.log('🚀 Starting Azure AD login...');
      
      const loginRequest: RedirectRequest = {
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        prompt: 'select_account'
      };

      await this.msalService.loginRedirect(loginRequest);
    } catch (error: any) {
      console.error('❌ Azure AD login failed:', error);
      this.errorMessage = error.message || 'Azure AD login failed';
    }
  }

  async loginWithTenantCredentials() {
    try {
      this.errorMessage = '';
      console.log('🚀 Starting tenant login...');
      
      // Simulate tenant login (replace with actual API call)
      if (this.credentials.tenantId === 'primussoft-20250801' && 
          this.credentials.email === 'admin@primussoft.com' && 
          this.credentials.password === 'TempPass123!') {
        
        // Store user data
        const userData = {
          id: '1',
          email: this.credentials.email,
          name: 'Tenant Admin',
          role: 'TenantAdmin',
          tenantId: this.credentials.tenantId,
          isPlatformAdmin: false
        };

        sessionStorage.setItem('userData', JSON.stringify(userData));
        sessionStorage.setItem('userRole', 'TenantAdmin');
        sessionStorage.setItem('authToken', 'mock-tenant-token');
        
        console.log('✅ Tenant login successful');
        this.router.navigate(['/tenant-portal']);
      } else {
        this.errorMessage = 'Invalid credentials';
      }
    } catch (error: any) {
      console.error('❌ Tenant login failed:', error);
      this.errorMessage = error.message || 'Tenant login failed';
    }
  }
}