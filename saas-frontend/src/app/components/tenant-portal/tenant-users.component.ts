import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../services/tenant.service';
import { TenantConfig } from '../../shared/models/tenant-config.interface';

@Component({
  selector: 'app-tenant-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenant-users" [attr.data-tenant]="tenantId">
      <header class="page-header">
        <h1>User Management</h1>
        <p *ngIf="tenantConfig">{{ tenantConfig.companyName }} - Users & Permissions</p>
      </header>
      
      <div class="users-content">
        <div class="coming-soon">
          <h2>User Management Features</h2>
          <p>This section will include:</p>
          <ul>
            <li>View and manage tenant users</li>
            <li>Invite new users to the tenant</li>
            <li>Assign roles and permissions</li>
            <li>Manage user access and status</li>
          </ul>
          <p><em>Coming soon...</em></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-users {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 1rem;
    }
    
    .page-header h1 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    
    .page-header p {
      margin: 0;
      color: #666;
    }
    
    .coming-soon {
      text-align: center;
      padding: 3rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 2px dashed #dee2e6;
    }
    
    .coming-soon h2 {
      color: #495057;
      margin-bottom: 1rem;
    }
    
    .coming-soon ul {
      text-align: left;
      display: inline-block;
      margin: 1rem 0;
    }
    
    .coming-soon li {
      margin: 0.5rem 0;
      color: #6c757d;
    }
  `]
})
export class TenantUsersComponent implements OnInit {
  tenantId: string | null = null;
  tenantConfig: TenantConfig | null = null;

  constructor(
    private route: ActivatedRoute,
    private tenantService: TenantService
  ) {}

  async ngOnInit(): Promise<void> {
    this.tenantId = this.route.snapshot.params['tenantId'];
    
    if (this.tenantId) {
      try {
        this.tenantConfig = await this.tenantService.loadTenantConfig(this.tenantId);
      } catch (error) {
        console.error('Failed to load tenant config:', error);
      }
    }
  }
}
