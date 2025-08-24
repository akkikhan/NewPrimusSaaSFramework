import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'app-oauth-providers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="oauth-providers-container">
      <div class="page-header">
        <div class="header-content">
          <h1>OAuth Providers</h1>
          <p>Manage OAuth authentication providers and integrations</p>
          <div *ngIf="usingLocalData" class="local-data-indicator">
            <span class="indicator-icon">💾</span>
            <span class="indicator-text">Using local data - API unavailable</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="addProvider()">
            ➕ Add Provider
          </button>
          <button class="btn-secondary" (click)="loadProviders()" [disabled]="loading">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading OAuth providers...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading OAuth Providers</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadProviders()">Try Again</button>
      </div>

      <!-- Providers Grid -->
      <div *ngIf="!loading && !error" class="providers-grid">
        <div *ngFor="let provider of providers" class="provider-card">
          <div class="provider-header">
            <div class="provider-info">
              <span class="provider-icon">{{provider.icon}}</span>
              <div>
                <h3>{{provider.name}}</h3>
                <p>{{provider.description}}</p>
              </div>
            </div>
            <div class="provider-status">
              <span class="status-badge" [class]="'status-' + provider.status">{{provider.status}}</span>
            </div>
          </div>
          
          <div class="provider-details">
            <div class="detail-row">
              <span class="label">Client ID:</span>
              <span class="value">{{provider.clientId}}</span>
            </div>
            <div class="detail-row">
              <span class="label">Redirect URI:</span>
              <span class="value">{{provider.redirectUri}}</span>
            </div>
            <div class="detail-row">
              <span class="label">Scopes:</span>
              <span class="value">{{provider.scopes.join(', ')}}</span>
            </div>
            <div class="detail-row" *ngIf="provider.lastTested">
              <span class="label">Last Tested:</span>
              <span class="value">{{formatDate(provider.lastTested)}}</span>
            </div>
          </div>

          <div class="provider-actions">
            <button class="btn-secondary" (click)="configureProvider(provider)" [disabled]="configuringProvider === provider.id">
              {{configuringProvider === provider.id ? 'Configuring...' : 'Configure'}}
            </button>
            <button class="btn-secondary" (click)="testProvider(provider)" [disabled]="testingProvider === provider.id">
              {{testingProvider === provider.id ? 'Testing...' : 'Test'}}
            </button>
            <button class="btn-danger" (click)="removeProvider(provider)" [disabled]="removingProvider === provider.id">
              {{removingProvider === provider.id ? 'Removing...' : 'Remove'}}
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="providers.length === 0" class="empty-state">
          <div class="empty-icon">🔐</div>
          <h3>No OAuth Providers Configured</h3>
          <p>Configure your first OAuth provider to enable external authentication.</p>
          <button class="btn-primary" (click)="addProvider()">Add Provider</button>
        </div>
      </div>

      <!-- Configuration Modal -->
      <div *ngIf="showConfigModal" class="modal-overlay" (click)="closeConfigModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Configure {{selectedProvider?.name}}</h3>
            <button class="modal-close" (click)="closeConfigModal()">×</button>
          </div>
          
          <form [formGroup]="configForm" (ngSubmit)="saveConfiguration()" class="modal-body">
            <div class="form-group">
              <label for="name">Provider Name *</label>
              <input 
                type="text" 
                id="name"
                formControlName="name"
                placeholder="Enter provider name (e.g., Company Google OAuth)"
                class="form-input">
              <div class="error-message" *ngIf="configForm.get('name')?.invalid && configForm.get('name')?.touched">
                Provider name is required
              </div>
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <input 
                type="text" 
                id="description"
                formControlName="description"
                placeholder="Brief description of this provider"
                class="form-input">
            </div>

            <div class="form-group">
              <label for="clientId">Client ID *</label>
              <input 
                type="text" 
                id="clientId"
                formControlName="clientId"
                placeholder="Enter client ID from your OAuth provider"
                class="form-input">
              <div class="error-message" *ngIf="configForm.get('clientId')?.invalid && configForm.get('clientId')?.touched">
                Client ID is required
              </div>
            </div>

            <div class="form-group">
              <label for="clientSecret">Client Secret</label>
              <input 
                type="password" 
                id="clientSecret"
                formControlName="clientSecret"
                placeholder="Enter client secret (optional for some providers)"
                class="form-input">
            </div>

            <div class="form-group">
              <label for="redirectUri">Redirect URI *</label>
              <input 
                type="url" 
                id="redirectUri"
                formControlName="redirectUri"
                placeholder="e.g., https://yourapp.com/auth/callback"
                class="form-input">
              <div class="error-message" *ngIf="configForm.get('redirectUri')?.invalid && configForm.get('redirectUri')?.touched">
                Valid redirect URI is required
              </div>
            </div>

            <div class="form-group">
              <label for="scopes">Scopes (comma-separated)</label>
              <input 
                type="text" 
                id="scopes"
                formControlName="scopes"
                placeholder="e.g., openid, profile, email"
                class="form-input">
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  formControlName="isEnabled">
                <span class="checkbox-text">Enable this provider</span>
              </label>
            </div>
          </form>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeConfigModal()">Cancel</button>
            <button type="submit" class="btn-primary" (click)="saveConfiguration()" [disabled]="configForm.invalid || savingConfig">
              {{savingConfig ? 'Saving...' : 'Save Configuration'}}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .oauth-providers-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .local-data-indicator {
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: #856404;
    }

    .indicator-icon {
      font-size: 1rem;
    }

    .btn-primary, .btn-secondary, .btn-danger {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      border: none;
    }

         .btn-primary {
       background: #e5006e;
       color: white;
       border-radius: 8px;
       box-shadow: 0 2px 4px rgba(229, 0, 110, 0.2);
     }

     .btn-primary:hover {
       background: #c2005a;
       box-shadow: 0 4px 8px rgba(229, 0, 110, 0.3);
     }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
    }

    .providers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
    }

    .provider-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .provider-icon {
      font-size: 2rem;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      border-radius: 10px;
    }

    .provider-info h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.2rem;
    }

    .provider-info p {
      margin: 0;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-badge.enabled {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.disabled {
      background: #f8d7da;
      color: #721c24;
    }

    .provider-details {
      padding: 1.5rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 500;
      color: #7f8c8d;
    }

    .value {
      color: #2c3e50;
      font-family: monospace;
      background: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .provider-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .loading-container, .error-container, .empty-state {
      text-align: center;
      padding: 3rem 0;
      color: #7f8c8d;
    }

    .loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .status-enabled {
      background: #d4edda;
      color: #155724;
    }

    .status-disabled {
      background: #f8d7da;
      color: #721c24;
    }

    .status-available {
      background: #d1ecf1;
      color: #0c5460;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-container {
      background: white;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      margin: 0;
      color: #2c3e50;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #7f8c8d;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex-grow: 1;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #34495e;
      font-weight: 500;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-input:focus {
      border-color: #3498db;
      outline: none;
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      margin-top: 1rem;
      cursor: pointer;
    }

    .checkbox-text {
      margin-left: 0.5rem;
      color: #555;
      font-size: 0.9rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }

    .modal-footer .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
    }

    .modal-footer .btn-secondary:hover {
      background: #e0e0e0;
    }

         .modal-footer .btn-primary {
       background: #e5006e;
       color: white;
       border-radius: 8px;
       box-shadow: 0 2px 4px rgba(229, 0, 110, 0.2);
     }

     .modal-footer .btn-primary:hover {
       background: #c2005a;
       box-shadow: 0 4px 8px rgba(229, 0, 110, 0.3);
     }

    @media (max-width: 768px) {
      .oauth-providers-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .providers-grid {
        grid-template-columns: 1fr;
      }
      
      .provider-actions {
        flex-direction: column;
      }
    }
  `]
})
export class OAuthProvidersComponent implements OnInit {
  providers: any[] = [];
  loading = false;
  error: string | null = null;
  usingLocalData = false;
  configuringProvider: string | null = null;
  testingProvider: string | null = null;
  removingProvider: string | null = null;
  showConfigModal = false;
  selectedProvider: any;
  configForm: FormGroup;
  savingConfig = false;

  private readonly STORAGE_KEY = 'oauth_providers_local';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private dialogService: DialogService
  ) {
    this.configForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      clientId: ['', Validators.required],
      clientSecret: [''],
      redirectUri: ['', Validators.required],
      scopes: [''],
      isEnabled: [true]
    });
  }

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.loading = true;
    this.error = null;
    this.providers = []; // Clear existing providers to show loading
    
    // First, load from local storage immediately as fallback
    this.loadFromLocalStorage();
    this.usingLocalData = true;
    this.loading = false;
    
    // Then try to load from API, but don't block the UI
    this.apiService.getConfiguredOAuthProviders().subscribe({
      next: (response: any) => {
        if (response && (response.providers || Array.isArray(response))) {
          this.providers = response.providers || response;
          this.usingLocalData = false;
          console.log('✅ OAuth providers loaded from API:', this.providers);
        }
      },
      error: (err: any) => {
        console.warn('API failed, continuing with local data:', err);
        // Already have local data loaded, so just log the error
      }
    });
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.providers = JSON.parse(stored);
        console.log('✅ OAuth providers loaded from local storage');
      } catch (e) {
        console.warn('Failed to parse local storage data, using fallback');
        this.providers = this.getFallbackOAuthProviders();
      }
    } else {
      this.providers = this.getFallbackOAuthProviders();
      this.saveToLocalStorage(); // Save initial fallback data
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.providers));
      console.log('💾 OAuth providers saved to local storage');
    } catch (e) {
      console.warn('Failed to save to local storage:', e);
    }
  }

  private getFallbackOAuthProviders(): any[] {
    return [
      {
        id: 'azure-ad-fallback',
        type: 'azuread',
        name: 'Azure Active Directory',
        description: 'Microsoft Azure AD OAuth provider (Fallback Data)',
        icon: '🔵',
        status: 'enabled',
        clientId: '3a55b8fa-715b-499f-b88e-910766d635d5',
  redirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/auth/azure/callback',
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        isConfigured: true,
        lastTested: new Date().toISOString(),
        testStatus: 'success'
      },
      {
        id: 'google-oauth-fallback',
        type: 'google',
        name: 'Google OAuth',
        description: 'Google OAuth 2.0 provider (Fallback Data)',
        icon: '🔴',
        status: 'disabled',
        clientId: 'your-google-client-id.apps.googleusercontent.com',
  redirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/auth/google/callback',
        scopes: ['openid', 'profile', 'email'],
        isConfigured: false,
        lastTested: null,
        testStatus: 'not_tested'
      },
      {
        id: 'github-oauth-fallback',
        type: 'github',
        name: 'GitHub OAuth',
        description: 'GitHub OAuth App provider (Fallback Data)',
        icon: '⚫',
        status: 'disabled',
        clientId: 'your-github-client-id',
  redirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/auth/github/callback',
        scopes: ['user:email', 'read:user'],
        isConfigured: false,
        lastTested: null,
        testStatus: 'not_tested'
      }
    ];
  }

  addProvider(): void {
    this.selectedProvider = {
      id: 'new-provider-' + Date.now(),
      type: 'custom',
      name: '',
      description: '',
      icon: '🔗',
      status: 'disabled',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      scopes: [],
      isConfigured: false,
      lastTested: null,
      testStatus: 'not_tested'
    };
    this.configForm.reset();
    this.showConfigModal = true;
  }

  configureProvider(provider: any): void {
    this.selectedProvider = provider;
    this.configForm.patchValue({
      name: provider.name || '',
      description: provider.description || '',
      clientId: provider.clientId,
      clientSecret: provider.clientSecret || '',
      redirectUri: provider.redirectUri,
      scopes: Array.isArray(provider.scopes) ? provider.scopes.join(', ') : provider.scopes || '',
      isEnabled: provider.isEnabled || provider.status === 'enabled'
    });
    this.showConfigModal = true;
  }

  testProvider(provider: any): void {
    this.testingProvider = provider.id;
    
    if (this.usingLocalData) {
      // Simulate test when using local data
      setTimeout(() => {
        this.providers = this.providers.map(p => 
          p.id === provider.id ? { 
            ...p, 
            status: 'enabled', 
            lastTested: new Date().toISOString(),
            testStatus: 'success'
          } : p
        );
        this.saveToLocalStorage();
        this.testingProvider = null;
        console.log('✅ Provider test simulated locally');
      }, 1000);
    } else {
      this.apiService.testOAuthProvider(provider.id).subscribe({
        next: () => {
          this.providers = this.providers.map(p => p.id === provider.id ? { ...p, status: 'enabled' } : p);
          this.testingProvider = null;
        },
        error: (err) => {
          console.error('Test failed:', err);
          this.testingProvider = null;
        }
      });
    }
  }

  removeProvider(provider: any): void {
    this.removingProvider = provider.id;
    this.dialogService.confirm('Are you sure you want to remove this provider?', 'This action cannot be undone.').subscribe(confirmed => {
      if (confirmed) {
        if (this.usingLocalData) {
          // Remove from local storage
          this.providers = this.providers.filter(p => p.id !== provider.id);
          this.saveToLocalStorage();
          this.removingProvider = null;
          console.log('✅ Provider removed from local storage');
        } else {
          this.apiService.removeOAuthProvider(provider.id).subscribe({
            next: () => {
              this.providers = this.providers.filter(p => p.id !== provider.id);
              this.removingProvider = null;
            },
            error: (err) => {
              console.error('Remove failed:', err);
              this.removingProvider = null;
            }
          });
        }
      } else {
        this.removingProvider = null;
      }
    });
  }

  saveConfiguration(): void {
    this.savingConfig = true;
    this.configForm.markAllAsTouched();
    if (this.configForm.valid) {
      const providerData = {
        ...this.selectedProvider,
        name: this.configForm.value.name,
        description: this.configForm.value.description || '',
        clientId: this.configForm.value.clientId,
        clientSecret: this.configForm.value.clientSecret || null,
        redirectUri: this.configForm.value.redirectUri,
        scopes: this.configForm.value.scopes ? this.configForm.value.scopes.split(',').map((s: string) => s.trim()) : [],
        isEnabled: this.configForm.value.isEnabled,
        isConfigured: true,
        status: this.configForm.value.isEnabled ? 'enabled' : 'disabled'
      };

      if (this.usingLocalData) {
        // Save to local storage
        const existingIndex = this.providers.findIndex(p => p.id === this.selectedProvider.id);
        if (existingIndex >= 0) {
          this.providers[existingIndex] = providerData;
        } else {
          this.providers.push(providerData);
        }
        this.saveToLocalStorage();
        this.showConfigModal = false;
        this.savingConfig = false;
        console.log('✅ Provider configuration saved to local storage');
      } else {
        this.apiService.configureOAuthProvider(providerData).subscribe({
          next: () => {
            this.providers = this.providers.map(p => p.id === this.selectedProvider.id ? { ...p, ...providerData } : p);
            this.showConfigModal = false;
            this.savingConfig = false;
          },
          error: (err: any) => {
            console.error('Save failed:', err);
            this.savingConfig = false;
          }
        });
      }
    } else {
      this.savingConfig = false;
    }
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
    this.configForm.reset();
  }

  formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
} 