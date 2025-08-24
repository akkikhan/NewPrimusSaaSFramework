import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { TenantService } from '../../services/tenant.service';
import { TenantAuthService } from '../../services/tenant-auth.service';
import { HttpClient } from '@angular/common/http';

interface TenantModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="tenant-portal-container">
      <!-- Tenant Header -->
      <div class="tenant-header">
        <div class="header-content">
          <div class="tenant-branding">
            <h1>{{tenantInfo?.name || 'Loading...'}}</h1>
            <p class="tenant-domain">{{tenantInfo?.domain}}</p>
          </div>
          <div class="header-actions">
            <span class="tenant-badge" [class]="'status-' + (tenantInfo?.status || 'active')">
              {{tenantInfo?.status || 'Active'}}
            </span>
            <div class="user-menu">
              <span class="user-name">{{currentUser?.name}}</span>
              <button class="btn-logout" (click)="logout()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Module Navigation (Only shows assigned modules) -->
      <div class="module-navigation">
        <nav class="module-nav">
          <a [routerLink]="['/tenants', tenantId, 'dashboard']" 
             routerLinkActive="active" 
             [routerLinkActiveOptions]="{exact: true}"
             class="nav-item">
            <span class="nav-icon">🏠</span>
            Dashboard
          </a>
          
          <!-- Dynamically render only assigned modules -->
          <ng-container *ngFor="let module of assignedModules">
            <a [routerLink]="['/tenants', tenantId, module.route]" 
               routerLinkActive="active"
               class="nav-item"
               *ngIf="module.enabled">
              <span class="nav-icon">{{module.icon}}</span>
              {{module.name}}
            </a>
          </ng-container>

          <!-- Always show settings -->
          <a [routerLink]="['/tenants', tenantId, 'settings']" 
             routerLinkActive="active"
             class="nav-item">
            <span class="nav-icon">⚙️</span>
            Settings
          </a>
        </nav>
      </div>

      <!-- Dashboard Content -->
      <div class="dashboard-content">
        <!-- Module Cards Grid -->
        <div class="modules-section">
          <h2>Your Modules</h2>
          <div class="modules-grid">
            <div *ngFor="let module of assignedModules" 
                 class="module-card" 
                 [class.disabled]="!module.enabled"
                 (click)="navigateToModule(module)">
              <div class="module-icon">{{module.icon}}</div>
              <h3>{{module.name}}</h3>
              <p>{{module.description}}</p>
              <span class="module-status" [class.active]="module.enabled">
                {{module.enabled ? 'Active' : 'Disabled'}}
              </span>
            </div>
          </div>
        </div>

        <!-- Usage Metrics (if RBAC module is enabled) -->
        <div class="metrics-section" *ngIf="hasModule('rbac')">
          <h2>Usage Metrics</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-label">Users</span>
                <span class="metric-value">{{userCount}} / {{userLimit}}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getUserPercentage()"></div>
              </div>
              <button class="btn-action" 
                      [routerLink]="['/tenants', tenantId, 'users']"
                      *ngIf="hasModule('rbac')">
                Manage Users
              </button>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-label">Storage</span>
                <span class="metric-value">{{storageUsed}}GB / {{storageLimit}}GB</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getStoragePercentage()"></div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-label">API Calls</span>
                <span class="metric-value">{{apiCallsToday}}</span>
              </div>
              <p class="metric-subtitle">Today</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <!-- Invite Users (only if RBAC module is enabled) -->
            <div class="action-card" 
                 *ngIf="hasModule('rbac')"
                 [routerLink]="['/tenants', tenantId, 'users', 'invite']">
              <span class="action-icon">➕</span>
              <h4>Invite Users</h4>
              <p>Add new users to your tenant</p>
            </div>

            <!-- View Analytics (only if Analytics module is enabled) -->
            <div class="action-card" 
                 *ngIf="hasModule('analytics')"
                 [routerLink]="['/tenants', tenantId, 'analytics']">
              <span class="action-icon">📊</span>
              <h4>View Analytics</h4>
              <p>Check your usage analytics</p>
            </div>

            <!-- AI Assistant (only if Copilot module is enabled) -->
            <div class="action-card" 
                 *ngIf="hasModule('copilot')"
                 [routerLink]="['/tenants', tenantId, 'copilot']">
              <span class="action-icon">🤖</span>
              <h4>AI Assistant</h4>
              <p>Get help from AI Copilot</p>
            </div>

            <!-- Settings (always available) -->
            <div class="action-card" 
                 [routerLink]="['/tenants', tenantId, 'settings']">
              <span class="action-icon">⚙️</span>
              <h4>Settings</h4>
              <p>Configure tenant settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,  styles: [`
    .tenant-portal-container {
      min-height: 100vh;
      background-color: #f8fafc;
    }

    /* Tenant Header */
    .tenant-header {
      background: linear-gradient(135deg, #002F87 0%, #001d5a 100%);
      color: white;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tenant-branding h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .tenant-domain {
      margin: 4px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .tenant-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.2);
    }

    .tenant-badge.status-active {
      background: #10b981;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-name {
      font-size: 14px;
      opacity: 0.95;
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Module Navigation */
    .module-navigation {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .module-nav {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      gap: 0;
      padding: 0 24px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      color: #64748b;
      text-decoration: none;
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .nav-item:hover {
      color: #002F87;
      background: #f8fafc;
    }

    .nav-item.active {
      color: #002F87;
      border-bottom-color: #F2A900;
    }

    .nav-icon {
      font-size: 18px;
    }

    /* Dashboard Content */
    .dashboard-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    /* Modules Section */
    .modules-section {
      margin-bottom: 48px;
    }

    .modules-section h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }

    .module-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .module-card:hover:not(.disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      border-color: #002F87;
    }

    .module-card.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .module-icon {
      font-size: 32px;
      margin-bottom: 16px;
    }

    .module-card h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #1e293b;
    }

    .module-card p {
      margin: 0 0 16px 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.5;
    }

    .module-status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: #fee2e2;
      color: #991b1b;
    }

    .module-status.active {
      background: #d1fae5;
      color: #065f46;
    }

    /* Metrics Section */
    .metrics-section {
      margin-bottom: 48px;
    }

    .metrics-section h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e2e8f0;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .metric-label {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 600;
      color: #002F87;
    }

    .progress-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #002F87 0%, #F2A900 100%);
      transition: width 0.3s ease;
    }

    .metric-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    .btn-action {
      padding: 8px 16px;
      background: #002F87;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-action:hover {
      background: #001d5a;
    }

    /* Actions Section */
    .actions-section {
      margin-bottom: 48px;
    }

    .actions-section h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 24px 0;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .action-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #002F87;
    }

    .action-icon {
      font-size: 28px;
      margin-bottom: 12px;
      display: block;
    }

    .action-card h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #1e293b;
    }

    .action-card p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
  `]
})
export class TenantDashboardEnhancedComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tenantId: string = '';
  tenantInfo: any = null;
  currentUser: any = null;
  assignedModules: TenantModule[] = [];
  
  // Metrics
  userCount: number = 0;
  userLimit: number = 1000;
  storageUsed: number = 45;
  storageLimit: number = 100;
  apiCallsToday: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private tenantService: TenantService,
    private tenantAuthService: TenantAuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.params['tenantId'];
    this.loadTenantInfo();
    this.loadAssignedModules();
    this.loadCurrentUser();
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTenantInfo(): void {
    this.tenantService.loadTenantConfig(this.tenantId).then(
      config => {
        this.tenantInfo = config;
      },
      error => {
        console.error('Failed to load tenant config:', error);
      }
    );
  }

  loadAssignedModules(): void {
    // Fetch modules assigned to this tenant from backend
    this.apiService.get(`/api/tenants/${this.tenantId}/modules`).subscribe({
      next: (response: any) => {
        this.assignedModules = this.mapModules(response.data || []);
      },
      error: (error: any) => {
        console.error('Failed to load modules:', error);
        // Fallback to default modules if API fails
        this.assignedModules = this.getDefaultModules();
      }
    });
  }

  mapModules(modules: any[]): TenantModule[] {
    return modules.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      enabled: m.enabled,
      route: this.getModuleRoute(m.id),
      icon: this.getModuleIcon(m.id)
    }));
  }

  getDefaultModules(): TenantModule[] {
    // Return minimal default modules if API fails
    return [
      {
        id: 'rbac',
        name: 'User Management',
        description: 'Manage users and permissions',
        enabled: true,
        route: 'users',
        icon: '👥'
      }
    ];
  }

  getModuleRoute(moduleId: string): string {
    const routeMap: Record<string, string> = {
      'rbac': 'users',
      'analytics': 'analytics',
      'copilot': 'copilot',
      'audit': 'audit',
      'notifications': 'notifications'
    };
    return routeMap[moduleId] || moduleId;
  }

  getModuleIcon(moduleId: string): string {
    const iconMap: Record<string, string> = {
      'rbac': '👥',
      'analytics': '📊',
      'copilot': '🤖',
      'audit': '📋',
      'notifications': '🔔'
    };
    return iconMap[moduleId] || '📦';
  }

  loadCurrentUser(): void {
    const userData = sessionStorage.getItem('tenantUserData');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }

  loadMetrics(): void {
    // Load usage metrics if RBAC module is enabled
    if (this.hasModule('rbac')) {
      this.apiService.get(`/api/tenants/${this.tenantId}/metrics`).subscribe({
        next: (response: any) => {
          const metrics = response.data;
          this.userCount = metrics?.userCount || 0;
          this.storageUsed = metrics?.storageUsed || 0;
          this.apiCallsToday = metrics?.apiCalls || 0;
        },
        error: (error: any) => {
          console.error('Failed to load metrics:', error);
        }
      });
    }
  }

  hasModule(moduleId: string): boolean {
    return this.assignedModules.some(m => m.id === moduleId && m.enabled);
  }

  getUserPercentage(): number {
    return Math.min((this.userCount / this.userLimit) * 100, 100);
  }

  getStoragePercentage(): number {
    return Math.min((this.storageUsed / this.storageLimit) * 100, 100);
  }

  navigateToModule(module: TenantModule): void {
    if (module.enabled) {
      this.router.navigate(['/tenants', this.tenantId, module.route]);
    }
  }

  logout(): void {
    this.tenantAuthService.logout(this.tenantId);
    this.router.navigate(['/']);
  }
}
