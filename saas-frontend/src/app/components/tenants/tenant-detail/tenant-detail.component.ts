import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tenant-detail-container">
      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading tenant details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-icon">❌</div>
        <h3>Error Loading Tenant</h3>
        <p>{{error}}</p>
        <button class="btn-primary" (click)="loadTenant()">🔄 Retry</button>
      </div>

      <!-- Tenant Details -->
      <div *ngIf="!loading && !error && tenant" class="tenant-details">
        <!-- Header Section -->
        <div class="detail-header">
          <div class="header-content">
            <div class="tenant-title">
              <h1>{{tenant.name}}</h1>
              <span class="status-badge" [class]="'status-' + (tenant.status || 'active').toLowerCase()">
                {{tenant.status || 'Active'}}
              </span>
            </div>
            <p class="tenant-domain">{{tenant.domain}}</p>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" routerLink="/tenants/list">
              ← Back to List
            </button>
            <button class="btn-primary" [routerLink]="['/tenants/edit', tenant.id]">
              ✏️ Edit Tenant
            </button>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
          <!-- Basic Information Card -->
          <div class="info-card">
            <div class="card-header">
              <h3>🏢 Basic Information</h3>
            </div>
            <div class="card-content">
              <div class="info-row">
                <label>Company Name:</label>
                <span>{{tenant.name}}</span>
              </div>
              <div class="info-row">
                <label>Domain:</label>
                <span class="domain-value">{{tenant.domain}}</span>
              </div>
              <div class="info-row">
                <label>Admin Email:</label>
                <span class="email-value">{{tenant.adminEmail || 'Not specified'}}</span>
              </div>
              <div class="info-row">
                <label>Created:</label>
                <span>{{formatDate(tenant.createdAt)}}</span>
              </div>
              <div class="info-row">
                <label>Status:</label>
                <span class="status-badge" [class]="'status-' + (tenant.status || 'active').toLowerCase()">
                  {{tenant.status || 'Active'}}
                </span>
              </div>
            </div>
          </div>

          <!-- Modules Card -->
          <div class="info-card">
            <div class="card-header">
              <h3>🔧 Enabled Modules</h3>
            </div>
            <div class="card-content">
              <div class="modules-grid">
                <div *ngFor="let module of getEnabledModules()" class="module-item">
                  <div class="module-icon">✅</div>
                  <div class="module-info">
                    <div class="module-name">{{module.name}}</div>
                    <div class="module-description">{{module.description}}</div>
                  </div>
                </div>
                <div *ngIf="getEnabledModules().length === 0" class="no-modules">
                  <div class="empty-icon">📦</div>
                  <p>No modules enabled</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Usage Statistics Card -->
          <div class="info-card">
            <div class="card-header">
              <h3>📊 Usage Statistics</h3>
            </div>
            <div class="card-content">
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{getUserCount()}}</div>
                  <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{getEnabledModules().length}}</div>
                  <div class="stat-label">Active Modules</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{getDaysActive()}}</div>
                  <div class="stat-label">Days Active</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions Card -->
          <div class="info-card">
            <div class="card-header">
              <h3>⚡ Quick Actions</h3>
            </div>
            <div class="card-content">
              <div class="actions-grid">
                <button class="action-btn" [routerLink]="['/tenants/edit', tenant.id]">
                  <div class="action-icon">✏️</div>
                  <div class="action-text">Edit Details</div>
                </button>
                <button class="action-btn" (click)="viewAuthConfig()">
                  <div class="action-icon">🔐</div>
                  <div class="action-text">Auth Config</div>
                </button>
                <button class="action-btn" (click)="exportTenantData()">
                  <div class="action-icon">📥</div>
                  <div class="action-text">Export Data</div>
                </button>
                <button class="action-btn danger" (click)="deleteTenant()">
                  <div class="action-icon">🗑️</div>
                  <div class="action-text">Delete Tenant</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-detail-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 4rem);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #002F87;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      background: #ffebee;
      border-radius: 12px;
      border: 1px solid #ffcdd2;
      padding: 2rem;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-container h3 {
      color: #c62828;
      margin-bottom: 1rem;
    }

    .error-container p {
      color: #d32f2f;
      margin-bottom: 1.5rem;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .tenant-title {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .tenant-title h1 {
      color: #002F87;
      margin: 0;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .tenant-domain {
      color: #333333;
      font-size: 1.1rem;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-primary {
      background: #002F87;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-primary:hover {
      background: #001d5a;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #333333;
      border: 1px solid #333333;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
      color: #002F87;
      border-color: #002F87;
      transform: translateY(-1px);
    }

    .status-badge {
      padding: 0.375rem 0.875rem;
      border-radius: 16px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-active {
      background: #e8f5e8;
      color: #007935;
    }

    .status-inactive {
      background: #ffebee;
      color: #c62828;
    }

    .status-suspended {
      background: #fff3e0;
      color: #F2A900;
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
    }

    .info-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .info-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      background: #f8f9fa;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .card-header h3 {
      margin: 0;
      color: #002F87;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .card-content {
      padding: 1.5rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row label {
      font-weight: 600;
      color: #333333;
    }

    .domain-value {
      font-family: monospace;
      background: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .email-value {
      color: #002F87;
    }

    .modules-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .module-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .module-icon {
      font-size: 1.5rem;
    }

    .module-name {
      font-weight: 600;
      color: #002F87;
      margin-bottom: 0.25rem;
    }

    .module-description {
      color: #333333;
      font-size: 0.9rem;
    }

    .no-modules {
      text-align: center;
      padding: 2rem;
      color: #9e9e9e;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1.5rem;
    }

    .stat-item {
      text-align: center;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #002F87;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #333333;
      font-weight: 500;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      color: inherit;
    }

    .action-btn:hover {
      background: #e9ecef;
      transform: translateY(-2px);
    }

    .action-btn.danger {
      background: #ffebee;
      border-color: #ffcdd2;
      color: #c62828;
    }

    .action-btn.danger:hover {
      background: #ffcdd2;
    }

    .action-icon {
      font-size: 1.5rem;
    }

    .action-text {
      font-size: 0.85rem;
      font-weight: 500;
      text-align: center;
    }

    @media (max-width: 768px) {
      .tenant-detail-container {
        padding: 1rem;
      }

      .detail-header {
        flex-direction: column;
        gap: 1rem;
      }

      .header-actions {
        align-self: stretch;
      }

      .content-grid {
        grid-template-columns: 1fr;
      }

      .tenant-title h1 {
        font-size: 2rem;
      }
    }
  `]
})
export class TenantDetailComponent implements OnInit {
  loading = true;
  error = '';
  tenant: any = null;
  tenantId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  private apiService: ApiService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    console.log('🏢 [TenantDetail] Initializing tenant detail component...');
    
    this.route.paramMap.subscribe(params => {
      this.tenantId = params.get('id');
      console.log('🏢 [TenantDetail] Tenant ID from route:', this.tenantId);
      
      if (this.tenantId) {
        this.loadTenant();
      } else {
        this.error = 'Tenant ID not provided';
        this.loading = false;
      }
    });
  }

  loadTenant(): void {
    if (!this.tenantId) return;

    console.log('🏢 [TenantDetail] Loading tenant details for ID:', this.tenantId);
    this.loading = true;
    this.error = '';

  // Load tenant from real API
  this.apiService.getTenant(this.tenantId).subscribe({
      next: (tenant: any) => {
        console.log('🏢 [TenantDetail] Tenant loaded successfully:', tenant);
        this.tenant = tenant;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('🏢 [TenantDetail] Error loading tenant:', error);
        this.error = 'Failed to load tenant details';
        this.loading = false;
      }
    });
  }

  getEnabledModules(): any[] {
    if (!this.tenant) return [];

    const settings = this.tenant.settings || this.tenant.Settings;
    const selectedModules = this.tenant.selectedModules || [];
    
    const allModules = [
      { name: 'User Management', description: 'Manage users and accounts', enabled: true },
      { name: 'RBAC', description: 'Role-based access control', enabled: true },
      { name: 'Multi-Tenancy', description: 'Tenant isolation and management', enabled: true },
      { name: 'Notifications', description: 'Email and system notifications', enabled: settings?.enableNotifications || selectedModules.includes('notifications') },
      { name: 'Analytics', description: 'Usage analytics and reporting', enabled: settings?.enableAnalytics || selectedModules.includes('analytics') },
      { name: 'Audit Logs', description: 'System activity tracking', enabled: settings?.enableAuditLogs || selectedModules.includes('auditLogs') },
      { name: 'AI Copilot', description: 'AI-powered assistance', enabled: settings?.enableAI || selectedModules.includes('aiCopilot') }
    ];

    return allModules.filter(module => module.enabled);
  }

  getUserCount(): number {
    return this.tenant?.userCount || this.tenant?.UserCount || 0;
  }

  getDaysActive(): number {
    const createdAt = this.tenant?.createdAt || this.tenant?.CreatedAt;
    if (!createdAt) return 0;

    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  viewAuthConfig(): void {
    console.log('🔐 [TenantDetail] Navigating to auth config for tenant:', this.tenantId);
    this.router.navigate(['/tenants', this.tenantId, 'auth-config']);
  }

  exportTenantData(): void {
    console.log('📥 [TenantDetail] Exporting tenant data...');
    
    const exportData = {
      id: this.tenant.id,
      name: this.tenant.name,
      domain: this.tenant.domain,
      adminEmail: this.tenant.adminEmail,
      status: this.tenant.status,
      createdAt: this.tenant.createdAt,
      enabledModules: this.getEnabledModules().map(m => m.name),
      userCount: this.getUserCount(),
      daysActive: this.getDaysActive()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tenant-${this.tenant.name}-export.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    this.dialogService.info(
      'Export Complete',
      'Tenant data has been exported successfully.'
    ).subscribe();
  }

  deleteTenant(): void {
    console.log('🗑️ [TenantDetail] Delete tenant requested...');
    
    const tenantName = this.tenant.name;
    
    this.dialogService.confirm(
      'Delete Tenant',
      `Are you sure you want to delete tenant "${tenantName}"? This action cannot be undone.`
    ).subscribe(confirmed => {
      if (confirmed && this.tenantId) {
        console.log('🗑️ [TenantDetail] Deleting tenant:', this.tenantId);
        
        // For demo purposes, simulate deletion and navigate away
        console.log(`🗑️ Demo: Simulating tenant deletion for: ${tenantName}`);
        
        this.dialogService.info(
          'Tenant Deleted',
          `Tenant "${tenantName}" has been deleted successfully.`
        ).subscribe(() => {
          this.router.navigate(['/tenants/list']);
        });
      }
    });
  }
} 