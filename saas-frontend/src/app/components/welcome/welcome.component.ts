import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="welcome-container">
      <div class="header">
        <h1>SaaS Factory Framework</h1>
        <p class="subtitle">Multi-Tenant SaaS Platform with Comprehensive Authentication</p>
      </div>

      <div class="login-options">
        <div class="option-card platform-admin">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <h2>Platform Administrator</h2>
          <p>Access the main platform administration dashboard to manage tenants, authentication, and system-wide settings.</p>
          <button (click)="navigateTo('/login')" class="primary-btn">
            Platform Admin Login
          </button>
          <div class="login-info">
            <small>Login with: khan.aakib&#64;outlook.com</small>
          </div>
        </div>

        <div class="option-card tenant-admin">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2>Tenant Administrator</h2>
          <p>Manage your organization's users, roles, and settings. Access your tenant-specific administration portal.</p>
          <button (click)="showTenantOptions = !showTenantOptions" class="secondary-btn">
            Tenant Admin Login
          </button>
          <div class="tenant-options" *ngIf="showTenantOptions">
            <p>Select a tenant or enter tenant ID:</p>
            <button (click)="navigateTo('/login/tenant/primussoft-20250801')" class="tenant-link">
              PrimusSoft Demo Tenant →
            </button>
            <div class="custom-tenant">
              <input 
                type="text" 
                [(ngModel)]="customTenantId" 
                placeholder="Enter tenant ID"
                (keyup.enter)="navigateToCustomTenant()"
              >
              <button (click)="navigateToCustomTenant()">Go</button>
            </div>
          </div>
          <div class="login-info">
            <small>Demo: admin&#64;primussoft.com / TempPass123!</small>
          </div>
        </div>

        <div class="option-card demo-app">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="9"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
              <line x1="12" y1="9" x2="12" y2="15"/>
            </svg>
          </div>
          <h2>Demo Application</h2>
          <p>Experience multi-tenant authentication integration with our Inventory Management demo application.</p>
          <button (click)="navigateTo('/demo-app')" class="tertiary-btn" [disabled]="true">
            Demo App (Coming Soon)
          </button>
          <div class="login-info">
            <small>Multi-tenant Azure AD integration demo</small>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h3>Quick Links</h3>
        <div class="quick-links">
          <a (click)="navigateTo('/tenant-portal')">Browse All Tenants →</a>
          <a (click)="navigateTo('/service-discovery')">Service Discovery →</a>
          <a (click)="navigateTo('/docs')">Documentation →</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .welcome-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 40px 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 60px;
    }

    .header h1 {
      font-size: 42px;
      color: #1a202c;
      margin-bottom: 12px;
      font-weight: 700;
    }

    .subtitle {
      font-size: 18px;
      color: #4a5568;
    }

    .login-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto 60px;
    }

    .option-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .option-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .platform-admin::before {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }

    .tenant-admin::before {
      background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
    }

    .demo-app::before {
      background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
    }

    .option-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
    }

    .icon {
      margin-bottom: 24px;
    }

    .platform-admin .icon { color: #667eea; }
    .tenant-admin .icon { color: #2a5298; }
    .demo-app .icon { color: #11998e; }

    .option-card h2 {
      font-size: 24px;
      color: #1a202c;
      margin-bottom: 16px;
      font-weight: 600;
    }

    .option-card p {
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 24px;
      min-height: 60px;
    }

    button {
      width: 100%;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .primary-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .secondary-btn {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
    }

    .tertiary-btn {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .login-info {
      margin-top: 16px;
      text-align: center;
      color: #718096;
      font-size: 13px;
    }

    .tenant-options {
      margin-top: 20px;
      padding: 20px;
      background: #f7fafc;
      border-radius: 8px;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .tenant-options p {
      font-size: 14px;
      margin-bottom: 12px;
      min-height: auto;
    }

    .tenant-link {
      background: white;
      color: #2a5298;
      border: 2px solid #2a5298;
      margin-bottom: 12px;
    }

    .tenant-link:hover {
      background: #2a5298;
      color: white;
    }

    .custom-tenant {
      display: flex;
      gap: 8px;
    }

    .custom-tenant input {
      flex: 1;
      padding: 10px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
    }

    .custom-tenant button {
      width: auto;
      padding: 10px 20px;
      background: #4a5568;
      color: white;
      font-size: 14px;
    }

    .info-section {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
    }

    .info-section h3 {
      font-size: 20px;
      color: #1a202c;
      margin-bottom: 20px;
    }

    .quick-links {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .quick-links a {
      color: #4299e1;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.3s ease;
    }

    .quick-links a:hover {
      color: #2b6cb0;
      text-decoration: underline;
    }
  `]
})
export class WelcomeComponent {
  showTenantOptions = false;
  customTenantId = '';

  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  navigateToCustomTenant() {
    if (this.customTenantId.trim()) {
      this.router.navigate(['/login/tenant', this.customTenantId.trim()]);
    }
  }
}
