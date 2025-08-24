import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface TenantAuthConfiguration {
  tenantId: string;
  tenantName: string;
  authType: 'jwt' | 'auth0' | 'azuread';
  isActive: boolean;
  authConfig: {
    jwt?: any;
    auth0?: {
      domain: string;
      clientId: string;
      clientSecret: string;
      audience: string;
      callbackUrls: string[];
      logoutUrls: string[];
      connectionName?: string;
      scopes: string[];
    };
    azuread?: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
      authority: string;
      redirectUri: string;
      scopes: string[];
    };
  };
  lastUpdated?: string;
  updatedBy?: string;
}

@Component({
  selector: 'app-tenant-auth-config',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-config-container">
      <div class="page-header">
        <div class="header-content">
          <h1>🔐 Authentication Configuration</h1>
          <p>Configure authentication providers for tenant: <strong>{{tenantId}}</strong></p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" [routerLink]="['/admin/tenants']">
            ← Back to Tenants
          </button>
          <button class="btn-primary" (click)="saveConfiguration()" [disabled]="isSaving || !configForm.valid">
            {{isSaving ? 'Saving...' : 'Save Configuration'}}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-section">
        <div class="loading-spinner"></div>
        <p>Loading authentication configuration...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !isLoading" class="error-section">
        <div class="error-icon">⚠️</div>
        <h3>Configuration Error</h3>
        <p>{{error}}</p>
        <button class="btn-retry" (click)="loadConfiguration()">🔄 Retry</button>
      </div>

      <!-- Configuration Form -->
      <div *ngIf="!isLoading && !error" class="config-content">
        <form [formGroup]="configForm" class="auth-config-form">
          
          <!-- Provider Selection -->
          <div class="config-section">
            <h2>🔧 Authentication Provider</h2>
            <p class="section-description">
              Choose how users will authenticate when accessing this tenant portal.
            </p>

            <div class="provider-selection">
              <div class="provider-option" 
                   [class.selected]="configForm.get('authType')?.value === 'jwt'"
                   (click)="selectAuthType('jwt')">
                <div class="provider-header">
                  <span class="provider-icon">🔐</span>
                  <div class="provider-info">
                    <h3>Username & Password (JWT)</h3>
                    <p>Traditional email/password authentication with JWT tokens</p>
                  </div>
                  <span class="selection-indicator" *ngIf="configForm.get('authType')?.value === 'jwt'">✓</span>
                </div>
                <div class="provider-features">
                  <span class="feature">✓ Built-in user management</span>
                  <span class="feature">✓ Password policies</span>
                  <span class="feature">✓ No external dependencies</span>
                </div>
              </div>

              <div class="provider-option" 
                   [class.selected]="configForm.get('authType')?.value === 'auth0'"
                   (click)="selectAuthType('auth0')">
                <div class="provider-header">
                  <span class="provider-icon">🚀</span>
                  <div class="provider-info">
                    <h3>Auth0 Single Sign-On</h3>
                    <p>Flexible authentication and authorization platform</p>
                  </div>
                  <span class="selection-indicator" *ngIf="configForm.get('authType')?.value === 'auth0'">✓</span>
                </div>
                <div class="provider-features">
                  <span class="feature">✓ Social login providers</span>
                  <span class="feature">✓ Multi-factor authentication</span>
                  <span class="feature">✓ Advanced security features</span>
                </div>
              </div>

              <div class="provider-option" 
                   [class.selected]="configForm.get('authType')?.value === 'azuread'"
                   (click)="selectAuthType('azuread')">
                <div class="provider-header">
                  <span class="provider-icon">🏢</span>
                  <div class="provider-info">
                    <h3>Azure Active Directory</h3>
                    <p>Enterprise-grade authentication with Microsoft accounts</p>
                  </div>
                  <span class="selection-indicator" *ngIf="configForm.get('authType')?.value === 'azuread'">✓</span>
                </div>
                <div class="provider-features">
                  <span class="feature">✓ Enterprise SSO</span>
                  <span class="feature">✓ Advanced conditional access</span>
                  <span class="feature">✓ Seamless Office 365 integration</span>
                </div>
              </div>
            </div>
          </div>

          <!-- JWT Configuration -->
          <div *ngIf="configForm.get('authType')?.value === 'jwt'" class="config-section">
            <h2>🔐 JWT Configuration</h2>
            <div class="jwt-config">
              <div class="info-card">
                <div class="info-icon">ℹ️</div>
                <div class="info-content">
                  <h4>JWT Authentication Setup</h4>
                  <p>JWT (JSON Web Token) authentication is ready to use out of the box. Users will login with email and password, and receive secure JWT tokens for session management.</p>
                  <ul>
                    <li>Users can be created via the admin panel</li>
                    <li>Password policies are enforced automatically</li>
                    <li>Sessions expire based on token configuration</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Auth0 Configuration -->
          <div *ngIf="configForm.get('authType')?.value === 'auth0'" class="config-section">
            <h2>🚀 Auth0 Configuration</h2>
            <div class="auth0-config" formGroupName="auth0Config">
              <div class="form-grid">
                <div class="form-group">
                  <label for="auth0Domain">Auth0 Domain *</label>
                  <input type="text" id="auth0Domain" formControlName="domain" 
                         class="form-control" placeholder="your-tenant.auth0.com">
                  <small class="form-hint">Your Auth0 tenant domain (without https://)</small>
                </div>

                <div class="form-group">
                  <label for="auth0ClientId">Client ID *</label>
                  <input type="text" id="auth0ClientId" formControlName="clientId" 
                         class="form-control" placeholder="Your Auth0 application client ID">
                </div>

                <div class="form-group">
                  <label for="auth0ClientSecret">Client Secret *</label>
                  <input type="password" id="auth0ClientSecret" formControlName="clientSecret" 
                         class="form-control" placeholder="Your Auth0 application client secret">
                  <small class="form-hint">Keep this secure - it will be encrypted when saved</small>
                </div>

                <div class="form-group">
                  <label for="auth0Audience">Audience (API Identifier)</label>
                  <input type="text" id="auth0Audience" formControlName="audience" 
                         class="form-control" placeholder="https://your-api.auth0.com">
                </div>

                <div class="form-group full-width">
                  <label for="auth0Scopes">Requested Scopes</label>
                  <input type="text" id="auth0Scopes" formControlName="scopesText" 
                         class="form-control" placeholder="openid profile email">
                  <small class="form-hint">Space-separated list of OAuth scopes to request</small>
                </div>

                <div class="form-group full-width">
                  <label for="auth0CallbackUrls">Allowed Callback URLs</label>
                  <textarea id="auth0CallbackUrls" formControlName="callbackUrlsText" 
                            class="form-control" rows="3" 
                            placeholder="https://yourdomain.com/tenant/{{tenantId}}/auth/callback"></textarea>
                  <small class="form-hint">One URL per line. Use {{tenantId}} as placeholder for dynamic tenant URLs.</small>
                </div>
              </div>

              <div class="config-actions">
                <button type="button" class="btn-test" (click)="testAuth0Configuration()" 
                        [disabled]="!isAuth0ConfigValid()">
                  🧪 Test Configuration
                </button>
                <button type="button" class="btn-secondary" (click)="openAuth0Dashboard()">
                  🔗 Open Auth0 Dashboard
                </button>
              </div>
            </div>
          </div>

          <!-- Azure AD Configuration -->
          <div *ngIf="configForm.get('authType')?.value === 'azuread'" class="config-section">
            <h2>🏢 Azure AD Configuration</h2>
            <div class="azuread-config" formGroupName="azureadConfig">
              <div class="form-grid">
                <div class="form-group">
                  <label for="azureTenantId">Azure Tenant ID *</label>
                  <input type="text" id="azureTenantId" formControlName="tenantId" 
                         class="form-control" placeholder="12345678-1234-1234-1234-123456789012">
                  <small class="form-hint">Your organization's Azure AD tenant ID (GUID)</small>
                </div>

                <div class="form-group">
                  <label for="azureClientId">Application (Client) ID *</label>
                  <input type="text" id="azureClientId" formControlName="clientId" 
                         class="form-control" placeholder="87654321-4321-4321-4321-210987654321">
                </div>

                <div class="form-group">
                  <label for="azureClientSecret">Client Secret *</label>
                  <input type="password" id="azureClientSecret" formControlName="clientSecret" 
                         class="form-control" placeholder="Your Azure app registration client secret">
                  <small class="form-hint">Create this in Azure Portal > App registrations > Certificates & secrets</small>
                </div>

                <div class="form-group">
                  <label for="azureAuthority">Authority URL</label>
                  <input type="text" id="azureAuthority" formControlName="authority" 
                         class="form-control" readonly>
                  <small class="form-hint">Automatically generated based on tenant ID</small>
                </div>

                <div class="form-group full-width">
                  <label for="azureScopes">Requested Scopes</label>
                  <input type="text" id="azureScopes" formControlName="scopesText" 
                         class="form-control" placeholder="User.Read profile openid email">
                  <small class="form-hint">Space-separated list of Microsoft Graph scopes</small>
                </div>
              </div>

              <div class="consent-section">
                <div class="consent-info">
                  <h4>🔐 Admin Consent Required</h4>
                  <p>Azure AD requires admin consent for enterprise applications. After saving this configuration:</p>
                  <ol>
                    <li>An admin consent URL will be generated</li>
                    <li>Send this URL to the tenant's Azure AD administrator</li>
                    <li>Admin must grant consent before users can login</li>
                  </ol>
                </div>
                <button type="button" class="btn-consent" (click)="initiateAdminConsent()" 
                        [disabled]="!isAzureAdConfigValid()">
                  🔗 Generate Admin Consent URL
                </button>
              </div>

              <div class="config-actions">
                <button type="button" class="btn-test" (click)="testAzureAdConfiguration()" 
                        [disabled]="!isAzureAdConfigValid()">
                  🧪 Test Configuration
                </button>
                <button type="button" class="btn-secondary" (click)="openAzurePortal()">
                  🔗 Open Azure Portal
                </button>
              </div>
            </div>
          </div>

          <!-- Status Messages -->
          <div *ngIf="statusMessage" class="status-message" [class.error]="statusMessage.includes('Error')">
            <span class="status-icon">{{statusMessage.includes('Error') ? '⚠️' : 'ℹ️'}}</span>
            <span>{{statusMessage}}</span>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-config-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-content h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .header-content p {
      color: #7f8c8d;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary, .btn-test, .btn-retry, .btn-consent {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-test {
      background: #28a745;
      color: white;
    }

    .btn-test:hover:not(:disabled) {
      background: #218838;
    }

    .btn-consent {
      background: #17a2b8;
      color: white;
    }

    .btn-consent:hover:not(:disabled) {
      background: #138496;
    }

    .btn-retry {
      background: #ffc107;
      color: #212529;
    }

    .btn-retry:hover {
      background: #e0a800;
    }

    .btn-primary:disabled, .btn-test:disabled, .btn-consent:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .loading-section, .error-section {
      text-align: center;
      padding: 3rem;
      color: #7f8c8d;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
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

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .config-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .config-section h2 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .section-description {
      color: #7f8c8d;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .provider-selection {
      display: grid;
      gap: 1rem;
    }

    .provider-option {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .provider-option:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .provider-option.selected {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .provider-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .provider-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .provider-info h3 {
      margin: 0 0 0.25rem 0;
      color: #2c3e50;
      font-size: 1.2rem;
    }

    .provider-info p {
      margin: 0;
      color: #7f8c8d;
      font-size: 0.95rem;
    }

    .selection-indicator {
      font-size: 1.5rem;
      color: #28a745;
      margin-left: auto;
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .feature {
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .info-card {
      display: flex;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #17a2b8;
    }

    .info-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .info-content h4 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
    }

    .info-content p {
      color: #6c757d;
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .info-content ul {
      color: #6c757d;
      margin: 0;
      padding-left: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
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

    .form-hint {
      display: block;
      color: #6c757d;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .consent-section {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .consent-info h4 {
      margin: 0 0 1rem 0;
      color: #856404;
    }

    .consent-info p {
      color: #856404;
      margin-bottom: 1rem;
    }

    .consent-info ol {
      color: #856404;
      margin: 0 0 1.5rem 0;
      padding-left: 1.5rem;
    }

    .config-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .status-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 2rem;
      background: #e8f5e8;
      border: 1px solid #c3e6c3;
      color: #2d5a2d;
    }

    .status-message.error {
      background: #ffebee;
      border-color: #ffcdd2;
      color: #c62828;
    }

    .status-icon {
      font-size: 1.2rem;
    }

    @media (max-width: 768px) {
      .auth-config-container { padding: 1rem; }
      .page-header { flex-direction: column; align-items: stretch; }
      .header-actions { justify-content: stretch; }
      .form-grid { grid-template-columns: 1fr; }
      .config-actions { flex-direction: column; }
    }
  `]
})
export class TenantAuthConfigComponent implements OnInit, OnDestroy {
  tenantId: string = '';
  configForm: FormGroup;
  isLoading = true;
  isSaving = false;
  error: string | null = null;
  statusMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.configForm = this.createConfigForm();
  }

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.tenantId = params['tenantId'];
        if (this.tenantId) {
          this.loadConfiguration();
        } else {
          this.error = 'No tenant ID provided';
          this.isLoading = false;
        }
      });

    // Watch Azure AD tenant ID changes to update authority
    this.configForm.get('azureadConfig.tenantId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tenantId => {
        if (tenantId) {
          this.configForm.get('azureadConfig.authority')?.setValue(
            `https://login.microsoftonline.com/${tenantId}/v2.0`
          );
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createConfigForm(): FormGroup {
    return this.fb.group({
      authType: ['jwt', Validators.required],
      auth0Config: this.fb.group({
        domain: ['', Validators.required],
        clientId: ['', Validators.required],
        clientSecret: ['', Validators.required],
        audience: [''],
        scopesText: ['openid profile email'],
        callbackUrlsText: ['']
      }),
      azureadConfig: this.fb.group({
        tenantId: ['', Validators.required],
        clientId: ['', Validators.required],
        clientSecret: ['', Validators.required],
        authority: [''],
        scopesText: ['User.Read profile openid email']
      })
    });
  }

  async loadConfiguration(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      console.log(`🔍 Loading auth config for tenant: ${this.tenantId}`);
      
      const config = await this.http.get<TenantAuthConfiguration>(
        `${environment.apiUrl}/auth/tenant/${this.tenantId}/config`
      ).toPromise();

      if (config) {
        this.populateForm(config);
        console.log(`✅ Loaded tenant auth config:`, config);
      } else {
        // Set default configuration
        this.configForm.patchValue({ authType: 'jwt' });
      }
    } catch (error: any) {
      console.error('❌ Error loading tenant config:', error);
      if (error.status === 404) {
        // Tenant not found or no config - set defaults
        this.configForm.patchValue({ authType: 'jwt' });
      } else {
        this.error = error?.error?.message || error?.message || 'Failed to load authentication configuration';
      }
    } finally {
      this.isLoading = false;
    }
  }

  private populateForm(config: TenantAuthConfiguration): void {
    this.configForm.patchValue({
      authType: config.authType
    });

    if (config.authType === 'auth0' && config.authConfig.auth0) {
      const auth0Config = config.authConfig.auth0;
      this.configForm.get('auth0Config')?.patchValue({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        clientSecret: auth0Config.clientSecret,
        audience: auth0Config.audience,
        scopesText: auth0Config.scopes?.join(' ') || 'openid profile email',
        callbackUrlsText: auth0Config.callbackUrls?.join('\n') || ''
      });
    }

    if (config.authType === 'azuread' && config.authConfig.azuread) {
      const azureConfig = config.authConfig.azuread;
      this.configForm.get('azureadConfig')?.patchValue({
        tenantId: azureConfig.tenantId,
        clientId: azureConfig.clientId,
        clientSecret: azureConfig.clientSecret,
        authority: azureConfig.authority,
        scopesText: azureConfig.scopes?.join(' ') || 'User.Read profile openid email'
      });
    }
  }

  selectAuthType(authType: 'jwt' | 'auth0' | 'azuread'): void {
    this.configForm.patchValue({ authType });
    this.statusMessage = null;
  }

  isAuth0ConfigValid(): boolean {
    const auth0Config = this.configForm.get('auth0Config');
    return (auth0Config?.get('domain')?.valid ?? false) && 
           (auth0Config?.get('clientId')?.valid ?? false) && 
           (auth0Config?.get('clientSecret')?.valid ?? false);
  }

  isAzureAdConfigValid(): boolean {
    const azureConfig = this.configForm.get('azureadConfig');
    return (azureConfig?.get('tenantId')?.valid ?? false) && 
           (azureConfig?.get('clientId')?.valid ?? false) && 
           (azureConfig?.get('clientSecret')?.valid ?? false);
  }

  async saveConfiguration(): Promise<void> {
    if (!this.configForm.valid || this.isSaving) return;

    this.isSaving = true;
    this.statusMessage = null;

    try {
      const formValue = this.configForm.value;
      const authType = formValue.authType;

      let authConfig: any = {};

      if (authType === 'auth0') {
        const auth0 = formValue.auth0Config;
        authConfig.auth0 = {
          domain: auth0.domain,
          clientId: auth0.clientId,
          clientSecret: auth0.clientSecret,
          audience: auth0.audience,
          scopes: auth0.scopesText?.split(' ').filter((s: string) => s.trim()) || ['openid', 'profile', 'email'],
          callbackUrls: auth0.callbackUrlsText?.split('\n').filter((url: string) => url.trim()) || [],
          logoutUrls: [] // Can be configured later
        };
      } else if (authType === 'azuread') {
        const azure = formValue.azureadConfig;
        authConfig.azuread = {
          tenantId: azure.tenantId,
          clientId: azure.clientId,
          clientSecret: azure.clientSecret,
          authority: azure.authority,
          scopes: azure.scopesText?.split(' ').filter((s: string) => s.trim()) || ['User.Read', 'profile', 'openid', 'email']
        };
      }

      console.log(`💾 Saving auth config for tenant: ${this.tenantId}`);

      const response = await this.http.put<any>(
        `${environment.apiUrl}/auth/tenant/${this.tenantId}/config`,
        {
          authType,
          authConfig
        }
      ).toPromise();

      if (response?.success) {
        this.statusMessage = '✅ Configuration saved successfully!';
        console.log(`✅ Auth config saved for tenant: ${this.tenantId}`);
        
        // Reload to get updated config
        setTimeout(() => this.loadConfiguration(), 1500);
      } else {
        throw new Error(response?.message || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('❌ Error saving config:', error);
      this.statusMessage = `Error: ${error?.error?.message || error?.message || 'Failed to save configuration'}`;
    } finally {
      this.isSaving = false;
    }
  }

  testAuth0Configuration(): void {
    this.statusMessage = 'Testing Auth0 configuration...';
    // Implement Auth0 test logic
    setTimeout(() => {
      this.statusMessage = '🧪 Auth0 configuration test - Please implement test logic';
    }, 1000);
  }

  testAzureAdConfiguration(): void {
    this.statusMessage = 'Testing Azure AD configuration...';
    // Implement Azure AD test logic
    setTimeout(() => {
      this.statusMessage = '🧪 Azure AD configuration test - Please implement test logic';
    }, 1000);
  }

  initiateAdminConsent(): void {
    this.statusMessage = 'Generating admin consent URL...';
    // Implement admin consent URL generation
    setTimeout(() => {
      this.statusMessage = '🔗 Admin consent URL generation - Please implement logic';
    }, 1000);
  }

  openAuth0Dashboard(): void {
    window.open('https://manage.auth0.com/', '_blank');
  }

  openAzurePortal(): void {
    window.open('https://portal.azure.com/', '_blank');
  }
} 