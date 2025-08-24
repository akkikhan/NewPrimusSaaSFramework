import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
// Removed DemoService; wiring directly to ApiService for live operations
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'app-tenant-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="onboarding-container">
      <!-- Demo Mode Banner (only shown if explicitly enabled) -->
      
      <div class="page-header">
        <h1>{{isEditMode ? 'Edit Tenant' : 'Tenant Onboarding'}}</h1>
        <p>{{isEditMode ? 'Update tenant information and settings' : 'Onboard a new customer to the Primus Framework platform'}}</p>
        

      </div>

      <!-- Progress Stepper -->
      <div class="progress-stepper" *ngIf="showProgress && progressSteps.length > 0">
        <h3>Onboarding Progress</h3>
        <div class="steps-container">
          <div 
            *ngFor="let step of progressSteps; let i = index" 
            class="step-item"
            [class.completed]="step.status === 'completed'"
            [class.processing]="step.status === 'processing'"
            [class.failed]="step.status === 'failed'"
            [class.skipped]="step.status === 'skipped'">
            
            <div class="step-indicator">
              <span *ngIf="step.status === 'completed'" class="step-icon">DONE</span>
              <span *ngIf="step.status === 'processing'" class="step-icon spinner">PROCESSING</span>
              <span *ngIf="step.status === 'failed'" class="step-icon">FAILED</span>
              <span *ngIf="step.status === 'skipped'" class="step-icon">SKIPPED</span>
              <span *ngIf="step.status === 'pending'" class="step-number">{{i + 1}}</span>
            </div>
            
            <div class="step-content">
              <div class="step-title">{{step.title}}</div>
              <div class="step-message">{{step.message}}</div>
              <div class="step-timestamp" *ngIf="step.timestamp">
                {{formatTimestamp(step.timestamp)}}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="loading">
        <div class="loading-spinner"></div>
        <p>Loading tenant data...</p>
      </div>

      <!-- Onboarding Form -->
      <div class="onboarding-form" *ngIf="!onboardingResult && !loading">
        <form [formGroup]="onboardingForm" (ngSubmit)="onSubmit()" class="form-container">
          
          <!-- Company Information -->
          <div class="form-section">
            <h3>Company Information</h3>
            <div class="form-group">
              <label for="companyName">Company Name *</label>
              <input 
                type="text" 
                id="companyName"
                formControlName="name"
                placeholder="e.g., Acme Corporation"
                class="form-input"
                [class.error]="onboardingForm.get('name')?.invalid && onboardingForm.get('name')?.touched">
              <div class="error-message" *ngIf="onboardingForm.get('name')?.invalid && onboardingForm.get('name')?.touched">
                Company name is required
              </div>
            </div>

            <div class="form-group">
              <label for="domain">Domain *</label>
              <input 
                type="text" 
                id="domain"
                formControlName="domain"
                placeholder="e.g., acme.myapp.com"
                class="form-input"
                [class.error]="onboardingForm.get('domain')?.invalid && onboardingForm.get('domain')?.touched">
              <div class="field-help">
                <p><strong>What is a Domain?</strong></p>
                <p>The domain serves as a unique identifier for your tenant. It can be used for:</p>
                <ul>
                  <li>Custom subdomain access (e.g., acme.saasfactory.com)</li>
                  <li>Tenant identification in API calls</li>
                  <li>Future custom domain routing</li>
                </ul>
                <p><em>Note:</em> This field is for identification purposes. Custom domain routing is not currently implemented but may be added in future versions.</p>
              </div>
              <div class="error-message" *ngIf="onboardingForm.get('domain')?.invalid && onboardingForm.get('domain')?.touched">
                Valid domain is required
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="plan">Plan *</label>
                <select id="plan" formControlName="plan" class="form-input" [class.error]="onboardingForm.get('plan')?.invalid && onboardingForm.get('plan')?.touched">
                  <option value="">Select a plan</option>
                  <option value="Basic">Basic</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <div class="error-message" *ngIf="onboardingForm.get('plan')?.invalid && onboardingForm.get('plan')?.touched">
                  Plan is required
                </div>
              </div>
              <div class="form-group">
                <label for="status">Status</label>
                <select id="status" formControlName="status" class="form-input">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Module Selection (moved before Auth configuration) -->
          <div class="form-section">
            <h3>Module Selection</h3>
            <p class="section-description">Select the modules you want to enable for this tenant. You can modify these later.</p>
            
            <div class="modules-grid">
              <div class="module-option" 
                   *ngFor="let module of availableModules" 
                   [class.selected]="isModuleSelected(module.id)"
                   (click)="toggleModule(module.id)">
                <div class="module-header">
                  <div class="module-icon" [innerHTML]="module.icon"></div>
                  <h4>{{module.name}}</h4>
                </div>
                <p class="module-description">{{module.description}}</p>
                <div class="module-selection">
                  <input type="checkbox" 
                         [checked]="isModuleSelected(module.id)"
                         (change)="toggleModule(module.id)"
                         [id]="'module-' + module.id">
                  <label [for]="'module-' + module.id">Enable</label>
                </div>
              </div>
            </div>


          </div>

          <!-- Authentication Configuration (shown only if 'auth' module selected) -->
          <div class="form-section" *ngIf="isAuthSelected()">
            <h3>Authentication Configuration</h3>
            <p class="section-description">Choose how users will authenticate with your tenant.</p>
            
            <div class="form-group">
              <label for="authType">Authentication Provider *</label>
              <select 
                id="authType"
                formControlName="authType"
                class="form-input"
                [class.error]="onboardingForm.get('authType')?.invalid && onboardingForm.get('authType')?.touched"
                [disabled]="loadingProviders">
                <option value="">{{loadingProviders ? 'Loading providers...' : 'Select Login Provider'}}</option>
                <option 
                  *ngFor="let provider of availableOAuthProviders" 
                  [value]="provider.type"
                  [disabled]="provider.status === 'disabled'">
                  {{provider.icon}} {{provider.name}} 
                  <span *ngIf="provider.status === 'enabled'">(Ready)</span>
                  <span *ngIf="provider.status === 'disabled'">(Disabled)</span>
                </option>
              </select>
              <div class="error-message" *ngIf="onboardingForm.get('authType')?.invalid && onboardingForm.get('authType')?.touched">
                Authentication provider is required
              </div>
              <div class="field-help" *ngIf="!loadingProviders">
                <p><strong>Available Authentication Providers:</strong></p>
                <div class="provider-help" *ngFor="let provider of availableOAuthProviders">
                  <div class="provider-help-header">
                    <span class="provider-icon">{{provider.icon}}</span>
                    <strong>{{provider.name}}</strong>
                    <span class="status-badge" [class]="'status-' + provider.status">{{provider.status}}</span>
                  </div>
                  <p class="provider-description">{{provider.description}}</p>
                  <div class="provider-features" *ngIf="provider.features">
                    <strong>Features:</strong> {{provider.features.join(', ')}}
                  </div>
                </div>
              </div>
            </div>

            <!-- Azure AD Specific Configuration -->
            <div class="azure-ad-config" *ngIf="onboardingForm.get('authType')?.value === 'azuread'">
              <div class="form-group">
                <label for="azureAdTenantId">Azure AD Tenant ID (Optional)</label>
                <input 
                  type="text" 
                  id="azureAdTenantId"
                  formControlName="azureAdTenantId"
                  placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  class="form-input">
                <div class="field-help">
                  <p>If you have an existing Azure AD tenant, provide the Tenant ID. Otherwise, we'll help you set one up.</p>
                </div>
              </div>
              
              <div class="form-group">
                <label for="azureAdDomain">Azure AD Domain (Optional)</label>
                <input 
                  type="text" 
                  id="azureAdDomain"
                  formControlName="azureAdDomain"
                  placeholder="e.g., acme.onmicrosoft.com"
                  class="form-input">
                <div class="field-help">
                  <p>Your organization's Azure AD domain name.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Admin User Information -->
          <div class="form-section">
            <h3>Admin User</h3>
            <div *ngIf="isEditMode" class="info-note">
              <strong>Note:</strong> Admin user details can be filled for reference but will not be updated in edit mode. Use the User Management section to modify admin users.
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="adminFirstName">Admin First Name *</label>
                <input 
                  id="adminFirstName"
                  type="text"
                  formControlName="adminFirstName"
                  placeholder="Ada"
                  class="form-input"
                  [class.error]="onboardingForm.get('adminFirstName')?.invalid && onboardingForm.get('adminFirstName')?.touched">
              <div class="error-message" *ngIf="onboardingForm.get('adminFirstName')?.invalid && onboardingForm.get('adminFirstName')?.touched">
                First name is required
              </div>
              </div>
              <div class="form-group">
                <label for="adminLastName">Admin Last Name *</label>
                <input 
                  id="adminLastName"
                  type="text"
                  formControlName="adminLastName"
                  placeholder="Lovelace"
                  class="form-input"
                  [class.error]="onboardingForm.get('adminLastName')?.invalid && onboardingForm.get('adminLastName')?.touched">
              <div class="error-message" *ngIf="onboardingForm.get('adminLastName')?.invalid && onboardingForm.get('adminLastName')?.touched">
                Last name is required
              </div>
              </div>
              <div class="form-group">
                <label for="adminEmail">Admin Email *</label>
                <input 
                  type="email" 
                  id="adminEmail"
                  formControlName="adminEmail"
                  placeholder="e.g., admin@acme.com"
                  class="form-input"
                  [class.error]="onboardingForm.get('adminEmail')?.invalid && onboardingForm.get('adminEmail')?.touched">
              <div class="error-message" *ngIf="onboardingForm.get('adminEmail')?.invalid && onboardingForm.get('adminEmail')?.touched">
                Valid admin email is required
              </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              [disabled]="onboardingForm.invalid || isSubmitting">
              <span *ngIf="isSubmitting">{{isEditMode ? 'Updating...' : 'Onboarding...'}}</span>
              <span *ngIf="!isSubmitting">{{isEditMode ? 'Update Tenant' : 'Onboard Tenant'}}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Verification Sent Gate -->
  <div class="onboarding-success" *ngIf="onboardingResult && (onboardingResult.tenant?.isVerified === false || onboardingResult.tenant?.status === 'PendingVerification')">
        <div class="success-header">
          <div class="success-icon">📧</div>
          <h2>Verification Email Sent</h2>
          <p>We've sent a verification link to <strong>{{onboardingResult.adminUser?.email || onboardingForm.get('adminEmail')?.value}}</strong>. Please verify to activate your tenant.</p>
        </div>

        <div class="email-status warning">
          <span>Portal access is locked until verification completes.</span>
        </div>

        <div class="success-actions">
          <button class="btn-primary" (click)="resendVerification()" [disabled]="resending">
            {{ resending ? 'Resending…' : 'Resend Verification Email' }}
          </button>
          <button class="btn-secondary" (click)="openMailbox()">Open Mailbox</button>
        </div>
      </div>

      <!-- Onboarding Success -->
  <div class="onboarding-success" *ngIf="onboardingResult && (onboardingResult.tenant?.isVerified === true || onboardingResult.tenant?.status === 'Active')">
        <div class="success-header">
          <div class="success-icon">SUCCESS</div>
          <h2>Tenant Onboarded Successfully!</h2>
          <p>{{onboardingResult.tenant.name}} has been set up on SaaS Factory</p>
        </div>

        <!-- Credentials Display -->
        <div class="credentials-section">
          <h3>Tenant Credentials</h3>
          <div class="credentials-grid">
            <div class="credential-item">
              <label>Tenant ID:</label>
              <div class="credential-value">
                <code>{{onboardingResult.credentials.tenantId}}</code>
                <button (click)="copyToClipboard(onboardingResult.credentials.tenantId)" class="copy-btn">Copy</button>
              </div>
            </div>
            
            <div class="credential-item">
              <label>API Key:</label>
              <div class="credential-value">
                <code>{{onboardingResult.credentials.apiKey}}</code>
                <button (click)="copyToClipboard(onboardingResult.credentials.apiKey)" class="copy-btn">Copy</button>
              </div>
            </div>
            
            <div class="credential-item">
              <label>Client ID:</label>
              <div class="credential-value">
                <code>{{onboardingResult.credentials.clientId}}</code>
                <button (click)="copyToClipboard(onboardingResult.credentials.clientId)" class="copy-btn">Copy</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin User Credentials -->
        <div class="admin-info-section">
          <h3>Admin User Credentials</h3>
          <div class="simple-credentials">
            <p><strong>Email:</strong> <code>{{onboardingResult.adminUser.email}}</code> <button (click)="copyToClipboard(onboardingResult.adminUser.email)" class="copy-btn">Copy</button></p>
            <p><strong>Temporary Password:</strong> <code>{{onboardingResult.adminUser.tempPassword || onboardingResult.adminUser.TempPassword || 'GENERATING...'}}</code> <button (click)="copyToClipboard(onboardingResult.adminUser.tempPassword || onboardingResult.adminUser.TempPassword)" class="copy-btn">Copy</button></p>
            <p><strong>Login URL:</strong> <code>{{getTenantLoginUrl()}}</code> <button (click)="copyToClipboard(getTenantLoginUrl())" class="copy-btn">Copy</button></p>
          </div>
        </div>
        
        <!-- Tenant Portal Access -->
  <div class="tenant-portal-section" style="background: #f0f8ff; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 5px solid #002F87; text-align: center;" *ngIf="onboardingResult.tenant?.isVerified === true || onboardingResult.tenant?.status === 'Active'">
          <h3 style="margin-top: 0; color: #002F87; display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 1.5rem;">
            🏢 Tenant Portal Access
          </h3>
          <p style="color: #555; margin: 16px 0; font-size: 16px; line-height: 1.6;">
            Your tenant has been successfully created! Access your dedicated portal to manage users, configure settings, and start using the platform.
          </p>
          <div style="margin: 24px 0;">
            <button 
              (click)="accessPortalWithAzureAD()" 
              class="btn-portal-access"
              style="background: linear-gradient(135deg, #002F87, #0056b3); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 12px; transition: all 0.3s ease; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 47, 135, 0.3);">
              <span style="font-size: 20px;">🔐</span>
              <span>Access Your Tenant Portal</span>
            </button>
          </div>
          <div style="background: rgba(255,255,255,0.8); padding: 16px; border-radius: 8px; margin-top: 16px;">
            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">
              <strong>Ready to use:</strong> Your tenant portal includes user management, role-based access control, audit logging, and integration capabilities. Use the admin credentials above for initial login.
            </p>
          </div>
        </div>

        <!-- API Documentation & Integration -->
        <div class="documentation-section">
          <h3>📚 API Integration & Documentation</h3>
          <p class="section-intro">Everything you need to integrate SaaS Factory with your application:</p>
          
          <div class="docs-grid">
            <div class="doc-card">
              <div class="doc-icon">🔐</div>
              <h4>Authentication Module</h4>
              <p>Local authentication with mock users for testing and development.</p>
              <a routerLink="/authentication" class="doc-link">View Authentication</a>
            </div>
            
            <div class="doc-card">
              <div class="doc-icon">🛡️</div>
              <h4>RBAC Module</h4>
              <p>Role-based access control with local permissions and mock data.</p>
              <a routerLink="/rbac" class="doc-link">Manage RBAC</a>
            </div>
            
            <div class="doc-card">
              <div class="doc-icon">📋</div>
              <h4>Audit Logs</h4>
              <p>Track and monitor all system activities with local logging.</p>
              <a routerLink="/audit" class="doc-link">View Audit Logs</a>
            </div>
          </div>
          
          <!-- Quick Setup Instructions -->
          <div class="quick-setup" style="background: #fff9e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffa726;">
            <h4 style="margin-top: 0; color: #f57c00; display: flex; align-items: center; gap: 8px;">
              🚀 Quick Integration Setup
            </h4>
            <div class="setup-steps">
              <div class="step" style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                <span class="step-number" style="background: #ffa726; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">1</span>
                <div class="step-content">
                  <strong>Install SDK:</strong>
                  <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; margin-left: 8px; font-family: 'Courier New', monospace;">npm install &#64;saasfactory/client</code>
                </div>
              </div>
              <div class="step" style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                <span class="step-number" style="background: #ffa726; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">2</span>
                <div class="step-content">
                  <strong>Configure with your credentials:</strong> Use the Tenant ID and API Key provided above
                </div>
              </div>
              <div class="step" style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="step-number" style="background: #ffa726; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">3</span>
                <div class="step-content">
                  <strong>Access your portal:</strong> Use the button above to start managing your tenant
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Onboarding Status -->
        <div class="onboarding-status" style="background: #e8f5e8; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 5px solid #28a745; text-align: center;">
          <div class="status-icon" style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <div class="status-title" style="color: #28a745; font-size: 1.5rem; font-weight: 600; margin-bottom: 12px;">
            Tenant Successfully Created!
          </div>
          <div class="status-details" style="color: #555; font-size: 16px; line-height: 1.6;">
            Your tenant <strong>{{onboardingResult?.tenant?.name}}</strong> has been successfully onboarded to the platform. You can now access your dedicated portal and start using all available features.
          </div>
        </div>

        <!-- Actions -->
        <div class="success-actions">
          <a (click)="openQuickstart()" class="btn-primary">
            📚 Start Integration
          </a>
          <a href="/demo/setup" target="_blank" class="btn-secondary">
            🚀 Try Demo App
          </a>
          <button class="btn-secondary" (click)="viewTenant()">
            View Tenant Details
          </button>
          <button class="btn-outline" (click)="onboardAnother()">
            Onboard Another Tenant
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div class="error-container" *ngIf="error">
        <div class="error-icon">❌</div>
        <h3>Onboarding Failed</h3>
        <p>{{error}}</p>
        <button class="btn-primary" (click)="clearError()">Try Again</button>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Demo Banner Styles */
    .demo-banner {
      background: linear-gradient(135deg, #002F87, #001d5a);
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 12px rgba(0, 47, 135, 0.3);
    }

    .demo-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .demo-icon {
      font-size: 2rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .demo-text {
      flex: 1;
    }

    .demo-text strong {
      display: block;
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }

    .demo-text p {
      margin: 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .demo-toggle {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }

    .demo-toggle:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    /* Progress Stepper Styles */
    .progress-stepper {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1rem 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .progress-stepper h3 {
      margin: 0 0 1rem 0;
      color: #495057;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 0.5rem;
    }

    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .step-item.completed {
      background: #d4edda;
      border-left: 4px solid #28a745;
    }

    .step-item.processing {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
    }

    .step-item.failed {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
    }

    .step-item.skipped {
      background: #e2e3e5;
      border-left: 4px solid #6c757d;
    }

    .step-indicator {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #f8f9fa;
      border: 2px solid #dee2e6;
    }

    .step-item.completed .step-indicator {
      background: #28a745;
      border-color: #28a745;
      color: white;
    }

    .step-item.processing .step-indicator {
      background: #ffc107;
      border-color: #ffc107;
      color: white;
    }

    .step-item.failed .step-indicator {
      background: #dc3545;
      border-color: #dc3545;
      color: white;
    }

    .step-item.skipped .step-indicator {
      background: #6c757d;
      border-color: #6c757d;
      color: white;
    }

    .step-icon {
      font-size: 1rem;
    }

    .step-icon.spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .step-number {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .step-content {
      flex: 1;
    }

    .step-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: #495057;
    }

    .step-message {
      font-size: 0.875rem;
      color: #6c757d;
    }

    .step-timestamp {
      font-size: 0.75rem;
      color: #adb5bd;
      margin-top: 0.25rem;
    }

    .page-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .page-header h1 {
      color: #2c3e50;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .page-header p {
      color: #7f8c8d;
      font-size: 1.1rem;
    }

    .loading-container {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .form-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .form-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .form-section h3 {
      color: #2c3e50;
      margin-bottom: 1.5rem;
      font-size: 1.3rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #34495e;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .form-input.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .field-help {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #e9ecef;
      margin-top: 0.5rem;
    }

    .field-help p {
      margin: 0 0 0.5rem 0;
      color: #495057;
      font-size: 0.9rem;
    }

    .field-help ul {
      margin: 0;
      padding-left: 1.2rem;
    }

    .field-help li {
      margin-bottom: 0.25rem;
      color: #495057;
      font-size: 0.85rem;
    }

    .provider-help {
      margin-bottom: 1rem;
      padding: 0.75rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: #fff;
    }

    .provider-help:last-child {
      margin-bottom: 0;
    }

    .provider-help-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .provider-icon {
      font-size: 1.2rem;
    }

    .provider-description {
      color: #6c757d;
      font-size: 0.85rem;
      margin: 0 0 0.5rem 0;
    }

    .provider-features {
      color: #495057;
      font-size: 0.8rem;
      margin: 0;
    }

    .status-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-enabled {
      background: #d4edda;
      color: #155724;
    }

    .status-available {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-disabled {
      background: #f8d7da;
      color: #721c24;
    }

    .section-description {
      color: #7f8c8d;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .module-option {
      border: 2px solid #e0e0e0;
      border-radius: 16px;
      padding: 2rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .module-option:hover {
      border-color: #002F87;
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 47, 135, 0.15);
    }

    .module-option.selected {
      border-color: #002F87;
      background: #f8f9ff;
      box-shadow: 0 8px 25px rgba(0, 47, 135, 0.15);
    }

    .module-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .module-icon {
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      border-radius: 12px;
      color: #002F87;
    }

    .module-icon svg {
      width: 28px;
      height: 28px;
      stroke: currentColor;
    }

    .module-header h4 {
      margin: 0;
      color: #002F87;
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .module-description {
      color: #475569;
      font-size: 1rem;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }

    .module-selection {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .module-selection input[type="checkbox"] {
      width: 1.25rem;
      height: 1.25rem;
      accent-color: #002F87;
    }

    .module-selection label {
      font-size: 1rem;
      color: #002F87;
      cursor: pointer;
      font-weight: 600;
    }

    .info-note {
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      color: #1565c0;
      font-size: 0.9rem;
    }

    .field-note {
      color: #666;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-style: italic;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #002F87;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #001d5a;
    }

    .btn-primary:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #ecf0f1;
      color: #333333;
    }

    .btn-secondary:hover {
      background: #d5dbdb;
      color: #002F87;
    }

    .onboarding-success {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .success-header {
      margin-bottom: 2rem;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .success-header h2 {
      color: #27ae60;
      margin-bottom: 0.5rem;
    }

    .credentials-section, .admin-info-section, .instructions-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .credentials-section h3, .admin-info-section h3, .instructions-section h3 {
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .credentials-grid {
      display: grid;
      gap: 1rem;
    }

    .credential-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: white;
      border-radius: 6px;
    }

    .credential-item label {
      font-weight: 500;
      color: #2c3e50;
    }

    .credential-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .credential-value code {
      background: #e8f4fd;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .copy-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background 0.3s ease;
    }

    .copy-btn:hover {
      background: #e0e0e0;
    }

    .admin-info p {
      margin: 0.5rem 0;
    }

    .tenant-login-section {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #28a745;
      margin-top: 1rem;
    }

    .tenant-login-section p:first-child {
      margin-top: 0;
      font-weight: 600;
      color: #2c3e50;
    }

    .login-url-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.75rem 0;
      background: white;
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }

    .tenant-login-url {
      flex: 1;
      color: #28a745 !important;
      text-decoration: none;
      font-weight: 500;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9rem;
      word-break: break-all;
    }

    .tenant-login-url:hover {
      color: #20c997 !important;
      text-decoration: underline;
    }

    .login-note {
      margin-bottom: 0 !important;
      font-size: 0.85rem;
      color: #6c757d;
      font-style: italic;
    }

    .instructions ol {
      padding-left: 1.5rem;
    }

    .instructions li {
      margin: 0.5rem 0;
      line-height: 1.5;
    }

    .email-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .email-status.success {
      background: #d4edda;
      color: #155724;
    }

    .email-status.warning {
      background: #fff3cd;
      color: #856404;
    }

    .success-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .error-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-container h3 {
      color: #e74c3c;
      margin-bottom: 1rem;
    }

    /* Documentation Section Styles */
    .documentation-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .documentation-section h3 {
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .section-intro {
      color: #6c757d;
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }

    .docs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .doc-card {
      background: white;
      border-radius: 8px;
      padding: 1.25rem;
      border: 1px solid #e9ecef;
      transition: all 0.3s ease;
      text-align: center;
    }

    .doc-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #3498db;
    }

    .doc-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
    }

    .doc-card h4 {
      color: #2c3e50;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    .doc-card p {
      color: #6c757d;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .doc-link {
      display: inline-block;
      background: #3498db;
      color: white !important;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.3s ease;
    }

    .doc-link:hover {
      background: #2980b9;
    }

    .doc-info {
      display: inline-block;
      background: #e9ecef;
      color: #495057;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .quick-setup {
      background: #fff;
      border-radius: 8px;
      padding: 1.25rem;
      border: 1px solid #e9ecef;
    }

    .quick-setup h4 {
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .setup-steps {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .step-number {
      background: #3498db;
      color: white;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .step-content {
      flex: 1;
    }

    .step-content strong {
      color: #2c3e50;
      margin-right: 0.5rem;
    }

    .step-content code {
      background: #f1f3f4;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.8rem;
      color: #d73a49;
    }

    .step-content a {
      color: #3498db;
      text-decoration: none;
    }

    .step-content a:hover {
      text-decoration: underline;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #3498db;
      color: #3498db;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .btn-outline:hover {
      background: #3498db;
      color: white;
    }

    .btn-tenant-portal-direct {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .btn-tenant-portal-direct:hover {
      background: linear-gradient(135deg, #20c997, #1976d2);
      transform: translateY(-2px);
    }

    .btn-tenant-portal-direct:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .azure-ad-login-section {
      background: #f0f8ff;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #0078d4;
      margin-top: 1rem;
    }

    .azure-ad-login-section p:first-child {
      margin-top: 0;
      font-weight: 600;
      color: #0078d4;
    }

    .azure-ad-login-section .btn-azure-ad-login {
      background: linear-gradient(135deg, #0078d4, #106ebe);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .azure-ad-login-section .btn-azure-ad-login:hover {
      background: linear-gradient(135deg, #106ebe, #005c93);
      transform: translateY(-2px);
    }

    .azure-ad-login-section .btn-azure-ad-login:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .form-actions {
        flex-direction: column;
      }

      .success-actions {
        flex-direction: column;
      }

      .modules-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TenantOnboardingComponent implements OnInit {
  onboardingForm: FormGroup;
  isSubmitting = false;
  onboardingResult: any = null;
  resending = false;
  error: string = '';
  isEditMode = false;
  tenantId: string | null = null;
  loading = false;
  
  // New properties for enhanced functionality
  showProgress = false;
  progressSteps: any[] = [];

  // OAuth providers
  availableOAuthProviders: any[] = [];
  loadingProviders = false;

  availableModules = [
    {
      id: 'userManagement',
      name: 'User Management',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>`,
      description: 'Comprehensive user management with authentication, profiles, and permissions'
    },
    {
      id: 'auditLogs',
      name: 'Audit Logs',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>`,
      description: 'Complete audit trail with detailed logging and compliance reporting'
    },
    {
      id: 'rbac',
      name: 'RBAC',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <circle cx="12" cy="16" r="1"/>
        <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>`,
      description: 'Role-based access control with fine-grained permissions management'
    },
    {
      id: 'multiTenancy',
      name: 'Multi-Tenancy',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 21h18"/>
        <path d="M5 21V7l8-4v18"/>
        <path d="M19 21V11l-6-4"/>
      </svg>`,
      description: 'Multi-tenant architecture with complete data isolation and management'
    }
  ];

  selectedModules: string[] = ['userManagement', 'auditLogs', 'rbac', 'multiTenancy'];

  // Demo-related properties
  isDemoMode: boolean = false;
  showDemoBanner: boolean = false;

  constructor(
    private fb: FormBuilder,
  private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private dialogService: DialogService
  ) {
    this.onboardingForm = this.createForm();
  }

  ngOnInit() {
    console.log('TenantOnboardingComponent initialized');
    
  // Demo mode removed; always use live services
  this.isDemoMode = false;
  this.showDemoBanner = false;
    
    // Check if we're in edit mode
    this.tenantId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.tenantId;
    
    console.log('Edit mode:', this.isEditMode, 'Tenant ID:', this.tenantId);
    
    // Create the form
    this.onboardingForm = this.createForm();
    
    console.log('Form created with fields:', Object.keys(this.onboardingForm.controls));
    
  // Load available modules and OAuth providers
  this.loadModules();
    this.loadOAuthProviders();
    
    // Load existing tenant data if in edit mode
    if (this.isEditMode && this.tenantId) {
      this.loadTenantData(this.tenantId);
    }
  }

  createForm(): FormGroup {
    const form = this.fb.group({
      name: ['', [Validators.required]], // Company name
      domain: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      plan: ['', [Validators.required]],
      status: ['Active'],
      authType: [''], // Authentication provider (required only if auth module selected)
      azureAdTenantId: [''], // Optional Azure AD Tenant ID
      azureAdDomain: [''], // Optional Azure AD Domain
      adminEmail: ['', [Validators.required, Validators.email]],
      adminFirstName: ['', [Validators.required]],
      adminLastName: ['', [Validators.required]],
      selectedModules: [this.selectedModules, [Validators.required]]
    });

    // Dynamically require authType only if auth module is selected
    form.get('selectedModules')?.valueChanges.subscribe(() => {
      const ctrl = form.get('authType');
      if (this.isAuthSelected()) {
        ctrl?.addValidators([Validators.required]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });

    return form;
  }

  loadModules(): void {
    // Seed with minimal defaults to render fast
    this.availableModules = this.availableModules?.length ? this.availableModules : [
      { id: 'userManagement', name: 'User Management', icon: '', description: 'Manage users and profiles' },
      { id: 'rbac', name: 'RBAC', icon: '', description: 'Roles and permissions' },
      { id: 'auditLogs', name: 'Audit Logs', icon: '', description: 'Compliance audit trails' },
      { id: 'multiTenancy', name: 'Multi-Tenancy', icon: '', description: 'Tenant isolation' }
    ];
    this.apiService.getAvailableModules().subscribe({
      next: (mods) => {
        if (Array.isArray(mods) && mods.length) {
          this.availableModules = mods.map(m => ({
            id: m.id || m.moduleId || m.key,
            name: m.name || m.displayName || m.id,
            description: m.description || '',
            icon: m.icon || ''
          })).filter(m => !!m.id);
        }
      },
      error: (err) => {
        console.warn('Failed to load module catalog from API, using defaults:', err);
      }
    });
  }

  isAuthSelected(): boolean {
    return this.selectedModules.includes('auth') || this.selectedModules.includes('authentication');
  }

  loadOAuthProviders(): void {
    console.log('Loading OAuth providers...');
    
    // First, load fallback data immediately so UI is not blocked
    this.availableOAuthProviders = [
      {
        type: 'jwt',
        name: 'Username/Password',
        description: 'Internal username and password authentication with JWT tokens',
        status: 'enabled',
        icon: 'JWT'
      },
      {
        type: 'azuread',
        name: 'Azure Active Directory',
        description: 'OAuth authentication via Microsoft Azure AD',
        status: 'available',
        icon: 'AAD'
      },
      {
        type: 'auth0',
        name: 'Auth0',
        description: 'OAuth authentication via Auth0 identity platform',
        status: 'available',
        icon: 'AUTH0'
      }
    ];
    this.loadingProviders = false;
    
    // Then try to load from API in the background
    this.apiService.getAvailableOAuthProviders().subscribe({
      next: (response) => {
        if (response && (response.providers || Array.isArray(response))) {
          console.log('OAuth providers loaded from API:', response);
          this.availableOAuthProviders = response.providers || response;
        }
      },
      error: (error) => {
        console.warn('API failed, continuing with fallback providers:', error);
        // Already have fallback data loaded, so just log the error
      }
    });
  }

  isModuleSelected(moduleId: string): boolean {
    return this.selectedModules.includes(moduleId);
  }

  toggleModule(moduleId: string) {
    if (this.isModuleSelected(moduleId)) {
      this.selectedModules = this.selectedModules.filter(id => id !== moduleId);
    } else {
      this.selectedModules.push(moduleId);
    }
    
    // Update form control
    this.onboardingForm.patchValue({ 
      selectedModules: this.selectedModules 
    });
  }

  loadTenantData(tenantId: string) {
    this.loading = true;
    this.apiService.getTenant(tenantId).subscribe({
      next: (tenant) => {
        console.log('Loaded tenant data:', tenant);
        
        // Populate form with existing tenant data
        const formData = {
          name: tenant.name || tenant.Name,
          domain: tenant.domain || tenant.Domain,
          adminEmail: tenant.adminEmail || '' // Will be empty as not stored in tenant DTO
        };
        
        console.log('🎯 Loading tenant data:', tenant);
        console.log('🎯 Patching form with:', formData);
        
        this.onboardingForm.patchValue(formData);
        
        // Set selected modules based on tenant settings
        const modules: string[] = [];
        const settings = tenant.settings || tenant.Settings;
        
        if (settings) {
          // Always include core modules
          modules.push('userManagement', 'rbac', 'multiTenancy');
          
          // Add optional modules based on settings
          if (settings.enableNotifications) modules.push('notifications');
          if (settings.enableAnalytics) modules.push('analytics');
          if (settings.enableAuditLogs) modules.push('auditLogs');
          if (settings.enableAI) modules.push('aiCopilot');
        } else {
          // Default modules if no settings
          modules.push('userManagement', 'analytics', 'rbac', 'multiTenancy');
        }
        
        // Update selected modules and form
        this.selectedModules = modules;
        this.onboardingForm.patchValue({ selectedModules: this.selectedModules });
        
        console.log('🔧 Selected modules for edit:', this.selectedModules);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Failed to load tenant data:', error);
        this.error = this.apiService.handleError(error);
        this.loading = false;
      }
    });
  }

  async onSubmit() {
    if (this.onboardingForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    try {
      const formData = this.onboardingForm.value;
      
      if (this.isEditMode && this.tenantId) {
        console.log('🔄 Updating tenant:', this.tenantId, formData);
        
        // Prepare update payload - only include fields that UpdateTenantDto accepts
        const updatePayload = {
          name: formData.name,
          domain: formData.domain,
          settings: {
            enableNotifications: this.selectedModules.includes('notifications'),
            enableAnalytics: this.selectedModules.includes('analytics'),
            enableAuditLogs: this.selectedModules.includes('auditLogs'),
            enableAI: this.selectedModules.includes('aiCopilot'),
            // Core modules - always enabled
            allowUserRegistration: true,
            requireEmailVerification: true,
            enableMultiFactorAuth: false,
            maxUsers: 100
          }
          // Note: AdminName, AdminEmail are not supported in UpdateTenantDto
          // These would need to be updated through separate endpoints if needed
        };
        
        // Call the update API
        const result = await this.apiService.updateTenant(this.tenantId, updatePayload).toPromise();
        
        console.log('✅ Tenant updated successfully:', result);
        
        // Show success message before navigating
        this.dialogService.success(
          'Tenant Updated Successfully',
          `Tenant "${formData.name}" has been updated successfully!\n\nUpdated fields:\n• Company Name\n• Domain\n• Module Settings\n\nNote: Admin user details need to be updated separately through User Management.`
        ).subscribe();
        
        // Navigate back to tenant list
        this.router.navigate(['/tenants']);
      } else {
        console.log('🚀 Starting tenant onboarding:', formData);

        // Show initial progress
        this.showProgress = true;
        this.progressSteps = [{
          step: 'start',
          title: 'Starting Onboarding',
          status: 'processing',
          message: 'Preparing tenant onboarding request...',
          timestamp: new Date().toISOString()
        }];

        // Prepare onboarding payload with selected modules and authentication details
        const onboardingPayload = {
          name: formData.name,
          domain: formData.domain,
          plan: formData.plan,
          status: formData.status,
          adminEmail: formData.adminEmail,
          adminFirstName: formData.adminFirstName,
          adminLastName: formData.adminLastName,
          authType: formData.authType,
          azureAdTenantId: formData.azureAdTenantId || null,
          azureAdDomain: formData.azureAdDomain || null,
          enableAI: this.selectedModules.includes('aiCopilot'),
          enableAnalytics: this.selectedModules.includes('analytics'),
          enableAuditLogs: this.selectedModules.includes('auditLogs'),
          enableNotifications: this.selectedModules.includes('notifications'),
          selectedModules: this.selectedModules
        };

        console.log('🚀 Onboarding payload with modules:', onboardingPayload);

  // Call the live onboarding API
  const result = await this.apiService.onboardTenant(onboardingPayload).toPromise();
        
        console.log('✅ Tenant onboarded successfully:', result);
        console.log('🔍 AdminUser object:', result.adminUser);
        console.log('🔍 AdminUser TempPassword:', result.adminUser?.tempPassword);
        console.log('🔍 AdminUser TempPassword (Pascal):', result.adminUser?.TempPassword);
        
        // If tenant ID present, patch selected modules
        try {
          const tenantId = result?.tenant?.id || result?.tenantId || result?.id;
          if (tenantId && this.selectedModules?.length) {
            await this.apiService.updateTenantModules(tenantId, this.selectedModules).toPromise();
          }
        } catch (modErr) {
          console.warn('Module update failed (non-fatal):', modErr);
        }

        // Update progress with backend results if available
        if (result.progress && Array.isArray(result.progress)) {
          this.progressSteps = result.progress;
        } else {
          // Fallback progress if backend doesn't provide it
          this.progressSteps = [{
            step: 'complete',
            title: 'Onboarding Complete',
            status: 'completed',
            message: 'Tenant has been successfully onboarded!',
            timestamp: new Date().toISOString()
          }];
        }
        
  this.onboardingResult = result;
      }
      
    } catch (error: any) {
      console.error('❌ Operation failed:', error);
      this.error = this.apiService.handleError(error);
      
  // On failure, do not fall back to mock email
    } finally {
      this.isSubmitting = false;
    }
  }

  markFormGroupTouched() {
    Object.keys(this.onboardingForm.controls).forEach(key => {
      const control = this.onboardingForm.get(key);
      control?.markAsTouched();
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ Copied to clipboard:', text.substring(0, 20) + '...');
    }).catch(err => {
      console.error('❌ Failed to copy to clipboard:', err);
    });
  }

  getTenantLoginUrl(): string {
    if (this.onboardingResult?.tenant?.id) {
      const baseUrl = window.location.origin;
      return `${baseUrl}/tenant/${this.onboardingResult.tenant.id}/login`;
    }
    return '';
  }

  onboardAnother() {
    this.onboardingResult = null;
    this.onboardingForm.reset();
    this.selectedModules = ['userManagement', 'auditLogs', 'rbac', 'multiTenancy'];
    this.showProgress = false;
    this.progressSteps = [];
    this.onboardingForm.patchValue({ 
      selectedModules: this.selectedModules
    });
  }

  viewTenant() {
    if (this.onboardingResult?.tenant?.id) {
      this.router.navigate(['/tenants', this.onboardingResult.tenant.id]);
    }
  }

  goBack() {
    this.router.navigate(['/tenants']);
  }

  clearError() {
    this.error = '';
  }

  // Removed fallback email path; email is handled by backend

  private generateTenantId(companyName: string): string {
    const cleanName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\s+/g, '-');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${cleanName}-${timestamp}`;
  }

  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTempPassword(): string {
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    
    let password = '';
    password += upperCase.charAt(Math.floor(Math.random() * upperCase.length));
    password += lowerCase.charAt(Math.floor(Math.random() * lowerCase.length));
    password += digits.charAt(Math.floor(Math.random() * digits.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    for (let i = 4; i < 12; i++) {
      const allChars = upperCase + lowerCase + digits + special;
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password;
  }

  getBasicTenantLoginUrl(): string {
    if (!this.onboardingResult?.credentials?.tenantId) {
      return '';
    }
    
    const tenantId = this.onboardingResult.credentials.tenantId;
  const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
  return `${origin}/tenant/${tenantId}/login`;
  }

  openDocumentation(): void {
    // Navigate to documentation using Angular router
    this.router.navigate(['/docs']);
  }

  openApiReference(): void {
    // Navigate to API reference section using Angular router
    this.router.navigate(['/docs/api-reference']);
  }

  openQuickstart(): void {
    // Navigate to quickstart section of docs using Angular router
    this.router.navigate(['/docs/general']);
  }

  goToTenantPortalLogin(): void {
    if (this.onboardingResult?.tenant?.id) {
      const tenantId = this.onboardingResult.tenant.id;
      this.router.navigate(['/tenant', tenantId, 'login']);
    } else {
      this.dialogService.error('Error', 'Tenant ID not available to navigate to the portal.');
    }
  }

  accessPortalWithAzureAD(): void {
    if (this.onboardingResult?.tenant?.id) {
      const tenantId = this.onboardingResult.tenant.id;
      const email = this.onboardingResult.adminUser.email;
      
      // Navigate to tenant-specific Azure AD login page
      this.router.navigate(['/tenant', tenantId, 'azure-ad-login'], {
        queryParams: { 
          email: email,
          tenantName: this.onboardingResult.tenant.name
        }
      });
    } else {
      this.dialogService.error('Error', 'Tenant ID not available to initiate Azure AD login.');
    }
  }

  resendVerification(): void {
    const email = this.onboardingResult?.adminUser?.email || this.onboardingForm.get('adminEmail')?.value;
    if (!email) { return; }
    this.resending = true;
    this.apiService.post('/api/auth/verify-email/resend', { email }).subscribe({
      next: () => { this.resending = false; },
      error: () => { this.resending = false; }
    });
  }

  openMailbox(): void {
    const email = this.onboardingResult?.adminUser?.email || this.onboardingForm.get('adminEmail')?.value;
    const domain = (email || '').split('@')[1] || '';
    let url = 'https://outlook.office.com/mail';
    if (domain.includes('gmail')) url = 'https://mail.google.com';
    window.open(url, '_blank');
  }

  getObjectKeys(obj: any): string {
    return obj ? Object.keys(obj).join(', ') : 'null';
  }

  // New methods for enhanced functionality

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  updateProgress(steps: any[]) {
    this.progressSteps = steps;
    this.showProgress = true;
  }

  // Demo toggles removed
}