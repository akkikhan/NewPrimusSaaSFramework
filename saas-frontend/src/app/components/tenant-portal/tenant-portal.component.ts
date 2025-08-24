import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tenant-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="tenant-portal-container">
      <div class="tenant-portal-card">
        <!-- Header -->
        <div class="portal-header">
          <div class="logo">
            <div class="logo-icon">🏢</div>
            <h1>Tenant Portal Access</h1>
          </div>
          <p class="tagline">Select your organization to continue</p>
        </div>

        <!-- Tenant Selection -->
        <div class="tenant-selection">
          <h2>Available Organizations</h2>
          <p class="description">
            Choose your organization below to access your tenant portal
          </p>

          <!-- Tenant Grid -->
          <div class="tenant-grid">
            <div 
              class="tenant-card" 
              *ngFor="let tenant of availableTenants" 
              (click)="selectTenant(tenant.id)">
              <div class="tenant-logo">{{tenant.icon}}</div>
              <div class="tenant-info">
                <h3>{{tenant.name}}</h3>
                <p>{{tenant.description}}</p>
                <div class="tenant-stats">
                  <span class="stat">{{tenant.userCount}} Users</span>
                  <span class="stat">{{tenant.status}}</span>
                </div>
              </div>
              <div class="tenant-action">
                <span class="action-icon">→</span>
              </div>
            </div>
          </div>

          <!-- Simple Login Option -->
          <div class="simple-login-section">
            <div class="divider">
              <span>Quick Access</span>
            </div>
            <p class="login-description">
              Use one of the test accounts for local development
            </p>
            <div class="login-options">
              <button 
                class="btn-test-login"
                (click)="loginAsUser('tenant-admin')">
                <span class="user-icon">👨‍💼</span>
                                 <div class="user-info">
                   <div class="user-name">Login as Tenant Admin</div>
                   <div class="user-email">admin&#64;company-a.com</div>
                 </div>
              </button>
              <button 
                class="btn-test-login"
                (click)="loginAsUser('tenant-user')">
                <span class="user-icon">👤</span>
                                 <div class="user-info">
                   <div class="user-name">Login as Tenant User</div>
                   <div class="user-email">john.doe&#64;company-a.com</div>
                 </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Platform Admin Link -->
        <div class="admin-access">
          <div class="divider">
            <span>SaaS Factory Team?</span>
          </div>
          <button 
            class="btn-admin-login" 
            (click)="goToPlatformLogin()">
            <span class="admin-icon">🏭</span>
            Platform Admin Login
          </button>
        </div>

        <!-- Footer -->
        <div class="portal-footer">
          <p>© 2024 SaaS Factory Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-portal-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .tenant-portal-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      padding: 3rem;
      width: 100%;
      max-width: 600px;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .portal-header {
      text-align: center;
      margin-bottom: 3rem;
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
      font-size: 1rem;
    }

    .tenant-selection h2 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      text-align: center;
    }

    .description {
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .tenant-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .tenant-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .tenant-card:hover {
      border-color: #667eea;
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
    }

    .tenant-logo {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tenant-info {
      flex: 1;
    }

    .tenant-info h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .tenant-info p {
      margin: 0 0 1rem 0;
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .tenant-stats {
      display: flex;
      gap: 1rem;
    }

    .stat {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .tenant-action {
      color: #667eea;
      font-size: 1.5rem;
      opacity: 0.7;
      transition: all 0.3s ease;
    }

    .tenant-card:hover .tenant-action {
      opacity: 1;
      transform: translateX(4px);
    }

    .simple-login-section {
      margin: 2rem 0;
    }

    .divider {
      text-align: center;
      margin: 2rem 0;
      position: relative;
    }

    .divider:before {
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

    .login-description {
      color: #6c757d;
      text-align: center;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }

    .login-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn-test-login {
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 1rem;
      text-align: left;
    }

    .btn-test-login:hover {
      border-color: #667eea;
      background: #f8f9fa;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
    }

    .user-icon {
      font-size: 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .user-email {
      color: #6c757d;
      font-size: 0.9rem;
      font-family: monospace;
    }

    .admin-access {
      margin: 2rem 0;
    }

    .btn-admin-login {
      width: 100%;
      padding: 1rem 1.5rem;
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .btn-admin-login:hover {
      background: #106ebe;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 120, 212, 0.3);
    }

    .admin-icon {
      font-size: 1.2rem;
    }

    .portal-footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid #ecf0f1;
      margin-top: 2rem;
    }

    .portal-footer p {
      color: #95a5a6;
      margin: 0;
      font-size: 0.85rem;
    }

    @media (max-width: 768px) {
      .tenant-portal-container { padding: 1rem; }
      .tenant-portal-card { padding: 2rem; }
      .tenant-card { flex-direction: column; text-align: center; }
    }
  `]
})
export class TenantPortalComponent implements OnInit, OnDestroy {
  // Static data for local development
  availableTenants = [
    {
      id: 'company-a',
      name: 'Company A Corporation',
      description: 'Enterprise software solutions company',
      icon: '🏢',
      userCount: 25,
      status: 'Active'
    },
    {
      id: 'startup-b',
      name: 'Startup B Inc',
      description: 'Fast-growing technology startup',
      icon: '🚀',
      userCount: 8,
      status: 'Active'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // No need to load from API in local mode
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTenant(tenantId: string): void {
    console.log('🏢 [Tenant Portal] Selected tenant:', tenantId);
    
    // For local development, go to tenant login with pre-filled tenant ID
    this.router.navigate(['/tenant', tenantId, 'login']);
  }

  loginAsUser(userType: 'tenant-admin' | 'tenant-user'): void {
    console.log('🔑 [Tenant Portal] Quick login as:', userType);
    
    // Use the auth service to login as the selected user type
    this.authService.loginAsUser(userType).subscribe({
      next: (user) => {
        console.log('✅ [Tenant Portal] Login successful:', user);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('❌ [Tenant Portal] Login failed:', error);
      }
    });
  }

  goToPlatformLogin(): void {
    console.log('🏭 [Tenant Portal] Navigating to platform admin login');
    this.router.navigate(['/login']);
  }
} 