import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EnhancedAuthService } from '../../core/services/enhanced-auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-layout">
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
            <span class="brand-text" *ngIf="!sidebarCollapsed">Primus Framework</span>
          </div>
        </div>

        <!-- Navigation Menu -->
        <div class="nav-menu">
          <!-- Dashboard - Standalone Item -->
          <div class="nav-standalone">
            <a routerLink="/dashboard" 
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

          <!-- Tenant Management Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">TENANT MANAGEMENT</span>
            </div>
            <div class="nav-items">
              <a routerLink="/tenants/list" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Tenant List">
                <span class="nav-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 21h18"/>
                    <path d="M5 21V7l8-4v18"/>
                    <path d="M19 21V11l-6-4"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Tenant List</span>
              </a>
              <a routerLink="/tenants/onboard" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Onboard Tenant">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Onboard Tenant (IdP)</span>
              </a>
            </div>
          </div>

          <!-- Authentication Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">AUTHENTICATION</span>
            </div>
            <div class="nav-items">
              <a routerLink="/authentication/oauth-providers" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="OAuth Providers">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    <path d="M13 12h1"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">OAuth Providers</span>
              </a>
            </div>
          </div>

          <!-- Access Control (RBAC) Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">ACCESS CONTROL (RBAC)</span>
            </div>
            <div class="nav-items">
              <a routerLink="/rbac/roles" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Roles">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Roles</span>
              </a>
              <a routerLink="/rbac/permissions" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Permissions">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9 12 2 2 4-4"/>
                    <path d="M12 2a10 10 0 1 0 10 10"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Permissions</span>
              </a>
            </div>
          </div>

          <!-- Module Management Section - NEW -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">MODULE MANAGEMENT</span>
            </div>
            <div class="nav-items">
              <a routerLink="/modules/tenant-modules" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Tenant Modules">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="6" height="6" rx="1"/>
                    <rect x="15" y="3" width="6" height="6" rx="1"/>
                    <rect x="3" y="15" width="6" height="6" rx="1"/>
                    <rect x="15" y="15" width="6" height="6" rx="1"/>
                    <path d="M9 6h6"/>
                    <path d="M9 18h6"/>
                    <path d="M6 9v6"/>
                    <path d="M18 9v6"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Tenant Modules</span>
              </a>
            </div>
          </div>

          <!-- Gateway Monitoring Section (visible; may be disabled if route not ready) -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">GATEWAY MONITORING</span>
            </div>
            <div class="nav-items">
          <a routerLink="/monitoring/gateway-status" 
            routerLinkActive="active" 
            class="nav-item"
            title="Gateway Status">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                    <path d="M16.2 7.8l2.8-2.8"/>
                    <path d="M7.8 16.2l-2.8 2.8"/>
                    <path d="M7.8 7.8L5 5"/>
                    <path d="M16.2 16.2L19 19"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Gateway Status</span>
              </a>
            </div>
          </div>

          <!-- System Monitoring Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">SYSTEM MONITORING</span>
            </div>
            <div class="nav-items">
              <a routerLink="/monitoring/system" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="System Overview">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-1.414-.586H13l-2.293-2.293a1 1 0 0 0-1.414 0L7 11.414"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">System Overview</span>
              </a>
              <a routerLink="/monitoring/performance" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Performance Metrics">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3v18h18"/>
                    <path d="m19 9-5 5-4-4-3 3"/>
                    <circle cx="19" cy="9" r="2"/>
                    <circle cx="14" cy="14" r="2"/>
                    <circle cx="10" cy="10" r="2"/>
                    <circle cx="7" cy="13" r="2"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Performance</span>
              </a>
              <a routerLink="/monitoring/logs" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="System Logs">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"/>
                    <path d="M3 12h18"/>
                    <path d="M3 18h18"/>
                    <circle cx="6" cy="6" r="1"/>
                    <circle cx="6" cy="12" r="1"/>
                    <circle cx="6" cy="18" r="1"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">System Logs</span>
              </a>
              <a routerLink="/monitoring/audit" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Audit Trail">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    <path d="M13 12h1"/>
                    <circle cx="12" cy="18" r="3"/>
                    <path d="m15.7 20.7 2.6 2.6"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Audit Trail</span>
              </a>
            </div>
          </div>

          <!-- Audit & Compliance Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">AUDIT & COMPLIANCE</span>
            </div>
            <div class="nav-items">
              <a routerLink="/audit/logs" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Audit Logs">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Audit Logs</span>
              </a>
              <a routerLink="/audit/reports" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Audit Reports">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Reports</span>
              </a>
            </div>
          </div>

          <!-- System Section -->
          <div class="nav-section">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed">
              <span class="section-title">SYSTEM</span>
            </div>
            <div class="nav-items">
              <a routerLink="/analytics" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Analytics">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3v18h18"/>
                    <path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">Analytics</span>
              </a>
              <a routerLink="/copilot" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="AI Copilot">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20"/>
                    <path d="m15 19-3-3-3 3"/>
                    <path d="m19 15 3-3-3-3"/>
                    <path d="m5 9-3 3 3 3"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <span class="nav-text" *ngIf="!sidebarCollapsed">AI Copilot</span>
              </a>
              <a routerLink="/settings" 
                 routerLinkActive="active" 
                 class="nav-item"
                 title="Settings">
                <span class="nav-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            <!-- User Info Section - Fixed Layout -->
            <div class="user-info" *ngIf="!sidebarCollapsed && userProfile">
              <div class="user-avatar">{{userProfile.name?.charAt(0) || '?'}}</div>
              <div class="user-details">
                <div class="user-name">{{userProfile.name}}</div>
                <div class="user-role">Platform Admin</div>
              </div>
            </div>
            
            <!-- Collapsed Avatar Only -->
            <div class="user-avatar-only" *ngIf="sidebarCollapsed && userProfile" 
                 [title]="userProfile.name + ' - Platform Admin'">
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
              <!-- Fixed User Info in Header -->
              <div class="user-info-header" *ngIf="userProfile">
                <div class="user-header-details">
                  <span class="user-name-header">{{userProfile.name}}</span>
                  <span class="user-role-header">Platform Admin</span>
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
    /* === DASHBOARD LAYOUT === */
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
      background-color: #f8fafc;
    }

    /* === SIDEBAR CONTAINER === */
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

    /* === BRAND HEADER === */
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
      color: #002F87;
      font-weight: 700;
      font-size: 18px;
      transition: all 0.2s ease;
    }

    .brand:hover {
      color: #001d5a;
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
      font-weight: 700;
      color: #002F87;
      font-size: 20px;
      letter-spacing: -0.01em;
      transition: opacity 0.2s ease;
    }

    .sidebar.collapsed .brand-text {
      opacity: 0;
      transform: translateX(-10px);
    }

    /* === NAVIGATION MENU === */
    .nav-menu {
      flex: 1;
      padding: 16px 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* === STANDALONE DASHBOARD ITEM === */
    .nav-standalone {
      margin-bottom: 32px;
      padding: 0 16px;
    }

    /* === NAVIGATION SECTIONS === */
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

    /* === NAVIGATION ITEMS === */
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
      color: #002F87;
      transform: translateX(2px);
    }

    .nav-item.active {
      background: linear-gradient(135deg, #002F87 0%, #001d5a 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 47, 135, 0.2);
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: #F2A900;
      border-radius: 0 2px 2px 0;
    }

    /* === NAVIGATION ICONS === */
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

    /* === NAVIGATION TEXT === */
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

    /* === SIDEBAR FOOTER === */
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

    /* === USER INFO SECTION === */
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
      background: linear-gradient(135deg, #002F87 0%, #F2A900 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 47, 135, 0.2);
    }

    .user-avatar-only {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #002F87 0%, #F2A900 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 16px;
      margin: 0 auto;
      box-shadow: 0 2px 8px rgba(0, 47, 135, 0.2);
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
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* === USER ACTIONS === */
    .user-actions {
      display: flex;
      justify-content: center;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      font-weight: 600;
      width: 100%;
      justify-content: center;
    }

    .sidebar.collapsed .logout-btn {
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 50%;
    }

    .logout-btn:hover {
      background-color: #fee2e2;
      border-color: #fecaca;
      color: #dc2626;
    }

    .logout-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logout-icon svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
    }

    .logout-text {
      transition: all 0.2s ease;
    }

    .sidebar.collapsed .logout-text {
      display: none;
    }

    /* === MAIN CONTENT === */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      transition: margin-left 0.3s ease;
    }

    .main-content.sidebar-collapsed {
      margin-left: 0;
    }

    /* === TOP HEADER === */
    .top-header {
      height: 72px;
      background-color: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .sidebar-toggle {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      color: #64748b;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-toggle:hover {
      background-color: #f1f5f9;
      color: #002F87;
    }

    .toggle-icon svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
    }

    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #002F87;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    /* === FIXED USER INFO IN HEADER === */
    .user-info-header {
      display: flex;
      align-items: center;
    }

    .user-header-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .user-name-header {
      font-weight: 600;
      font-size: 15px;
      color: #1e293b;
      line-height: 1.2;
    }

    .user-role-header {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
      line-height: 1.2;
    }

    /* === PAGE CONTENT === */
    .page-content {
      flex: 1;
      padding: 0;
      background-color: #f8fafc;
      overflow-y: auto;
    }

         /* === RESPONSIVE DESIGN === */
     @media (max-width: 768px) {
       .sidebar {
         position: fixed;
         top: 0;
         left: 0;
         height: 100vh;
         z-index: 1000;
         transform: translateX(-100%);
         width: 280px;
       }

       .sidebar:not(.collapsed) {
         transform: translateX(0);
       }

       .main-content {
         width: 100%;
         margin-left: 0;
       }

       .page-title {
         font-size: 20px;
       }

       .user-header-details {
         display: none;
       }

       /* Larger text on mobile for better readability */
       .nav-item {
         font-size: 16px;
         padding: 16px;
         min-height: 52px;
       }

       .nav-icon {
         width: 26px;
         height: 26px;
         margin-right: 18px;
       }

       .nav-icon svg {
         width: 22px;
         height: 22px;
       }

       .section-title {
         font-size: 13px;
       }
     }

    @media (max-width: 480px) {
      .top-header {
        padding: 0 16px;
      }

      .header-left {
        gap: 12px;
      }

      .page-title {
        font-size: 18px;
      }
    }

    /* === SCROLLBAR STYLING === */
    .nav-menu::-webkit-scrollbar {
      width: 4px;
    }

    .nav-menu::-webkit-scrollbar-track {
      background: transparent;
    }

    .nav-menu::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }

    .nav-menu::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* === ACCESSIBILITY IMPROVEMENTS === */
    .nav-item:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .logout-btn:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .sidebar-toggle:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* === ANIMATION CLASSES === */
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .nav-text {
      animation: slideIn 0.2s ease-out;
    }

    /* === DARK MODE SUPPORT (if needed) === */
    @media (prefers-color-scheme: dark) {
      .sidebar {
        background-color: #1e293b;
        border-right-color: #334155;
      }

      .brand,
      .nav-item,
      .user-name {
        color: #f8fafc;
      }

      .section-title,
      .user-role {
        color: #94a3b8;
      }

      .nav-item:hover {
        background-color: #334155;
      }

      .sidebar-footer {
        background-color: #0f172a;
        border-top-color: #334155;
      }

      .top-header {
        background-color: #1e293b;
        border-bottom-color: #334155;
      }

      .page-title,
      .user-name-header {
        color: #f8fafc;
      }
    }
  `]
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  sidebarCollapsed = false;
  userProfile: any = null;

  constructor(
    private authService: EnhancedAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to user profile
    this.authService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  getPageTitle(): string {
    const url = this.router.url;
    
    if (url === '/dashboard') return 'Dashboard';
    if (url.includes('/tenants')) return 'Tenant Management';
    if (url.includes('/users')) return 'User Management';
    if (url.includes('/authentication')) return 'Authentication';
    if (url.includes('/rbac')) return 'Access Control';
    if (url.includes('/audit')) return 'Audit & Compliance';
    if (url.includes('/analytics')) return 'Analytics';
    if (url.includes('/settings')) return 'Settings';
    if (url.includes('/copilot')) return 'AI Copilot';
    if (url.includes('/modules')) return 'Module Management';
    if (url.includes('/monitoring')) return 'Gateway Monitoring';
    
    return 'Primus Framework';
  }

  logout(): void {
    this.authService.logout();
  }
}