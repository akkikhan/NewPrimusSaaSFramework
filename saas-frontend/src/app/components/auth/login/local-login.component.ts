import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalAuthService } from '../../../core/services/local-auth.service';

@Component({
  selector: 'app-local-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>🏭 SaaS Factory</h1>
          <p>Enterprise Platform Management</p>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email"
              name="email"
              [(ngModel)]="credentials.email"
              required
              email
              class="form-control"
              placeholder="Enter your email"
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
              class="form-control"
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            class="btn-login"
            [disabled]="!loginForm.form.valid || isLoading">
            {{ isLoading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div *ngIf="error" class="error-message">
          {{ error }}
        </div>

        <div class="credentials-info">
          <h3>Test Credentials:</h3>
          <div class="cred-item">
            <strong>Platform Admin:</strong><br>
            Email: admin&#64;saasfactory.com<br>
            Password: Admin123!
          </div>
          <div class="cred-item">
            <strong>Tenant Admin:</strong><br>
            Email: admin&#64;primussoft.com<br>
            Password: Tenant123!
          </div>
          <div class="cred-item">
            <strong>Tenant User:</strong><br>
            Email: user&#64;primussoft.com<br>
            Password: User123!
          </div>
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
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-header h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .login-header p {
      color: #7f8c8d;
      margin: 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #2c3e50;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .btn-login {
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

    .btn-login:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 6px;
      color: #c00;
      text-align: center;
    }

    .credentials-info {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .credentials-info h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1rem;
    }

    .cred-item {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: white;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #555;
    }

    .cred-item:last-child {
      margin-bottom: 0;
    }

    .cred-item strong {
      color: #2c3e50;
    }
  `]
})
export class LocalLoginComponent implements OnInit {
  credentials = {
    email: '',
    password: ''
  };
  
  isLoading = false;
  error = '';
  returnUrl = '/dashboard';

  constructor(
    private authService: LocalAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get return URL
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Check if already authenticated
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.navigateBasedOnRole();
      }
    });
  }

  onSubmit() {
    if (!this.credentials.email || !this.credentials.password) {
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.authService.login(this.credentials).subscribe({
      next: (result) => {
        if (result.success) {
          this.navigateBasedOnRole();
        } else {
          this.error = result.message || 'Login failed';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.error = 'An error occurred during login';
        this.isLoading = false;
      }
    });
  }

  private navigateBasedOnRole() {
    const user = this.authService.getCurrentUser();
    
    if (user?.isPlatformAdmin) {
      this.router.navigate(['/dashboard']);
    } else if (user?.role === 'TenantAdmin' || user?.role === 'TenantUser') {
      this.router.navigate(['/tenant-portal']);
    } else {
      this.router.navigate([this.returnUrl]);
    }
  }
}
