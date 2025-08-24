import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo?: string;
}

@Component({
  selector: 'app-tenant-portal-selection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="portal-container">
      <div class="header">
        <h1>Select Your Organization</h1>
        <p>Choose your organization to access the administration portal</p>
      </div>
      
      <div class="tenant-grid">
        <div class="tenant-card" *ngFor="let tenant of tenants" (click)="selectTenant(tenant)">
          <div class="tenant-logo">
            <span *ngIf="!tenant.logo">{{ getInitials(tenant.name) }}</span>
            <img *ngIf="tenant.logo" [src]="tenant.logo" [alt]="tenant.name">
          </div>
          <h3>{{ tenant.name }}</h3>
          <p>{{ tenant.domain }}</p>
          <div class="arrow">→</div>
        </div>
      </div>
      
      <div class="demo-section">
        <h2>Demo Tenants Available</h2>
        <p>For testing purposes, you can access the following demo tenant:</p>
        <ul>
          <li>
            <strong>PrimusSoft</strong> - 
            <a (click)="navigateToTenant('primussoft-20250801')">Login →</a>
          </li>
        </ul>
      </div>
      
      <div class="platform-admin-link">
        <p>Are you a platform administrator? <a routerLink="/login">Login here</a></p>
      </div>
    </div>
  `,
  styles: [`
    .portal-container {
      min-height: 100vh;
      background: #f7fafc;
      padding: 40px 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 48px;
    }

    .header h1 {
      font-size: 32px;
      color: #1a202c;
      margin-bottom: 8px;
    }

    .header p {
      color: #718096;
      font-size: 18px;
    }

    .tenant-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto 48px;
    }

    .tenant-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .tenant-card:hover {
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .tenant-logo {
      width: 60px;
      height: 60px;
      background: #e2e8f0;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      font-size: 24px;
      font-weight: 600;
      color: #4a5568;
    }

    .tenant-card h3 {
      font-size: 20px;
      color: #1a202c;
      margin-bottom: 4px;
    }

    .tenant-card p {
      color: #718096;
      font-size: 14px;
    }

    .arrow {
      position: absolute;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 24px;
      color: #cbd5e0;
      transition: all 0.3s ease;
    }

    .tenant-card:hover .arrow {
      color: #4299e1;
      transform: translateY(-50%) translateX(4px);
    }

    .demo-section {
      max-width: 800px;
      margin: 0 auto 32px;
      background: #e6f7ff;
      padding: 24px;
      border-radius: 12px;
    }

    .demo-section h2 {
      color: #1a202c;
      margin-bottom: 8px;
    }

    .demo-section p {
      color: #4a5568;
      margin-bottom: 16px;
    }

    .demo-section ul {
      list-style: none;
      padding: 0;
    }

    .demo-section li {
      padding: 8px 0;
      color: #2d3748;
    }

    .demo-section a {
      color: #4299e1;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
    }

    .demo-section a:hover {
      text-decoration: underline;
    }

    .platform-admin-link {
      text-align: center;
      margin-top: 48px;
      color: #718096;
    }

    .platform-admin-link a {
      color: #4299e1;
      text-decoration: none;
      font-weight: 500;
    }

    .platform-admin-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class TenantPortalSelectionComponent {
  tenants: Tenant[] = [
    {
      id: 'primussoft-20250801',
      name: 'PrimusSoft',
      domain: 'primussoft.com'
    }
    // In production, this would be fetched from an API
  ];

  constructor(private router: Router) {}

  selectTenant(tenant: Tenant) {
    this.navigateToTenant(tenant.id);
  }

  navigateToTenant(tenantId: string) {
    this.router.navigate(['/login/tenant', tenantId]);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
