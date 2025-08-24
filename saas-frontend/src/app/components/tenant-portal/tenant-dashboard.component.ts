import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { TenantService } from '../../services/tenant.service';
import { TenantAuthService } from '../../services/tenant-auth.service';
import { TenantConfig, TenantContextState } from '../../shared/models/tenant-config.interface';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="tenant-info">
            <h1>{{tenantInfo?.name || 'Tenant Dashboard'}}</h1>
            <p class="tenant-subtitle">{{tenantInfo?.domain}}</p>
          </div>
          <div class="header-actions">
            <span class="status-badge" [class]="'status-' + (tenantInfo?.status || 'active')">
              {{getStatusLabel(tenantInfo?.status)}}
            </span>
            <button class="btn-logout" (click)="logout()">
              <span class="logout-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
              Logout
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation Bar -->
      <div class="navigation-bar">
        <div class="nav-content">
          <nav class="tenant-nav">
            <a [routerLink]="['/tenants', tenantId, 'dashboard']" 
               routerLinkActive="active" 
               [routerLinkActiveOptions]="{exact: true}"
               class="nav-link">
              <span class="nav-icon">🏠</span>
              Dashboard
            </a>
            <a [routerLink]="['/tenants', tenantId, 'users']" 
               routerLinkActive="active"
               class="nav-link">
              <span class="nav-icon">👥</span>
              Users
            </a>
            <a [routerLink]="['/tenants', tenantId, 'analytics']" 
               routerLinkActive="active"
               class="nav-link">
              <span class="nav-icon">📊</span>
              Analytics
            </a>
            <a [routerLink]="['/tenants', tenantId, 'copilot']" 
               routerLinkActive="active"
               class="nav-link">
              <span class="nav-icon">🤖</span>
              AI Copilot
            </a>
            <a [routerLink]="['/tenants', tenantId, 'settings']" 
               routerLinkActive="active"
               class="nav-link">
              <span class="nav-icon">⚙️</span>
              Settings
            </a>
          </nav>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div class="dashboard-content" *ngIf="tenantInfo">
        <!-- Authentication Summary & Token Test -->
        <div class="auth-section">
          <h2>Authentication</h2>
          <div class="auth-card">
            <div class="auth-summary">
              <div class="auth-provider-icon">{{ authSummary.icon }}</div>
              <div class="auth-details">
                <div class="auth-title">{{ authSummary.title }}</div>
                <div class="auth-subtitle">{{ authSummary.subtitle }}</div>
                <div class="auth-meta" *ngIf="authSummary.meta">
                  <span *ngIf="authSummary.meta.clientId"><strong>Client ID:</strong> <span class="mono">{{ authSummary.meta.clientId }}</span></span>
                  <span *ngIf="authSummary.meta.tenant"><strong>Tenant:</strong> {{ authSummary.meta.tenant }}</span>
                </div>
              </div>
              <div class="auth-actions">
                <button class="btn-test-token" *ngIf="canShowTestToken" (click)="startTokenTest()">🔬 Test token</button>
              </div>
            </div>

            <!-- Token Test Panel -->
            <div class="token-panel" *ngIf="tokenTest.visible">
              <div class="panel-row">
                <div class="panel-col">
                  <h3>Result</h3>
                  <div class="result-line" *ngIf="tokenTest.status === 'idle'">Click "Test token" to sign in and inspect the token.</div>
                  <div class="result-line" *ngIf="tokenTest.status === 'authenticating'">Authenticating...</div>
                  <div class="result-line success" *ngIf="tokenTest.status === 'ready'">Token acquired</div>
                  <div class="result-line error" *ngIf="tokenTest.status === 'error'">{{ tokenTest.error }}</div>

                  <!-- Paste token (Auth0/manual fallback) -->
                  <div class="paste-token" *ngIf="tokenTest.allowPaste">
                    <label>Paste JWT (header.payload.signature)</label>
                    <textarea [(ngModel)]="tokenTest.pasted" rows="4" placeholder="eyJhbGciOi..."></textarea>
                    <div class="paste-actions">
                      <button class="btn-secondary" (click)="decodePasted()">Decode</button>
                      <button class="btn-secondary" (click)="openAuth0Popup()" *ngIf="authSummary.provider==='auth0'">Open Auth0 login</button>
                    </div>
                  </div>
                </div>
                <div class="panel-col">
                  <h3>Claims</h3>
                  <div class="claims-grid" *ngIf="tokenTest.claims">
                    <div><label>sub</label><span>{{ tokenTest.claims.sub || '—' }}</span></div>
                    <div><label>tid</label><span>{{ tokenTest.claims.tid || tokenTest.claims.tenant || '—' }}</span></div>
                    <div><label>roles</label><span>{{ (tokenTest.roles || []).join(', ') || '—' }}</span></div>
                  </div>
                  <details *ngIf="tokenTest.claims">
                    <summary>Full claims JSON</summary>
                    <pre>{{ tokenTest.claims | json }}</pre>
                  </details>
                </div>
              </div>
              <div class="panel-row" *ngIf="tokenTest.token">
                <div class="panel-col">
                  <h3>Validation</h3>
                  <div class="validation-line" *ngIf="tokenTest.validation?.checked">
                    <span [class.success]="tokenTest.validation?.valid" [class.error]="!tokenTest.validation?.valid">
                      {{ tokenTest.validation?.valid ? 'Issuer/Audience validated by backend' : 'Validation failed' }}
                    </span>
                    <span class="muted" *ngIf="!tokenTest.validation?.backendAvailable">(client-only check)</span>
                  </div>
                  <button class="btn-secondary" (click)="validateWithBackend()" [disabled]="tokenTest.status!=='ready' && !tokenTest.claims">Verify with backend</button>
                </div>
                <div class="panel-col">
                  <h3>Token</h3>
                  <details>
                    <summary>Show raw token</summary>
                    <pre class="mono small">{{ tokenTest.token }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Overview Cards -->
        <div class="overview-section">
          <h2>Overview</h2>
          <div class="cards-grid">
            <div class="metric-card">
              <div class="metric-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="metric-content">
                <h3>{{tenantInfo.estimatedUsers || 0}}</h3>
                <p>Estimated Users</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="metric-content">
                <h3>{{tenantInfo.authType || 'JWT'}}</h3>
                <p>Authentication</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-1.414-.586H14l-2.5-2.5"/>
                  <path d="m14 14 2.5 2.5"/>
                </svg>
              </div>
              <div class="metric-content">
                <h3>{{getDaysSinceCreation()}} days</h3>
                <p>Since Creation</p>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div class="metric-content">
                <h3>{{getLastLoginTime()}}</h3>
                <p>Last Login</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <button class="action-card" (click)="openApiDocs()">
              <div class="action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <div class="action-content">
                <h3>API Documentation</h3>
                <p>View integration guides and API reference</p>
              </div>
            </button>
            <button class="action-card" (click)="viewCredentials()">
              <div class="action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="action-content">
                <h3>API Credentials</h3>
                <p>Manage your API keys and tokens</p>
              </div>
            </button>
            <button class="action-card" (click)="manageUsers()">
              <div class="action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="action-content">
                <h3>User Management</h3>
                <p>Manage tenant users and permissions</p>
              </div>
            </button>
            <button class="action-card" (click)="viewAnalytics()">
              <div class="action-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div class="action-content">
                <h3>Analytics</h3>
                <p>View usage statistics and reports</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Tenant Information -->
        <div class="tenant-details-section">
          <h2>Tenant Details</h2>
          <div class="details-card">
            <div class="details-grid">
              <div class="detail-item">
                <label>Tenant ID:</label>
                <span class="detail-value">{{tenantInfo.id}}</span>
                <button class="copy-btn" (click)="copyToClipboard(tenantInfo.id)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <div class="detail-item">
                <label>API Key:</label>
                <span class="detail-value" [class.masked]="!showApiKey">
                  {{showApiKey ? tenantInfo.credentials?.apiKey : maskApiKey(tenantInfo.credentials?.apiKey)}}
                </span>
                <button class="toggle-btn" (click)="toggleApiKey()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" *ngIf="!showApiKey"/>
                    <circle cx="12" cy="12" r="3" *ngIf="!showApiKey"/>
                    <path d="m1 1 22 22" *ngIf="showApiKey"/>
                    <path d="M6.71277 6.7226C3.66479 8.79527 2 12 2 12s3 7 10 7c1.59273 0 3.04905-.544 4.2846-1.4046m-1.925-5.6954c.028-.1686.0454-.3982.0454-.6364C14.4054 9.60364 13.3918 8.59 12 8.59c-.2382 0-.4678.01736-.6364.04542M3 3l18 18" *ngIf="showApiKey"/>
                  </svg>
                </button>
                <button class="copy-btn" (click)="copyToClipboard(tenantInfo.credentials?.apiKey)" *ngIf="showApiKey">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <div class="detail-item">
                <label>Client ID:</label>
                <span class="detail-value">{{tenantInfo.credentials?.clientId}}</span>
                <button class="copy-btn" (click)="copyToClipboard(tenantInfo.credentials?.clientId)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span class="detail-value">{{formatDate(tenantInfo.createdAt)}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Modules -->
        <div class="modules-section" *ngIf="tenantInfo.selectedModules?.length">
          <h2>Active Modules</h2>
          <div class="modules-grid">
            <div class="module-card" *ngFor="let module of tenantInfo.selectedModules">
              <div class="module-icon">{{getModuleIcon(module)}}</div>
              <div class="module-content">
                <h3>{{getModuleName(module)}}</h3>
                <p>{{getModuleDescription(module)}}</p>
                <span class="module-status">Active</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="activity-section">
          <h2>Recent Activity</h2>
          <div class="activity-card">
            <div class="activity-item">
              <div class="activity-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m9 12 2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div class="activity-content">
                <p><strong>Tenant Created</strong></p>
                <p class="activity-time">{{formatDate(tenantInfo.createdAt)}}</p>
              </div>
            </div>
            <div class="activity-item" *ngIf="tenantInfo.emailSent">
              <div class="activity-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div class="activity-content">
                <p><strong>Welcome Email Sent</strong></p>
                <p class="activity-time">{{formatDate(tenantInfo.emailSent.timestamp)}}</p>
              </div>
            </div>
            <div class="activity-item" *ngIf="tenantInfo.consentStatus === 'consented'">
              <div class="activity-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="activity-content">
                <p><strong>Azure AD Registration Completed</strong></p>
                <p class="activity-time">Today</p>
              </div>
            </div>
            <div class="activity-item" *ngIf="tenantInfo.lastLoginAt">
              <div class="activity-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="activity-content">
                <p><strong>Last Login</strong></p>
                <p class="activity-time">{{formatDate(tenantInfo.lastLoginAt)}}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <p>Loading tenant dashboard...</p>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="errorMessage">
        <div class="error-content">
          <h2>Unable to Load Dashboard</h2>
          <p>{{errorMessage}}</p>
          <button class="btn-retry" (click)="loadTenantInfo()">Try Again</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f8f9fa;
      padding: 0;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .navigation-bar {
      background: white;
      border-bottom: 1px solid #e0e0e0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .nav-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .tenant-nav {
      display: flex;
      gap: 0;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      text-decoration: none;
      color: #666;
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .nav-link:hover {
      color: #333;
      background: #f8f9fa;
    }

    .nav-link.active {
      color: #667eea;
      border-bottom-color: #667eea;
      background: #f8f9ff;
    }

    .nav-icon {
      font-size: 1.1rem;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tenant-info h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .tenant-subtitle {
      margin: 0.5rem 0 0 0;
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.status-active,
    .status-badge.status-azure_registered {
      background: rgba(40, 167, 69, 0.2);
      color: #28a745;
      border: 1px solid rgba(40, 167, 69, 0.3);
    }

    .status-badge.status-registering,
    .status-badge.status-pending {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
      border: 1px solid rgba(255, 193, 7, 0.3);
    }

    .btn-logout {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .overview-section,
    .actions-section,
    .tenant-details-section,
    .modules-section,
    .activity-section {
      margin-bottom: 3rem;
    }

    .overview-section h2,
    .actions-section h2,
    .tenant-details-section h2,
    .modules-section h2,
    .activity-section h2 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
    }

    .metric-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      flex-shrink: 0;
    }

    .metric-icon svg {
      color: #667eea;
    }

    .metric-content h3 {
      margin: 0;
      font-size: 1.8rem;
      color: #2c3e50;
      font-weight: 700;
    }

    .metric-content p {
      margin: 0.25rem 0 0 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .action-card {
      background: white;
      border: none;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      border-radius: 8px;
      width: 50px;
      height: 50px;
      flex-shrink: 0;
    }

    .action-icon svg {
      color: #667eea;
    }

    .action-content h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .action-content p {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .details-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-item label {
      font-weight: 600;
      color: #495057;
      min-width: 100px;
    }

    .detail-value {
      flex: 1;
      font-family: 'Courier New', monospace;
      color: #2c3e50;
      background: white;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }

    .detail-value.masked {
      color: #6c757d;
    }

    .copy-btn,
    .toggle-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .copy-btn svg,
    .toggle-btn svg {
      color: white;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .module-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .module-icon {
      font-size: 2rem;
      background: #e8f5e8;
      border-radius: 8px;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .module-content {
      flex: 1;
    }

    .module-content h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .module-content p {
      margin: 0 0 1rem 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .module-status {
      background: #28a745;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .activity-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid #e9ecef;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .activity-icon svg {
      color: #667eea;
    }

    .activity-content p {
      margin: 0;
    }

    .activity-content p:first-child {
      color: #2c3e50;
      font-weight: 500;
    }

    .activity-time {
      color: #6c757d;
      font-size: 0.9rem;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-content h2 {
      color: #dc3545;
      margin-bottom: 1rem;
    }

    .btn-retry {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
    }

    .btn-retry:hover {
      background: #0056b3;
    }
  `]
})
export class TenantDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tenantId: string = '';
  tenantConfig: TenantConfig | null = null;
  tenantContextState: TenantContextState | null = null;
  currentUser: any = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  showApiKey: boolean = false;
  // Auth summary + token test state
  authSummary: { provider: 'azuread'|'auth0'|'jwt'|'unknown', icon: string, title: string, subtitle: string, meta?: any } = {
    provider: 'unknown', icon: '🔒', title: 'Authentication', subtitle: 'Not configured'
  };
  canShowTestToken = false;
  tokenTest: any = {
    visible: false,
    status: 'idle',
    error: '',
    token: '',
    claims: null,
    roles: [],
    allowPaste: false,
    pasted: '',
    validation: { checked: false, backendAvailable: false, valid: false }
  };

  // Legacy support for existing template
  tenantInfo: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private tenantService: TenantService,
  private tenantAuthService: TenantAuthService,
  private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.paramMap.get('tenantId') || '';
    
    if (environment.features?.enableDebugLogs) {
      console.log(`📊 [TenantDashboard] Initializing for tenant: ${this.tenantId}`);
    }
    
    this.initializeTenantContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTenantContext(): void {
    // Subscribe to tenant context updates
    this.tenantService.getTenantContext()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contextState) => {
          this.tenantContextState = contextState;
          
          if (contextState.isLoaded && contextState.tenantConfig) {
            this.tenantConfig = contextState.tenantConfig;
            this.updateLegacyTenantInfo(contextState.tenantConfig);
            this.updateAuthSummary(contextState.tenantConfig);
            
            if (environment.features?.enableDebugLogs) {
              console.log(`📊 [TenantDashboard] Tenant context loaded:`, contextState.tenantConfig);
            }
          }
          
          if (contextState.error) {
            this.errorMessage = contextState.error;
          }
          
          this.isLoading = !contextState.isLoaded;
        },
        error: (error) => {
          console.error('❌ [TenantDashboard] Error loading tenant context:', error);
          this.errorMessage = 'Failed to load tenant information.';
          this.isLoading = false;
        }
      });

    // Get authenticated user info
    this.tenantAuthService.getCurrentUser(this.tenantId).then(user => {
      this.currentUser = user;
    }).catch(error => {
      console.error('Error getting current user:', error);
    });
    
    // Load tenant configuration if not already loaded
    if (!this.tenantService.getCurrentTenant()) {
      this.loadTenantInfo();
    }
  }

  private updateLegacyTenantInfo(tenantConfig: TenantConfig): void {
    // Update legacy tenantInfo for compatibility with existing template
    this.tenantInfo = {
      name: tenantConfig.companyName,
      domain: tenantConfig.domain,
      status: tenantConfig.status,
      tenantId: tenantConfig.tenantId,
      azureAd: tenantConfig.azureAd,
      estimatedUsers: 0, // Would come from API
      apiKey: 'sk-' + tenantConfig.tenantId.replace(/-/g, '').substring(0, 16) + '...',
      modules: ['userManagement', 'analytics', 'auditLogs', 'notifications', 'aiCopilot', 'rbac', 'multiTenancy'],
      createdAt: tenantConfig.createdAt
    };
  }

  private updateAuthSummary(cfg: TenantConfig): void {
    // Determine provider from tenant config or legacy info
    let provider: 'azuread'|'auth0'|'jwt'|'unknown' = 'unknown';
    if (cfg.azureAd?.clientId) provider = 'azuread';
    else if ((this.tenantInfo?.authType || '').toLowerCase() === 'auth0') provider = 'auth0';
    else if ((this.tenantInfo?.authType || '').toLowerCase() === 'jwt') provider = 'jwt';

    switch (provider) {
      case 'azuread':
        this.authSummary = {
          provider,
          icon: '🟦',
          title: 'Azure Active Directory',
          subtitle: 'Enterprise SSO (read-only)',
          meta: { clientId: cfg.azureAd.clientId, tenant: cfg.azureAd.tenantId || 'organizations' }
        };
        break;
      case 'auth0':
        this.authSummary = {
          provider,
          icon: '🟧',
          title: 'Auth0',
          subtitle: 'OIDC with PKCE (read-only)',
          meta: { clientId: this.tenantInfo?.credentials?.clientId }
        };
        break;
      case 'jwt':
        this.authSummary = {
          provider,
          icon: '🟪',
          title: 'JWT (email/password)',
          subtitle: 'Direct token (read-only)'
        };
        break;
      default:
        this.authSummary = { provider: 'unknown', icon: '🔒', title: 'Authentication', subtitle: 'Not configured' };
    }

    // Show test only if configured
    this.canShowTestToken = provider !== 'unknown';
  }

  async loadTenantInfo(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';

      // Load tenant config using new service
      const tenantConfig = await this.tenantService.loadTenantConfig(this.tenantId);
      
      if (environment.features?.enableDebugLogs) {
        console.log(`📊 [TenantDashboard] Tenant info loaded:`, tenantConfig);
      }

    } catch (error: any) {
      console.error('❌ [TenantDashboard] Error loading tenant info:', error);
      this.errorMessage = error.message || 'Failed to load tenant information.';
      this.isLoading = false;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'azure_registered': return 'Azure AD Ready';
      case 'registering': return 'Registering';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  }

  getDaysSinceCreation(): number {
    if (!this.tenantInfo?.createdAt) return 0;
    const created = new Date(this.tenantInfo.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getLastLoginTime(): string {
    if (!this.tenantInfo?.lastLoginAt) return 'Never';
    const lastLogin = new Date(this.tenantInfo.lastLoginAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getModuleIcon(module: string): string {
    const icons: { [key: string]: string } = {
      'userManagement': '👥',
      'analytics': '📊',
      'auditLogs': '📝',
      'notifications': '🔔',
      'aiCopilot': '🤖',
      'rbac': '🔐',
      'multiTenancy': '🏢'
    };
    return icons[module] || '📦';
  }

  getModuleName(module: string): string {
    const names: { [key: string]: string } = {
      'userManagement': 'User Management',
      'analytics': 'Analytics',
      'auditLogs': 'Audit Logs',
      'notifications': 'Notifications',
      'aiCopilot': 'AI Copilot',
      'rbac': 'RBAC',
      'multiTenancy': 'Multi-Tenancy'
    };
    return names[module] || module;
  }

  getModuleDescription(module: string): string {
    const descriptions: { [key: string]: string } = {
      'userManagement': 'Manage users, roles, and permissions',
      'analytics': 'Track usage and performance metrics',
      'auditLogs': 'Complete audit trail and compliance',
      'notifications': 'Multi-channel notification system',
      'aiCopilot': 'AI-powered assistance and automation',
      'rbac': 'Role-based access control',
      'multiTenancy': 'Multi-tenant data isolation'
    };
    return descriptions[module] || 'Module functionality';
  }

  maskApiKey(apiKey?: string): string {
    if (!apiKey) return '';
    return apiKey.substring(0, 8) + '••••••••••••••••' + apiKey.substring(apiKey.length - 4);
  }

  toggleApiKey(): void {
    this.showApiKey = !this.showApiKey;
  }

  copyToClipboard(text?: string): void {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('✅ Copied to clipboard:', text.substring(0, 20) + '...');
      });
    }
  }

  openApiDocs(): void {
    this.router.navigate(['/docs']);
  }

  viewCredentials(): void {
    alert('Credentials section - this would show detailed API key management');
  }

  manageUsers(): void {
    this.router.navigate(['/tenants', this.tenantId, 'users']);
  }

  viewAnalytics(): void {
    this.router.navigate(['/tenants', this.tenantId, 'analytics']);
  }

  viewSettings(): void {
    this.router.navigate(['/tenants', this.tenantId, 'settings']);
  }

  openCopilot(): void {
    this.router.navigate(['/tenants', this.tenantId, 'copilot']);
  }

  // ===== Token Test =====
  async startTokenTest(): Promise<void> {
    this.tokenTest.visible = true;
    this.tokenTest.status = 'authenticating';
    this.tokenTest.error = '';
    this.tokenTest.token = '';
    this.tokenTest.claims = null;
    this.tokenTest.roles = [];
    this.tokenTest.validation = { checked: false, backendAvailable: false, valid: false };

    const provider = this.authSummary.provider;
    try {
      if (provider === 'azuread') {
        // Ensure MSAL and do popup login
        const cfg = this.tenantConfig!;
        await this.tenantAuthService.ensureInitializedAndProcessRedirect(cfg);
        const msal = this.tenantAuthService.getTenantMsalInstance(cfg.tenantId);
        if (!msal) throw new Error('MSAL not initialized');
        const loginResp = await msal.loginPopup({ scopes: ['openid', 'profile', 'User.Read'] });
        const idToken = loginResp.idToken;
        this.applyDecodedToken(idToken);
      } else if (provider === 'auth0') {
        // Fallback to paste flow by default
        this.tokenTest.allowPaste = true;
        this.tokenTest.status = 'idle';
      } else if (provider === 'jwt') {
        // No interactive flow; require paste
        this.tokenTest.allowPaste = true;
        this.tokenTest.status = 'idle';
      } else {
        throw new Error('Authentication is not configured for this tenant');
      }
    } catch (e: any) {
      this.tokenTest.status = 'error';
      this.tokenTest.error = e?.message || String(e);
    }
  }

  decodePasted(): void {
    const t = (this.tokenTest.pasted || '').trim();
    if (!t || t.split('.').length !== 3) {
      this.tokenTest.error = 'Please paste a valid JWT.';
      this.tokenTest.status = 'error';
      return;
    }
    this.applyDecodedToken(t);
  }

  private applyDecodedToken(token: string): void {
    try {
      const parts = token.split('.');
      const claims = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const roles: string[] = [];
      const maybe = [claims.roles, claims.groups, claims.extension_roles, claims.extension_Role, claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']];
      maybe.forEach((v: any) => {
        if (Array.isArray(v)) v.forEach((r: any) => roles.push(String(r)));
        else if (typeof v === 'string') roles.push(v);
      });
      this.tokenTest.token = token;
      this.tokenTest.claims = claims;
      this.tokenTest.roles = Array.from(new Set(roles));
      this.tokenTest.status = 'ready';
      this.tokenTest.error = '';
    } catch (e: any) {
      this.tokenTest.status = 'error';
      this.tokenTest.error = 'Failed to decode token.';
    }
  }

  async openAuth0Popup(): Promise<void> {
    try {
      const body = { tenantId: this.tenantId, redirectUri: `${window.location.origin}/tenants/${this.tenantId}/auth/callback`, state: 'token-test' };
      const resp: any = await this.http.post('/api/auth/tenant/authorize', body).toPromise();
      if (resp?.authorizationUrl) {
        window.open(resp.authorizationUrl, '_blank');
      } else {
        this.tokenTest.error = 'Unable to get Auth0 authorization URL. Paste a token instead.';
      }
    } catch {
      this.tokenTest.error = 'Auth0 popup not available. Paste a token instead.';
    }
  }

  async validateWithBackend(): Promise<void> {
    if (!this.tokenTest.token) return;
    try {
  const payload = { token: this.tokenTest.token, tenantId: this.tenantId };
  const resp: any = await this.api.validateToken(payload).toPromise();
      this.tokenTest.validation = { checked: true, backendAvailable: true, valid: !!resp?.valid };
    } catch (e: any) {
      const status = e?.status || 0;
      if (status === 404) {
        this.tokenTest.validation = { checked: true, backendAvailable: false, valid: false };
      } else {
        this.tokenTest.validation = { checked: true, backendAvailable: true, valid: false };
      }
    }
  }

  async logout(): Promise<void> {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      try {
        if (environment.features?.enableDebugLogs) {
          console.log(`🚪 [TenantDashboard] Logging out from tenant: ${this.tenantId}`);
        }
        
        // Logout using tenant auth service
        await this.tenantAuthService.logout(this.tenantId);
        
        // Clear tenant context
        this.tenantService.clearTenantContext();
        
        // Navigate back to platform login
        this.router.navigate(['/']);
        
      } catch (error) {
        console.error('❌ [TenantDashboard] Logout error:', error);
        // Fallback: navigate anyway
        this.router.navigate(['/']);
      }
    }
  }
}