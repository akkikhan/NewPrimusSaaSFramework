import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';

interface TenantAuthConfig {
  tenantId: string;
  tenantName: string;
  authType: 'jwt' | 'auth0' | 'azuread';
  authConfig: any;
  isActive: boolean;
}

@Component({
  selector: 'app-tenant-auth-provider',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="tenant-auth-container">
      <div class="tenant-auth-card">
        <!-- Tenant Header -->
        <div class="tenant-header">
          <div class="tenant-logo">
            <div class="logo-icon">🏢</div>
            <div class="tenant-info">
              <h1>{{tenantConfig?.tenantName || tenantId}}</h1>
              <p class="tenant-subtitle">Customer Portal</p>
            </div>
          </div>
          <div class="powered-by">
            <span>Powered by</span>
            <div class="saasfactory-logo">
              <span class="factory-icon">🏭</span>
              <span>SaaS Factory</span>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div class="auth-content" *ngIf="isLoading">
          <div class="loading-section">
            <div class="loading-spinner"></div>
            <h2>Loading Authentication...</h2>
            <p>Determining available login methods for your organization...</p>
          </div>
        </div>

        <!-- Error State -->
        <div class="auth-content" *ngIf="error && !isLoading">
          <div class="error-section">
            <div class="error-icon">⚠️</div>
            <h2>Authentication Error</h2>
            <p class="error-message">{{error}}</p>
            <button class="btn-retry" (click)="loadTenantConfig()">
              🔄 Try Again
            </button>
          </div>
        </div>

        <!-- Authentication Summary (Read-only) -->
        <div class="auth-content" *ngIf="tenantConfig && !isLoading && !error">
          <div class="provider-info" [ngClass]="{
              'azuread-info': tenantConfig.authType==='azuread',
              'auth0-info': tenantConfig.authType==='auth0'
            }">
            <div class="provider-icon">{{ getProviderIcon(tenantConfig.authType) }}</div>
            <div class="provider-details">
              <h3>{{ getProviderTitle(tenantConfig.authType) }}</h3>
              <p>{{ getProviderSubtitle(tenantConfig.authType) }}</p>
              <div class="provider-meta" *ngIf="providerMeta">
                <div *ngIf="providerMeta.clientId"><strong>Client ID:</strong> <span class="mono">{{providerMeta.clientId}}</span></div>
                <div *ngIf="providerMeta.tenant"><strong>Tenant:</strong> {{providerMeta.tenant}}</div>
              </div>
            </div>
          </div>
          <div class="auth-message" *ngIf="authMessage">
            <span class="message-icon">ℹ️</span>
            <span>{{authMessage}}</span>
          </div>
          <div class="note">Authentication provider is managed by your administrator and cannot be changed here.</div>
        </div>

        <!-- Support Section -->
        <div class="support-section" *ngIf="!isLoading">
          <div class="support-links">
            <a href="#" class="support-link">Contact Support</a>
            <span class="separator">|</span>
            <a [routerLink]="['/login']" class="support-link">Platform Admin Login</a>
          </div>
        </div>

        <!-- Footer -->
        <div class="tenant-footer">
          <p>&copy; 2024 {{tenantConfig?.tenantName || 'Organization'}}. All rights reserved.</p>
          <p class="powered-footer">Powered by SaaS Factory Platform</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .tenant-auth-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tenant-header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .tenant-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .logo-icon {
      font-size: 2.5rem;
    }

    .tenant-info h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .tenant-subtitle {
      margin: 0.5rem 0 0 0;
      opacity: 0.9;
      font-size: 0.95rem;
    }

    .powered-by {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      opacity: 0.8;
    }

    .saasfactory-logo {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .factory-icon {
      font-size: 1rem;
    }

    .auth-content {
      padding: 2.5rem;
    }

    .loading-section, .error-section {
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(102, 126, 234, 0.2);
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-section h2, .error-section h2 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }

    .loading-section p, .error-section p {
      color: #7f8c8d;
      margin: 0 0 1.5rem 0;
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .error-message {
      color: #e74c3c !important;
      font-weight: 500;
    }

    .btn-retry {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-retry:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }

    .auth-method h2 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.8rem;
      text-align: center;
    }

    .auth-description {
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      color: #2c3e50;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .form-control {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 12px;
      margin-bottom: 2rem;
      border-left: 4px solid;
    }

    .auth0-info {
      border-left-color: #eb5424;
    }

    .azuread-info {
      border-left-color: #0078d4;
    }

    .provider-icon {
      font-size: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .provider-details h3 {
      margin: 0 0 0.25rem 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .provider-details p {
      margin: 0;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .btn-auth {
      width: 100%;
      padding: 1rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .jwt-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .jwt-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .auth0-btn {
      background: linear-gradient(135deg, #eb5424, #d4461c);
      color: white;
    }

    .auth0-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(235, 84, 36, 0.3);
    }

    .azuread-btn {
      background: linear-gradient(135deg, #0078d4, #106ebe);
      color: white;
    }

    .azuread-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 120, 212, 0.3);
    }

    .btn-auth:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .auth-icon {
      font-size: 1.2rem;
    }

    .auth-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      background: #e8f5e8;
      border: 1px solid #c3e6c3;
      color: #2d5a2d;
    }

    .auth-message.error {
      background: #ffebee;
      border-color: #ffcdd2;
      color: #c62828;
    }

    .message-icon {
      font-size: 1.2rem;
    }

    .support-section {
      padding: 1.5rem 2.5rem;
      border-top: 1px solid #ecf0f1;
    }

    .support-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 0.9rem;
    }

    .support-link {
      color: #667eea;
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .support-link:hover {
      color: #5a67d8;
      text-decoration: underline;
    }

    .separator {
      color: #bdc3c7;
    }

    .tenant-footer {
      background: #f8f9fa;
      padding: 1.5rem 2.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: #95a5a6;
    }

    .tenant-footer p {
      margin: 0.25rem 0;
    }

    .powered-footer {
      font-style: italic;
    }

    @media (max-width: 768px) {
      .tenant-auth-container { padding: 1rem; }
      .auth-content { padding: 2rem; }
      .support-section { padding: 1.5rem 2rem; }
      .tenant-footer { padding: 1.5rem 2rem; }
    }
  `]
})
export class TenantAuthProviderComponent implements OnInit, OnDestroy {
  tenantId: string = '';
  tenantConfig: TenantAuthConfig | null = null;
  isLoading = true;
  error: string | null = null;
  isAuthenticating = false;
  authMessage: string | null = null;
  providerMeta: any = null;

  // JWT credentials
  jwtCredentials = {
    email: '',
    password: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.tenantId = params['tenantId'];
        if (this.tenantId) {
          this.loadTenantConfig();
        } else {
          this.error = 'No tenant ID provided';
          this.isLoading = false;
        }
      });

    // Pre-fill email from query parameters
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(queryParams => {
        if (queryParams['email']) {
          this.jwtCredentials.email = queryParams['email'];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadTenantConfig(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      console.log(`🔍 Loading auth config for tenant: ${this.tenantId}`);

      // Load tenant auth configuration via centralized ApiService (proxied, relative /api)
      const config = await this.apiService.getTenantAuthConfig(this.tenantId).toPromise();
      if (config) {
        this.tenantConfig = config as any;
        console.log(`✅ Loaded tenant config:`, config);
      } else {
        throw new Error('No authentication configuration found for this tenant');
      }

      // Build provider meta for read-only display
      if (this.tenantConfig) {
        if (this.tenantConfig.authType === 'azuread') {
          this.providerMeta = {
            clientId: (this.tenantConfig as any).authConfig?.clientId,
            tenant: (this.tenantConfig as any).authConfig?.tenantId || 'organizations'
          };
        } else if (this.tenantConfig.authType === 'auth0') {
          this.providerMeta = {
            clientId: (this.tenantConfig as any).authConfig?.clientId
          };
        } else {
          this.providerMeta = {};
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading tenant config:', error);
      this.error = error?.error?.message || error?.message || 'Failed to load authentication configuration';
    } finally {
      this.isLoading = false;
    }
  }

  // Removed provider selection and direct login actions; this page is now read-only summary only.
  // Helper methods for provider display
  getProviderIcon(type: TenantAuthConfig['authType']): string {
    switch (type) {
      case 'azuread': return '🟦';
      case 'auth0': return '🟧';
      case 'jwt': return '🟪';
      default: return '🔒';
    }
  }

  getProviderTitle(type: TenantAuthConfig['authType']): string {
    switch (type) {
      case 'azuread': return 'Azure Active Directory';
      case 'auth0': return 'Auth0';
      case 'jwt': return 'JWT (email/password)';
      default: return 'Authentication';
    }
  }

  getProviderSubtitle(type: TenantAuthConfig['authType']): string {
    switch (type) {
      case 'azuread': return 'Enterprise SSO (read-only)';
      case 'auth0': return 'OIDC with PKCE (read-only)';
      case 'jwt': return 'Direct token (read-only)';
      default: return 'Not configured';
    }
  }
} 