import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TenantAdminService } from '../../core/services/tenant-admin.service';

interface TenantLoginRequest {
  email: string;
  password: string;
  tenantId: string;
}

interface TenantLoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    tenantName: string;
    mustChangePassword: boolean;
  };
  message?: string;
}

@Component({
  selector: 'app-tenant-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tenant-login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <div class="logo-icon">🏢</div>
            <h1>{{tenantName || 'Tenant'}} Portal</h1>
          </div>
          <p class="tagline">Secure Tenant Access</p>
        </div>

        <div class="login-content">
          <h2>Tenant Admin Login</h2>
          
          <div *ngIf="isLoading" class="loading-section">
            <div class="loading-spinner"></div>
            <p>{{loadingMessage}}</p>
          </div>

          <div *ngIf="!isLoading" class="login-form">
            <form (ngSubmit)="login()" #loginForm="ngForm">
              <div class="form-group">
                <label for="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  [(ngModel)]="email"
                  class="form-control"
                  placeholder="admin@company.com"
                  required
                  email>
              </div>

              <div class="form-group">
                <label for="password">Temporary Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  [(ngModel)]="password"
                  class="form-control"
                  placeholder="Enter your temporary password"
                  required>
                <small class="form-text">
                  Use the temporary password sent to your email during onboarding
                </small>
              </div>

              <button 
                type="submit" 
                class="btn-login"
                [disabled]="isLoading || !loginForm.valid">
                Sign In
              </button>
            </form>

            <div *ngIf="errorMessage" class="error-message">
              <span class="error-icon">⚠️</span>
              <p>{{errorMessage}}</p>
            </div>

            <div class="login-help">
              <p>First time logging in?</p>
              <ul>
                <li>Check your email for temporary credentials</li>
                <li>You'll be asked to change your password after login</li>
                <li>Contact your platform administrator if you need help</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="login-footer">
          <p>© 2024 SaaS Factory. Powered by secure multi-tenant architecture.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
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
      font-size: 3rem;
      background: linear-gradient(135deg, #2c3e50, #3498db);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
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
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
      text-align: center;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #5a6c7d;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .form-text {
      display: block;
      margin-top: 0.25rem;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .btn-login {
      width: 100%;
      padding: 1rem 1.5rem;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-login:hover:not(:disabled) {
      background: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(52, 152, 219, 0.3);
    }

    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .error-message {
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .error-message p {
      margin: 0;
      color: #c0392b;
    }

    .login-help {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e1e8ed;
    }

    .login-help p {
      color: #5a6c7d;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .login-help ul {
      margin: 0;
      padding-left: 1.5rem;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .loading-section {
      text-align: center;
      padding: 2rem 0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(52, 152, 219, 0.2);
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .login-footer {
      text-align: center;
      margin-top: 2rem;
      color: #95a5a6;
      font-size: 0.85rem;
    }
  `]
})
export class TenantLoginComponent implements OnInit {
  tenantId: string = '';
  tenantName: string = '';
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  loadingMessage: string = 'Authenticating...';
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private tenantAdminService: TenantAdminService
  ) {}

  ngOnInit(): void {
    // Get tenant ID from route
    this.tenantId = this.route.snapshot.paramMap.get('tenantId') || '';
    console.log('🏢 [Tenant Login] Initializing for tenant:', this.tenantId);
    
    // Optionally fetch tenant name
    this.fetchTenantInfo();
  }

  async fetchTenantInfo(): Promise<void> {
    try {
      // In a real app, fetch tenant info from API
      // For now, use tenant ID as name
      this.tenantName = this.tenantId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    }
  }

  async login(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.loadingMessage = 'Authenticating...';

    try {
      const loginRequest: TenantLoginRequest = {
        email: this.email,
        password: this.password,
        tenantId: this.tenantId
      };

      // Try real API first
  const apiUrl = environment.apiUrl;
      
      try {
        const response = await this.http.post<TenantLoginResponse>(
          `${apiUrl}/auth/tenant-login`,
          loginRequest
        ).toPromise();

        if (response?.success && response.user) {
          await this.handleSuccessfulLogin(response);
        } else {
          throw new Error(response?.message || 'Login failed');
        }
      } catch (apiError) {
        console.log('⚠️ [Tenant Login] API failed, trying mock authentication');
        
        // Fallback to mock authentication for testing
        const mockResponse = this.mockTenantLogin(loginRequest);
        if (mockResponse.success && mockResponse.user) {
          await this.handleSuccessfulLogin(mockResponse);
        } else {
          throw new Error(mockResponse.message || 'Invalid credentials');
        }
      }
    } catch (error: any) {
      console.error('❌ [Tenant Login] Login failed:', error);
      this.errorMessage = error.message || 'Login failed. Please check your credentials and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleSuccessfulLogin(response: TenantLoginResponse): Promise<void> {
    // Store authentication info
    sessionStorage.setItem('authToken', response.token || '');
    sessionStorage.setItem('userData', JSON.stringify(response.user));
    sessionStorage.setItem('currentTenantId', this.tenantId);
    sessionStorage.setItem('userRole', 'TenantAdmin');

    // Check if password change is required
    if (response.user?.mustChangePassword) {
      // In a real app, redirect to password change page
      console.log('🔐 [Tenant Login] Password change required');
      // For now, continue to dashboard
    }

    // Navigate to unified dashboard with tenant context
    this.router.navigate(['/dashboard'], {
      queryParams: { tenantId: this.tenantId }
    });
  }

  private mockTenantLogin(request: TenantLoginRequest): TenantLoginResponse {
    // First check the tenant admin service for stored credentials
    const storedAdmin = this.tenantAdminService.validateCredentials(
      request.email,
      request.password,
      request.tenantId
    );
    
    if (storedAdmin) {
      console.log('✅ [Tenant Login] Found stored tenant admin credentials');
      return {
        success: true,
        token: 'mock-tenant-jwt-token',
        user: {
          id: storedAdmin.id,
          email: storedAdmin.email,
          name: 'Tenant Administrator',
          role: 'TenantAdmin',
          tenantId: storedAdmin.tenantId,
          tenantName: storedAdmin.tenantName,
          mustChangePassword: storedAdmin.mustChangePassword
        }
      };
    }
    
    // Fallback to hardcoded test credentials
    const validCredentials = [
      { email: 'admin@khan-akki-jpr.com', password: 'TempAdmin123!', tenantId: 'khan-akki-jpr-20250805' },
      { email: 'admin@contoso.com', password: 'TempContoso123!', tenantId: 'contoso-enterprises' },
      { email: 'admin@tenant.com', password: 'TempTenant123!', tenantId: 'default-tenant' }
    ];

    const match = validCredentials.find(cred => 
      cred.email === request.email && 
      cred.password === request.password &&
      cred.tenantId === request.tenantId
    );

    if (match) {
      return {
        success: true,
        token: 'mock-tenant-jwt-token',
        user: {
          id: `tenant-admin-${request.tenantId}`,
          email: request.email,
          name: 'Tenant Administrator',
          role: 'TenantAdmin',
          tenantId: request.tenantId,
          tenantName: this.tenantName,
          mustChangePassword: true
        }
      };
    }

    return {
      success: false,
      message: 'Invalid email or password'
    };
  }
}
