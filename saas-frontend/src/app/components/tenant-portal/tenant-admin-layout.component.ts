import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TenantAuthService } from '../../core/services/tenant-auth.service';

@Component({
  selector: 'app-tenant-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tenant-layout">
      <!-- Sidebar Navigation -->
      <nav class="sidebar" [class.collapsed]="sidebarCollapsed">
        <!-- Brand Header -->
        <div class="sidebar-header">
          <div class="brand" (click)="toggleSidebar()">
            <div class="brand-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
                <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z"/>
                <path d="M7 8V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <div class="brand-text" *ngIf="!sidebarCollapsed">
              <span class="tenant-name">{{tenantDisplayName}}</span>
              <span class="tenant-subtitle">Admin Portal</span>
            </div>
          </div>
        </div>

        <!-- Navigation Menu -->
        <div class="nav-menu">
          <!-- Dashboard -->
          <div class="nav-standalone">
            <a [routerLink]="['/tenant', tenantId, 'dashboard']" 
               routerLinkActive="active" 
               [routerLinkActiveOptions]="{exact: true}"
               class="nav-item"
               title="Dashboard">
              <span class="nav-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              <span class="nav-text" *ngIf="!sidebarCollapsed">Dashboard</span>
            </a>
          </div>

          <!-- User Management Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">USER MANAGEMENT</span>
            </div>
            <div class="nav-items">
              <a [routerLink]="['/tenant', tenantId, 'users']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Users">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Users</span>
              </a>
              <a [routerLink]="['/tenant', tenantId, 'roles']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Roles & Permissions">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Roles & Permissions</span>
              </a>
            </div>
          </div>

          <!-- Analytics & Reports Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">ANALYTICS & REPORTS</span>
            </div>
            <div class="nav-items">
              <a [routerLink]="['/tenant', tenantId, 'analytics']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Analytics">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3v18h18"/>
                    <path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Analytics</span>
              </a>
              <a [routerLink]="['/tenant', tenantId, 'reports']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Reports">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Reports</span>
              </a>
            </div>
          </div>

          <!-- Audit & Security Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">AUDIT & SECURITY</span>
            </div>
            <div class="nav-items">
              <a [routerLink]="['/tenant', tenantId, 'audit-logs']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Audit Logs">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Audit Logs</span>
              </a>
            </div>
          </div>

          <!-- AI Assistant Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">AI ASSISTANT</span>
            </div>
            <div class="nav-items">
              <a [routerLink]="['/tenant', tenantId, 'copilot']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="AI Copilot">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20"/>
                    <path d="m15 19-3-3-3 3"/>
                    <path d="m19 15 3-3-3-3"/>
                    <path d="m5 9-3 3 3 3"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">AI Copilot</span>
              </a>
            </div>
          </div>

          <!-- Settings Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">SETTINGS</span>
            </div>
            <div class="nav-items">
              <a [routerLink]="['/tenant', tenantId, 'settings']" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Settings">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="m12 1 2.09 2.09L16.18 1.82l1.82 1.82L16.91 5l2.09 2.09v1.82L16.91 11l2.09 2.09v1.82L17.18 16.18l-1.09-1.09L14 17.18l-2.09-2.09L10.82 17.18l-1.82-1.82L10.09 14l-2.09-2.09v-1.82L10.09 8l-2.09-2.09V4.09L8.82 2.82l1.09 1.09L12 1z"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Settings</span>
              </a>
            </div>
          </div>
        </div>

        <!-- User Menu Footer -->
        <div class="sidebar-footer">
          <div class="user-menu" [class.collapsed]="sidebarCollapsed">
            <!-- User Info Section -->
            <div class="user-info" *ngIf="!sidebarCollapsed && userProfile">
              <div class="user-avatar">{{userProfile.name?.charAt(0) || '?'}}</div>
              <div class="user-details">
                <div class="user-name">{{userProfile.name}}</div>
                <div class="user-role">Tenant Admin</div>
              </div>
            </div>
            
            <!-- Collapsed Avatar Only -->
            <div class="user-avatar-only" *ngIf="sidebarCollapsed && userProfile" 
                 [title]="userProfile.name + ' - Tenant Admin'">
              {{userProfile.name?.charAt(0) || '?'}}
            </div>

            <!-- Logout Action -->
            <div class="user-actions">
              <button class="logout-btn" (click)="logout()" 
                      [title]="sidebarCollapsed ? 'Logout' : ''">
                <span class="logout-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </span>
                <span class="logout-text" *ngIf="!sidebarCollapsed">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="main-content" [class.sidebar-collapsed]="sidebarCollapsed">
        <!-- Top Header -->
        <header class="top-header">
          <div class="header-left">
            <button class="sidebar-toggle" (click)="toggleSidebar()">
              <span class="toggle-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </span>
            </button>
            <h1 class="page-title">{{getPageTitle()}}</h1>
          </div>
          <div class="header-right">
            <div class="header-actions">
              <div class="tenant-info-header">
                <span class="tenant-name-header">{{tenantDisplayName}}</span>
                <span class="tenant-role-header">Tenant Admin Portal</span>
              </div>
              <div class="user-info-header" *ngIf="userProfile">
                <div class="user-header-details">
                  <span class="user-name-header">{{userProfile.name}}</span>
                  <span class="user-role-header">Tenant Admin</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* Tenant-specific layout styles - similar to platform admin but with tenant branding */
    .tenant-layout {
      display: flex;
      min-height: 100vh;
      background-color: #f8fafc;
    }

    .sidebar {
      width: 280px;
      background-color: #ffffff;
      border-right: 1px solid #e2e8f0;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 100;
    }

    .sidebar.collapsed {
      width: 72px;
    }

    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid #e2e8f0;
      background-color: #ffffff;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #667eea;
      font-weight: 700;
      font-size: 18px;
      transition: all 0.2s ease;
    }

    .brand:hover {
      color: #764ba2;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-icon svg {
      width: 28px;
      height: 28px;
      stroke: currentColor;
      fill: none;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      transition: opacity 0.2s ease;
    }

    .tenant-name {
      font-weight: 700;
      color: #667eea;
      font-size: 18px;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .tenant-subtitle {
      font-size: 12px;
      color: #8b5cf6;
      font-weight: 500;
      margin-top: 2px;
    }

    .sidebar.collapsed .brand-text {
      opacity: 0;
      transform: translateX(-10px);
    }

    .nav-menu {
      flex: 1;
      padding: 16px 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-standalone {
      margin-bottom: 32px;
      padding: 0 16px;
    }

    .nav-section {
      margin-bottom: 28px;
    }

    .nav-section-header {
      padding: 16px 20px 8px 20px;
      margin-bottom: 4px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      display: block;
    }

    .nav-items {
      padding: 0 16px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      margin: 3px 0;
      color: #475569;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      font-size: 15px;
      position: relative;
      min-height: 48px;
    }

    .nav-item:hover {
      background-color: #f1f5f9;
      color: #667eea;
      transform: translateX(2px);
    }

    .nav-item.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: #8b5cf6;
      border-radius: 0 2px 2px 0;
    }

    .nav-icon {
      width: 24px;
      height: 24px;
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-icon svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
    }

    .sidebar.collapsed .nav-icon {
      margin-right: 0;
    }

    .nav-text {
      flex: 1;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s ease;
    }

    .sidebar.collapsed .nav-text {
      opacity: 0;
      transform: translateX(-8px);
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      background-color: #f8fafc;
      flex-shrink: 0;
    }

    .user-menu {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-menu.collapsed {
      align-items: center;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    }

    .user-avatar-only {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      margin: 0 auto;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
      cursor: pointer;
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 600;
      font-size: 15px;
      color: #1e293b;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 13px;
      color: #64748b;
    }

    .user-actions {
      margin-top: 8px;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      justify-content: center;
    }

    .logout-btn:hover {
      background: #dc2626;
      transform: translateY(-1px);
    }

    .sidebar.collapsed .logout-btn {
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 50%;
    }

    .sidebar.collapsed .logout-text {
      display: none;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .top-header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .sidebar-toggle {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
      color: #64748b;
    }

    .sidebar-toggle:hover {
      background: #f1f5f9;
      color: #667eea;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tenant-info-header {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;
    }

    .tenant-name-header {
      font-weight: 700;
      font-size: 14px;
    }

    .tenant-role-header {
      font-size: 12px;
      opacity: 0.9;
    }

    .user-info-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .user-header-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .user-name-header {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
    }

    .user-role-header {
      font-size: 12px;
      color: #64748b;
    }

    .page-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .sidebar {
        position: absolute;
        left: -280px;
        height: 100vh;
        z-index: 1000;
      }

      .sidebar.collapsed {
        left: -72px;
      }

      .sidebar.mobile-open {
        left: 0;
      }

      .main-content {
        width: 100%;
      }
    }
  `]
})
export class TenantAdminLayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tenantId: string = '';
  tenantDisplayName: string = '';
  sidebarCollapsed = false;
  userProfile: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantAuthService: TenantAuthService
  ) {}

  ngOnInit(): void {
    // Get tenant ID from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.tenantId = params['tenantId'] || '';
      this.loadTenantInfo();
    });

    // Get user profile
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTenantInfo(): void {
    // Load tenant information - you may need to implement this in your tenant service
    // For now, set a default display name
    this.tenantDisplayName = this.tenantId.charAt(0).toUpperCase() + this.tenantId.slice(1);
  }

  private loadUserProfile(): void {
    // Get user profile from auth service
    this.tenantAuthService.tenantUser$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      this.userProfile = user;
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getPageTitle(): string {
    // Extract page title from current route
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Dashboard';
    if (url.includes('users')) return 'User Management';
    if (url.includes('roles')) return 'Roles & Permissions';
    if (url.includes('analytics')) return 'Analytics';
    if (url.includes('reports')) return 'Reports';
    if (url.includes('audit-logs')) return 'Audit Logs';
    if (url.includes('copilot')) return 'AI Copilot';
    if (url.includes('settings')) return 'Settings';
    return 'Tenant Admin Portal';
  }

  logout(): void {
    this.tenantAuthService.tenantLogout();
    this.router.navigate(['/tenant', this.tenantId, 'login']);
  }
} 