import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bypass-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="card">
        <h1>🏭 SaaS Factory</h1>
        <h2>Quick Access Portal</h2>
        
        <div class="info-box">
          <p><strong>Azure AD Issue Detected</strong></p>
          <p>The Azure AD app registration (4c024768-9d55-4193-9956-ac3a9686cdd0) is not found.</p>
          <p>Use the options below to proceed:</p>
        </div>
        
        <div class="actions">
          <button class="btn primary" (click)="bypassAsAdmin()">
            Access as Platform Admin
          </button>
          
          <button class="btn secondary" (click)="bypassAsTenant()">
            Access as Tenant Admin
          </button>
          
          <button class="btn info" (click)="setupMockAuth()">
            Setup Mock Authentication
          </button>
        </div>
        
        <div class="footer">
          <p>This is a temporary bypass. Configure Azure AD properly for production use.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f7fa;
    }
    
    .card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      max-width: 450px;
      width: 100%;
    }
    
    h1 {
      color: #333;
      margin: 0 0 0.5rem 0;
      text-align: center;
      font-size: 2rem;
    }
    
    h2 {
      color: #666;
      margin: 0 0 2rem 0;
      text-align: center;
      font-weight: normal;
      font-size: 1.2rem;
    }
    
    .info-box {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 2rem;
    }
    
    .info-box p {
      margin: 0.5rem 0;
      color: #856404;
      font-size: 0.9rem;
    }
    
    .info-box p:first-child {
      font-weight: bold;
      margin-top: 0;
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .btn {
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .btn.primary {
      background: #667eea;
      color: white;
    }
    
    .btn.primary:hover {
      background: #5a67d8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .btn.secondary {
      background: #48bb78;
      color: white;
    }
    
    .btn.secondary:hover {
      background: #38a169;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
    }
    
    .btn.info {
      background: #4299e1;
      color: white;
    }
    
    .btn.info:hover {
      background: #3182ce;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
    }
    
    .footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    
    .footer p {
      color: #718096;
      font-size: 0.875rem;
      margin: 0;
    }
  `]
})
export class BypassLoginComponent {
  constructor(private router: Router) {}

  bypassAsAdmin() {
    // Create admin session
    const adminData = {
      id: '0052ce48-7fc4-43ba-be31-10841072d107',
      email: 'admin@saasfactory.com',
      name: 'Platform Administrator',
      role: 'PlatformAdmin',
      isPlatformAdmin: true,
      tenantId: null
    };
    
    // Store auth data
    sessionStorage.setItem('authToken', 'bypass-admin-token');
    sessionStorage.setItem('userData', JSON.stringify(adminData));
    sessionStorage.setItem('userRole', 'PlatformAdmin');
    
    // Also store in localStorage for persistence
    localStorage.setItem('saasfactory_user', JSON.stringify({
      ...adminData,
      roles: ['platform_admin', 'super_admin'],
      permissions: ['*'],
      isAuthenticated: true,
      authProvider: 'bypass',
      lastLoginTime: new Date().toISOString()
    }));
    
    // Navigate to dashboard
    this.router.navigate(['/dashboard']);
  }
  
  bypassAsTenant() {
    // Create tenant admin session
    const tenantData = {
      id: 'tenant-admin-001',
      email: 'admin@tenant.com',
      name: 'Tenant Administrator',
      role: 'TenantAdmin',
      isPlatformAdmin: false,
      tenantId: 'primussoft-20250801'
    };
    
    // Store auth data
    sessionStorage.setItem('authToken', 'bypass-tenant-token');
    sessionStorage.setItem('userData', JSON.stringify(tenantData));
    sessionStorage.setItem('userRole', 'TenantAdmin');
    
    // Navigate to tenant portal
    this.router.navigate(['/tenant-portal']);
  }
  
  setupMockAuth() {
    // Configure app to use mock authentication
    localStorage.setItem('useMockAuth', 'true');
    alert('Mock authentication enabled. Refresh the page and use the regular login.');
    window.location.reload();
  }
}
