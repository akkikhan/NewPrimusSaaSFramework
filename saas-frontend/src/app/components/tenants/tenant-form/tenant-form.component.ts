import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/services/dialog.service';
import { ApiService } from '../../../services/api.service';

// Interfaces for tenant provisioning
interface TenantProvisioningResult {
  tenant: any;
  adminUser: any;
  apiKey: {
    keyId: string;
    key: string;
    tenantId: string;
    name: string;
    permissions: string[];
    createdAt: string;
  };
  welcomeEmailSent: boolean;
  welcomeEmailId?: string;
  loginUrl: string;
  apiEndpoint: string;
  setupComplete: boolean;
}

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="tenant-form-container">
      <div class="page-header">
        <div class="header-content">
          <h1>{{isEditMode ? 'Edit Tenant' : 'Create New Tenant'}}</h1>
          <p>{{isEditMode ? 'Update tenant information and settings' : 'Set up a new tenant with complete provisioning'}}</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/tenants">
            ← Back to Tenants
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{isEditMode ? 'Loading tenant data...' : 'Initializing form...'}}</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadTenant()" *ngIf="isEditMode">Try Again</button>
      </div>

      <!-- Provisioning Success State -->
      <div *ngIf="provisioningResult" class="provisioning-success">
        <div class="success-header">
          <div class="success-icon">🎉</div>
          <h2>Tenant Successfully Created!</h2>
          <p>Your tenant has been provisioned with all necessary components.</p>
        </div>

        <div class="provisioning-details">
          <!-- Tenant Information -->
          <div class="detail-card">
            <h3>🏢 Tenant Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Tenant ID:</label>
                <span class="tenant-id">{{provisioningResult.tenant.id}}</span>
              </div>
              <div class="detail-item">
                <label>Organization:</label>
                <span>{{provisioningResult.tenant.name}}</span>
              </div>
              <div class="detail-item">
                <label>Domain:</label>
                <span>{{provisioningResult.tenant.domain}}</span>
              </div>
              <div class="detail-item">
                <label>Plan:</label>
                <span class="plan-badge">{{provisioningResult.tenant.plan}}</span>
              </div>
            </div>
          </div>

          <!-- Admin User -->
          <div class="detail-card">
            <h3>👤 Admin User Created</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Name:</label>
                <span>{{provisioningResult.adminUser.firstName}} {{provisioningResult.adminUser.lastName}}</span>
              </div>
              <div class="detail-item">
                <label>Email:</label>
                <span>{{provisioningResult.adminUser.email}}</span>
              </div>
              <div class="detail-item">
                <label>Role:</label>
                <span class="role-badge">{{provisioningResult.adminUser.role}}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-active">{{provisioningResult.adminUser.status}}</span>
              </div>
            </div>
          </div>

          <!-- API Key -->
          <div class="detail-card api-key-card">
            <h3>🔑 API Key Generated</h3>
            <div class="api-key-info">
              <p class="api-key-warning">⚠️ <strong>Important:</strong> Save this API key securely. It won't be shown again!</p>
              <div class="api-key-display">
                <code [class.blurred]="apiKeyHidden" (click)="toggleApiKey()">
                  {{apiKeyHidden ? '••••••••••••••••••••••••••••••••••••••••' : provisioningResult.apiKey.key}}
                </code>
                <button class="copy-btn" (click)="copyApiKey()" [disabled]="apiKeyHidden">
                  {{apiKeyCopied ? '✅ Copied!' : '📋 Copy'}}
                </button>
                <button class="toggle-btn" (click)="toggleApiKey()">
                  {{apiKeyHidden ? '👁️ Show' : '🙈 Hide'}}
                </button>
              </div>
              <div class="api-key-details">
                <small>Key ID: {{provisioningResult.apiKey.keyId}}</small>
                <small>Permissions: {{provisioningResult.apiKey.permissions.join(', ')}}</small>
              </div>
            </div>
          </div>

          <!-- Access Information -->
          <div class="detail-card">
            <h3>🚀 Access Information</h3>
            <div class="access-links">
              <div class="access-item">
                <label>Admin Dashboard:</label>
                <a [href]="provisioningResult.loginUrl" target="_blank" class="access-link">
                  {{provisioningResult.loginUrl}}
                  <span class="external-icon">↗️</span>
                </a>
              </div>
              <div class="access-item">
                <label>API Endpoint:</label>
                <code class="endpoint-code">{{provisioningResult.apiEndpoint}}</code>
              </div>
            </div>
          </div>

          <!-- Email Status -->
          <div class="detail-card" [class.email-success]="provisioningResult.welcomeEmailSent">
            <h3>📧 Welcome Email</h3>
            <div class="email-status">
              <div *ngIf="provisioningResult.welcomeEmailSent" class="email-sent">
                <span class="status-icon">✅</span>
                <span>Welcome email sent successfully to {{provisioningResult.adminUser.email}}</span>
                <small *ngIf="provisioningResult.welcomeEmailId">Message ID: {{provisioningResult.welcomeEmailId}}</small>
              </div>
              <div *ngIf="!provisioningResult.welcomeEmailSent" class="email-failed">
                <span class="status-icon">❌</span>
                <span>Failed to send welcome email. Admin will need to be notified manually.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="success-actions">
          <button class="btn-primary" routerLink="/tenants">
            📋 View All Tenants
          </button>
          <button class="btn-secondary" [routerLink]="['/tenants', provisioningResult.tenant.id]">
            🔍 View Tenant Details
          </button>
          <button class="btn-secondary" (click)="createAnother()">
            ➕ Create Another Tenant
          </button>
        </div>
      </div>

      <!-- Tenant Form -->
      <form *ngIf="!loading && !error && !provisioningResult" (ngSubmit)="onSubmit()" #tenantForm="ngForm" class="tenant-form">
        <div class="form-sections">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>🏢 Tenant Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="name">Organization Name *</label>
                <input 
                  type="text" 
                  id="name"
                  [(ngModel)]="tenant.name"
                  name="name"
                  required
                  class="form-input"
                  [class.error]="submitted && !tenant.name"
                  placeholder="Acme Corporation">
                <div *ngIf="submitted && !tenant.name" class="error-message">
                  Organization name is required
                </div>
              </div>

              <div class="form-group">
                <label for="domain">Domain *</label>
                <input 
                  type="text" 
                  id="domain"
                  [(ngModel)]="tenant.domain"
                  name="domain"
                  required
                  class="form-input"
                  [class.error]="submitted && (!tenant.domain || !isValidDomain(tenant.domain))"
                  placeholder="acme"
                  (input)="onDomainChange()">
                <div *ngIf="submitted && !tenant.domain" class="error-message">
                  Domain is required
                </div>
                <div *ngIf="submitted && tenant.domain && !isValidDomain(tenant.domain)" class="error-message">
                  Domain must be 3-20 characters, letters and numbers only
                </div>
                <div class="field-help">
                  Full URL: {{tenant.domain}}.saasfactory.com
                </div>
              </div>
            </div>
          </div>

          <!-- Admin User Information -->
          <div class="form-section">
            <h3>👤 Primary Administrator</h3>
            <p class="section-description">This user will be created as the tenant administrator with full access.</p>
            <div class="form-grid">
              <div class="form-group">
                <label for="adminFirstName">Admin First Name *</label>
                <input 
                  type="text" 
                  id="adminFirstName"
                  [(ngModel)]="tenant.adminFirstName"
                  name="adminFirstName"
                  required
                  class="form-input"
                  [class.error]="submitted && !tenant.adminFirstName"
                  placeholder="Ada">
                <div *ngIf="submitted && !tenant.adminFirstName" class="error-message">
                  Admin first name is required
                </div>
              </div>

              <div class="form-group">
                <label for="adminLastName">Admin Last Name *</label>
                <input 
                  type="text" 
                  id="adminLastName"
                  [(ngModel)]="tenant.adminLastName"
                  name="adminLastName"
                  required
                  class="form-input"
                  [class.error]="submitted && !tenant.adminLastName"
                  placeholder="Lovelace">
                <div *ngIf="submitted && !tenant.adminLastName" class="error-message">
                  Admin last name is required
                </div>
              </div>
              <div class="form-group">
                <label for="adminEmail">Admin Email *</label>
                <input 
                  type="email" 
                  id="adminEmail"
                  [(ngModel)]="tenant.adminEmail"
                  name="adminEmail"
                  required
                  class="form-input"
                  [class.error]="submitted && (!tenant.adminEmail || !isValidEmail(tenant.adminEmail))"
                  placeholder="admin@acme.com">
                <div *ngIf="submitted && !tenant.adminEmail" class="error-message">
                  Admin email is required
                </div>
                <div *ngIf="submitted && tenant.adminEmail && !isValidEmail(tenant.adminEmail)" class="error-message">
                  Please enter a valid email address
                </div>
              </div>
            </div>
          </div>

          <!-- Plan and Status -->
          <div class="form-section">
            <h3>📋 Plan & Status</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="plan">Plan *</label>
                <select 
                  id="plan"
                  [(ngModel)]="tenant.plan"
                  name="plan"
                  required
                  class="form-input"
                  [class.error]="submitted && !tenant.plan">
                  <option value="">Select a plan</option>
                  <option value="Basic">Basic</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <div *ngIf="submitted && !tenant.plan" class="error-message">
                  Plan selection is required
                </div>
              </div>

              <div class="form-group">
                <label for="status">Status</label>
                <select 
                  id="status"
                  [(ngModel)]="tenant.status"
                  name="status"
                  class="form-input">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" routerLink="/tenants">
            Cancel
          </button>
          <button type="submit" class="btn-primary" [disabled]="saving || !tenantForm.valid">
            {{saving ? '🚀 Creating Tenant...' : (isEditMode ? '💾 Update Tenant' : '🚀 Create Tenant')}}
          </button>
        </div>

        <!-- Provisioning Progress -->
        <div *ngIf="saving && !isEditMode" class="provisioning-progress">
          <h4>🚀 Setting up your tenant...</h4>
          <div class="progress-steps">
            <div class="progress-step" [class.active]="currentStep >= 1" [class.completed]="currentStep > 1">
              <span class="step-number">1</span>
              <span class="step-label">Creating tenant</span>
            </div>
            <div class="progress-step" [class.active]="currentStep >= 2" [class.completed]="currentStep > 2">
              <span class="step-number">2</span>
              <span class="step-label">Setting up admin user</span>
            </div>
            <div class="progress-step" [class.active]="currentStep >= 3" [class.completed]="currentStep > 3">
              <span class="step-number">3</span>
              <span class="step-label">Generating API key</span>
            </div>
            <div class="progress-step" [class.active]="currentStep >= 4" [class.completed]="currentStep > 4">
              <span class="step-number">4</span>
              <span class="step-label">Sending welcome email</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .tenant-form-container {
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

    /* Loading and Error States */
    .loading-container, .error-container {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    /* Provisioning Success Styles */
    .provisioning-success {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .success-header {
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .success-header h2 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .success-header p {
      margin: 0;
      opacity: 0.9;
    }

    .provisioning-details {
      padding: 2rem;
      display: grid;
      gap: 1.5rem;
    }

    .detail-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #e9ecef;
    }

    .detail-card h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item label {
      font-size: 0.85rem;
      color: #6c757d;
      font-weight: 500;
    }

    .detail-item span {
      font-weight: 600;
      color: #2c3e50;
    }

    .tenant-id {
      font-family: 'Courier New', monospace;
      background: #e9ecef;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .plan-badge, .role-badge {
      background: #2196f3;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      display: inline-block;
    }

    .status-active {
      color: #4caf50;
      font-weight: 700;
    }

    /* API Key Card Styles */
    .api-key-card {
      border: 2px solid #ff9800;
      background: #fff3e0;
    }

    .api-key-warning {
      background: #ffecb3;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
      color: #e65100;
    }

    .api-key-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .api-key-display code {
      flex: 1;
      font-family: 'Courier New', monospace;
      background: none;
      border: none;
      padding: 0;
      font-size: 0.9rem;
      cursor: pointer;
      transition: filter 0.3s ease;
    }

    .api-key-display code.blurred {
      filter: blur(4px);
      user-select: none;
    }

    .copy-btn, .toggle-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f8f9fa;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s ease;
    }

    .copy-btn:hover, .toggle-btn:hover {
      background: #e9ecef;
    }

    .copy-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .api-key-details {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: #6c757d;
    }

    /* Access Information Styles */
    .access-links {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .access-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .access-item label {
      font-size: 0.9rem;
      color: #6c757d;
      font-weight: 500;
    }

    .access-link {
      color: #2196f3;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }

    .access-link:hover {
      text-decoration: underline;
    }

    .external-icon {
      font-size: 0.8rem;
    }

    .endpoint-code {
      background: #f8f9fa;
      padding: 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      border: 1px solid #e9ecef;
    }

    /* Email Status Styles */
    .email-status {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .email-sent, .email-failed {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .email-sent {
      color: #4caf50;
    }

    .email-failed {
      color: #e74c3c;
    }

    .status-icon {
      font-size: 1.2rem;
    }

    .email-success {
      border-color: #4caf50;
      background: #e8f5e8;
    }

    /* Success Actions */
    .success-actions {
      padding: 1.5rem 2rem;
      background: #f8f9fa;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    /* Form Styles */
    .tenant-form {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .form-sections {
      padding: 2rem;
    }

    .form-section {
      margin-bottom: 2.5rem;
    }

    .form-section:last-child {
      margin-bottom: 0;
    }

    .form-section h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.3rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
    }

    .section-description {
      color: #6c757d;
      font-style: italic;
      margin-bottom: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      color: #2c3e50;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input, .form-select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .form-input.error, .form-select.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }

    .domain-input {
      display: flex;
      align-items: center;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .domain-input:focus-within {
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .domain-input input {
      border: none;
      padding: 0.75rem;
      flex: 1;
      font-size: 1rem;
    }

    .domain-input input:focus {
      outline: none;
    }

    .domain-suffix {
      background: #f8f9fa;
      padding: 0.75rem;
      color: #7f8c8d;
      border-left: 1px solid #e0e0e0;
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .help-text {
      color: #4caf50;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    /* Form Actions */
    .form-actions {
      padding: 1.5rem 2rem;
      background: #f8f9fa;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    /* Buttons */
    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      font-size: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976d2;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-1px);
    }

    /* Provisioning Progress */
    .provisioning-progress {
      margin-top: 2rem;
      padding: 2rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .provisioning-progress h4 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      text-align: center;
    }

    .progress-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
    }

    .step-number {
      width: 40px;
      height: 40px;
      background: #e9ecef;
      color: #6c757d;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-bottom: 0.5rem;
      transition: all 0.3s ease;
    }

    .progress-step.active .step-number {
      background: #2196f3;
      color: white;
    }

    .progress-step.completed .step-number {
      background: #4caf50;
      color: white;
    }

    .step-label {
      font-size: 0.85rem;
      color: #6c757d;
      text-align: center;
    }

    .progress-step.active .step-label {
      color: #2196f3;
      font-weight: 500;
    }

    .progress-step.completed .step-label {
      color: #4caf50;
      font-weight: 500;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .tenant-form-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .form-actions, .success-actions {
        flex-direction: column;
      }

      .progress-steps {
        flex-direction: column;
        gap: 1rem;
      }

      .api-key-display {
        flex-direction: column;
        align-items: stretch;
      }

      .access-links {
        gap: 1.5rem;
      }
    }
  `]
})
export class TenantFormComponent implements OnInit {
  loading = true;
  saving = false;
  submitted = false;
  error = '';
  isEditMode = false;
  tenantId: string | null = null;
  currentStep = 0;
  
  // API Key display state
  apiKeyHidden = true;
  apiKeyCopied = false;
  
  // Provisioning result
  provisioningResult: TenantProvisioningResult | null = null;

  tenant = {
    name: '',
    domain: '',
    plan: '',
    status: 'Active',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    selectedModules: ['userManagement', 'analytics'] // Default modules
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  private apiService: ApiService,
  private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.loading = true;
    this.tenantId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.tenantId;

    if (this.isEditMode) {
      this.loadTenant();
    } else {
      this.loading = false;
    }
  }

  loadTenant() {
    if (!this.tenantId) return;

    this.loading = true;
    this.error = '';

    this.apiService.getTenant(this.tenantId).subscribe({
      next: (response) => {
        if (response) {
          this.tenant = {
            name: response.name || '',
            domain: response.domain || '',
            plan: response.plan || response.subscriptionTier || '',
            status: response.status || 'Active',
            adminEmail: response.adminEmail || '',
            adminFirstName: response.adminFirstName || '',
            adminLastName: response.adminLastName || '',
            selectedModules: response.selectedModules || ['userManagement', 'analytics']
          };
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.error = error?.message || 'Failed to load tenant data';
        this.loading = false;
        console.error('Failed to load tenant:', error);
      }
    });
  }

  async onSubmit() {
    this.submitted = true;
    
    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;
    this.error = '';
    this.currentStep = 1;

    try {
      if (this.isEditMode && this.tenantId) {
        // Update existing tenant via API
        await this.apiService.updateTenant(this.tenantId, this.tenant).toPromise();
        this.saving = false;
        this.router.navigate(['/tenants']);
      } else {
        // Create new tenant with full provisioning
        this.simulateProvisioningSteps();
        
        const response = await this.apiService.onboardTenant(this.tenant).toPromise();
        this.provisioningResult = response;
        this.saving = false;
        this.currentStep = 4;
      }
    } catch (error: any) {
      this.saving = false;
      this.currentStep = 0;
      this.error = error?.error?.message || 'Failed to save tenant. Please try again.';
      console.error('Error saving tenant:', error);
    }
  }

  simulateProvisioningSteps() {
    // Simulate the provisioning steps for better UX
    setTimeout(() => this.currentStep = 2, 1000);
    setTimeout(() => this.currentStep = 3, 2000);
    setTimeout(() => this.currentStep = 4, 3000);
  }

  onDomainChange() {
    // Convert to lowercase and remove invalid characters
    if (this.tenant.domain) {
      this.tenant.domain = this.tenant.domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  }

  isFormValid(): boolean {
    return !!(
      this.tenant.name &&
      this.tenant.domain &&
      this.isValidDomain(this.tenant.domain) &&
      this.tenant.plan &&
      this.tenant.adminEmail &&
      this.tenant.adminFirstName &&
      this.tenant.adminLastName &&
      this.isValidEmail(this.tenant.adminEmail) &&
      this.tenant.selectedModules &&
      this.tenant.selectedModules.length > 0
    );
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-z0-9]{3,20}$/;
    return domainRegex.test(domain);
  }

  toggleApiKey() {
    this.apiKeyHidden = !this.apiKeyHidden;
  }

  async copyApiKey() {
    if (this.provisioningResult?.apiKey.key && !this.apiKeyHidden) {
      try {
        await navigator.clipboard.writeText(this.provisioningResult.apiKey.key);
        this.apiKeyCopied = true;
        setTimeout(() => this.apiKeyCopied = false, 2000);
      } catch (err) {
        console.error('Failed to copy API key:', err);
      }
    }
  }

  createAnother() {
    // Reset the form for creating another tenant
    this.provisioningResult = null;
    this.tenant = {
      name: '',
      domain: '',
      plan: '',
      status: 'Active',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      selectedModules: ['userManagement', 'analytics'] // Default modules
    };
    this.submitted = false;
    this.currentStep = 0;
    this.apiKeyHidden = true;
    this.apiKeyCopied = false;
  }
}