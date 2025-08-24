import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantService } from '../../../core/services/tenant.service';
import { EnhancedAuthService } from '../../../core/services/enhanced-auth.service';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenant-dashboard">
      <div class="dashboard-header">
        <h1>{{tenantName}} Dashboard</h1>
        <div class="user-info">
          <span>{{userName}}</span>
          <span class="role-badge">Tenant Admin</span>
        </div>
      </div>

      <div class="dashboard-content">
        <!-- Tenant Overview -->
        <div class="card">
          <h2>Tenant Overview</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>Tenant ID:</label>
              <span>{{tenantId}}</span>
            </div>
            <div class="info-item">
              <label>Company Name:</label>
              <span>{{tenantName}}</span>
            </div>
            <div class="info-item">
              <label>Admin Email:</label>
              <span>{{adminEmail}}</span>
            </div>
            <div class="info-item">
              <label>Created:</label>
              <span>{{createdDate | date}}</span>
            </div>
          </div>
        </div>

        <!-- Azure AD Configuration -->
        <div class="card">
          <h2>Azure AD Configuration</h2>
          <div class="config-status" *ngIf="azureConfig">
            <div class="status-item">
              <span class="status-icon success">✓</span>
              <span>Azure AD Connected</span>
            </div>
            <div class="info-item">
              <label>Tenant ID:</label>
              <span>{{azureConfig.tenantId}}</span>
            </div>
            <div class="info-item">
              <label>Client ID:</label>
              <span>{{azureConfig.clientId}}</span>
            </div>
          </div>
          <div class="config-status" *ngIf="!azureConfig">
            <div class="status-item">
              <span class="status-icon warning">⚠</span>
              <span>Azure AD Not Configured</span>
            </div>
            <button class="btn-primary" (click)="configureAzureAD()">
              Configure Azure AD
            </button>
          </div>
        </div>

        <!-- Users & Access -->
        <div class="card">
          <h2>Users & Access</h2>
          <div class="users-list">
            <div class="user-item" *ngFor="let user of users">
              <div class="user-info">
                <span class="user-name">{{user.name}}</span>
                <span class="user-email">{{user.email}}</span>
              </div>
              <span class="user-role">{{user.role}}</span>
            </div>
          </div>
          <button class="btn-secondary" (click)="manageUsers()">
            Manage Users
          </button>
        </div>

        <!-- Integration Status -->
        <div class="card">
          <h2>Integration Status</h2>
          <div class="integration-list">
            <div class="integration-item">
              <span class="integration-name">Authentication</span>
              <span class="status-badge success">Active</span>
            </div>
            <div class="integration-item">
              <span class="integration-name">User Sync</span>
              <span class="status-badge" [class.success]="userSyncEnabled">
                {{userSyncEnabled ? 'Active' : 'Inactive'}}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-dashboard {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .dashboard-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .role-badge {
      background: #6366f1;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .dashboard-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 1rem 0;
    }

    .info-grid {
      display: grid;
      gap: 0.75rem;
    }

    .info-item {
      display: flex;
      gap: 0.5rem;
    }

    .info-item label {
      font-weight: 500;
      color: #6b7280;
      min-width: 120px;
    }

    .info-item span {
      color: #1f2937;
    }

    .config-status {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .status-icon.success {
      background: #d1fae5;
      color: #059669;
    }

    .status-icon.warning {
      background: #fed7aa;
      color: #ea580c;
    }

    .btn-primary, .btn-secondary {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 1rem;
    }

    .btn-primary {
      background: #6366f1;
      color: white;
    }

    .btn-primary:hover {
      background: #4f46e5;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #1f2937;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .users-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 6px;
    }

    .user-name {
      font-weight: 500;
      color: #1f2937;
    }

    .user-email {
      font-size: 0.875rem;
      color: #6b7280;
      margin-left: 0.5rem;
    }

    .user-role {
      font-size: 0.875rem;
      color: #6366f1;
      font-weight: 500;
    }

    .integration-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .integration-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 6px;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: #e5e7eb;
      color: #6b7280;
    }

    .status-badge.success {
      background: #d1fae5;
      color: #059669;
    }
  `]
})
export class TenantDashboardComponent implements OnInit {
  tenantId: string = '';
  tenantName: string = '';
  adminEmail: string = '';
  userName: string = '';
  createdDate: Date = new Date();
  azureConfig: any = null;
  users: any[] = [];
  userSyncEnabled: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantService: TenantService,
    private authService: EnhancedAuthService
  ) {}

  ngOnInit() {
    this.tenantId = this.route.snapshot.params['tenantId'];
    this.loadTenantData();
    this.loadUserInfo();
  }

  private async loadTenantData() {
    try {
      const tenant = await this.tenantService.getTenantConfiguration(this.tenantId).toPromise();
      if (tenant) {
        this.tenantName = tenant.companyName;
        this.adminEmail = tenant.adminEmail;
        this.createdDate = new Date(tenant.createdAt);
        this.azureConfig = tenant.azureAdConfig;
        
        // Load users for this tenant
        this.users = [
          {
            name: this.getUserName(tenant.adminEmail),
            email: tenant.adminEmail,
            role: 'Tenant Admin'
          }
        ];
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    }
  }

  private loadUserInfo() {
    this.authService.userContext$.subscribe(context => {
      if (context) {
        this.userName = context.name || context.email;
      }
    });
  }

  private getUserName(email: string): string {
    const name = email.split('@')[0];
    return name.split('.').map(n => 
      n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
    ).join(' ');
  }

  configureAzureAD() {
    this.router.navigate(['/tenant', this.tenantId, 'configure-azure']);
  }

  manageUsers() {
    this.router.navigate(['/tenant', this.tenantId, 'users']);
  }
}
