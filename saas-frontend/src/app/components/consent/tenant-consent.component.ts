import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-tenant-consent',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="consent-container">
      <div class="consent-card">
        <!-- Header -->
        <div class="consent-header">
          <div class="logo-section">
            <div class="logo-icon">🔐</div>
            <div class="logo-text">
              <h1>Azure AD Registration</h1>
              <p>SaaS Factory Platform</p>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div class="consent-content" *ngIf="isProcessing">
          <div class="processing-section">
            <div class="processing-spinner"></div>
            <h2>{{processMessage}}</h2>
            <p class="process-details">{{processDetails}}</p>
            
            <div class="process-steps">
              <div class="step" *ngFor="let step of processingSteps" 
                   [class.completed]="step.completed"
                   [class.active]="step.active">
                <span class="step-icon">{{step.completed ? '✅' : (step.active ? '⏳' : '⏸️')}}</span>
                <span class="step-text">{{step.text}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Consent Form -->
        <div class="consent-content" *ngIf="!isProcessing && !isComplete">
          <h2>Organization Registration</h2>
          <p class="consent-description">
            To complete your tenant setup, we need to register your organization with Azure Active Directory.
            This will enable secure authentication and enterprise features.
          </p>

          <div class="tenant-info" *ngIf="tenantInfo">
            <h3>Tenant Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Organization:</label>
                <span>{{tenantInfo.name}}</span>
              </div>
              <div class="info-item">
                <label>Domain:</label>
                <span>{{tenantInfo.domain}}</span>
              </div>
              <div class="info-item">
                <label>Admin Email:</label>
                <span>{{tenantInfo.adminEmail}}</span>
              </div>
              <div class="info-item">
                <label>Authentication:</label>
                <span>{{tenantInfo.authType}}</span>
              </div>
            </div>
          </div>

          <div class="consent-permissions">
            <h3>Required Permissions</h3>
            <div class="permission-list">
              <div class="permission-item">
                <span class="permission-icon">👥</span>
                <div class="permission-details">
                  <strong>User Authentication</strong>
                  <p>Allow SaaS Factory to authenticate users via Azure AD</p>
                </div>
              </div>
              <div class="permission-item">
                <span class="permission-icon">🔐</span>
                <div class="permission-details">
                  <strong>Access Control</strong>
                  <p>Manage role-based access and permissions</p>
                </div>
              </div>
              <div class="permission-item">
                <span class="permission-icon">📊</span>
                <div class="permission-details">
                  <strong>Usage Analytics</strong>
                  <p>Collect usage statistics and security logs</p>
                </div>
              </div>
            </div>
          </div>

          <div class="consent-actions">
            <button class="btn-consent" (click)="grantConsent()" [disabled]="isProcessing">
              <span class="consent-icon">✅</span>
              Grant Consent & Register
            </button>
            <button class="btn-cancel" (click)="cancelConsent()">
              <span class="cancel-icon">❌</span>
              Cancel
            </button>
          </div>
        </div>

        <!-- Success State -->
        <div class="consent-content" *ngIf="isComplete">
          <div class="success-section">
            <div class="success-icon">🎉</div>
            <h2>Registration Complete!</h2>
            <p class="success-message">
              Your organization has been successfully registered with Azure Active Directory.
            </p>

            <div class="success-details" *ngIf="tenantInfo">
              <h3>What's Next?</h3>
              <ol>
                <li>Your admin account has been configured</li>
                <li>Azure AD authentication is now enabled</li>
                <li>You can access your tenant portal using the link below</li>
              </ol>
            </div>

            <div class="success-actions">
              <button class="btn-portal" (click)="goToTenantPortal()">
                <span class="portal-icon">🏢</span>
                Access Tenant Portal
              </button>
              <button class="btn-docs" (click)="goToDocs()">
                <span class="docs-icon">📚</span>
                View Documentation
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="consent-footer">
          <p>&copy; 2024 SaaS Factory Platform. All rights reserved.</p>
          <p>Powered by Azure Active Directory</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .consent-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0078d4, #106ebe);
      padding: 2rem;
    }

    .consent-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 600px;
      overflow: hidden;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .consent-header {
      background: linear-gradient(135deg, #0078d4, #106ebe);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .logo-icon {
      font-size: 3rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-text h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .logo-text p {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    .consent-content {
      padding: 2.5rem;
    }

    .consent-content h2 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.6rem;
      text-align: center;
    }

    .consent-description {
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .tenant-info {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
      border-left: 4px solid #0078d4;
    }

    .tenant-info h3 {
      color: #0078d4;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-item label {
      font-weight: 600;
      color: #495057;
      font-size: 0.9rem;
    }

    .info-item span {
      color: #2c3e50;
      font-family: 'Courier New', monospace;
      background: white;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }

    .consent-permissions {
      margin: 2rem 0;
    }

    .consent-permissions h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }

    .permission-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .permission-icon {
      font-size: 1.5rem;
      background: #e3f2fd;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .permission-details strong {
      display: block;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .permission-details p {
      margin: 0;
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .consent-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .btn-consent {
      background: #0078d4;
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-consent:hover:not(:disabled) {
      background: #106ebe;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 120, 212, 0.3);
    }

    .btn-consent:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: transparent;
      color: #6c757d;
      border: 2px solid #dee2e6;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-cancel:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
    }

    .processing-section {
      text-align: center;
      padding: 2rem 0;
    }

    .processing-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(0, 120, 212, 0.2);
      border-top: 4px solid #0078d4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 2rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .process-details {
      color: #6c757d;
      margin-bottom: 2rem;
    }

    .process-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      text-align: left;
      max-width: 400px;
      margin: 0 auto;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .step.active {
      background: #e3f2fd;
      border: 1px solid #bbdefb;
    }

    .step.completed {
      background: #e8f5e8;
      border: 1px solid #c8e6c9;
    }

    .step-icon {
      font-size: 1.2rem;
      width: 30px;
      text-align: center;
    }

    .step-text {
      color: #2c3e50;
      font-weight: 500;
    }

    .success-section {
      text-align: center;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .success-message {
      color: #28a745;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }

    .success-details {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
      text-align: left;
    }

    .success-details h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
    }

    .success-details ol {
      margin: 0;
      padding-left: 1.5rem;
    }

    .success-details li {
      margin: 0.5rem 0;
      color: #495057;
    }

    .success-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-portal, .btn-docs {
      background: #0078d4;
      color: white;
      border: none;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
    }

    .btn-docs {
      background: #28a745;
    }

    .btn-portal:hover {
      background: #106ebe;
      transform: translateY(-1px);
    }

    .btn-docs:hover {
      background: #218838;
      transform: translateY(-1px);
    }

    .consent-footer {
      background: #f8f9fa;
      padding: 1.5rem 2rem;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }

    .consent-footer p {
      margin: 0;
      color: #6c757d;
      font-size: 0.85rem;
    }

    .consent-footer p:first-child {
      margin-bottom: 0.5rem;
    }
  `]
})
export class TenantConsentComponent implements OnInit {
  tenantId: string = '';
  tenantInfo: any = null;
  isProcessing: boolean = false;
  isComplete: boolean = false;
  processMessage: string = '';
  processDetails: string = '';

  processingSteps = [
    { text: 'Validating tenant information', completed: false, active: false },
    { text: 'Registering with Azure Active Directory', completed: false, active: false },
    { text: 'Configuring authentication settings', completed: false, active: false },
    { text: 'Setting up user permissions', completed: false, active: false },
    { text: 'Finalizing tenant registration', completed: false, active: false }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  private api: ApiService
  ) {}

  ngOnInit(): void {
    // Get tenant ID from route parameters
    this.tenantId = this.route.snapshot.paramMap.get('tenantId') || '';
    
    if (this.tenantId) {
      this.loadTenantInfo();
    } else {
      // Redirect back if no tenant ID
      this.router.navigate(['/']);
    }
  }

  private loadTenantInfo(): void {
  this.api.getTenant(this.tenantId).subscribe({
      next: (tenant) => {
        if (tenant) {
          this.tenantInfo = tenant;
          console.log('🔗 Tenant consent page loaded for:', tenant.name);
        } else {
          console.error('❌ Tenant not found:', this.tenantId);
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error('❌ Error loading tenant info:', error);
        this.router.navigate(['/']);
      }
    });
  }

  grantConsent(): void {
    this.isProcessing = true;
    this.processMessage = 'Processing consent...';
    this.processDetails = 'Please wait while we register your organization with Azure AD.';

    // Simulate realistic registration process
    this.simulateRegistrationProcess();
  }

  private simulateRegistrationProcess(): void {
    let currentStep = 0;

    const processStep = () => {
      if (currentStep > 0) {
        this.processingSteps[currentStep - 1].completed = true;
        this.processingSteps[currentStep - 1].active = false;
      }

      if (currentStep < this.processingSteps.length) {
        this.processingSteps[currentStep].active = true;
        
        // Update process message based on current step
        switch (currentStep) {
          case 0:
            this.processMessage = 'Validating tenant information...';
            this.processDetails = 'Checking tenant details and permissions.';
            break;
          case 1:
            this.processMessage = 'Registering with Azure AD...';
            this.processDetails = 'Creating your organization in Azure Active Directory.';
            break;
          case 2:
            this.processMessage = 'Configuring authentication...';
            this.processDetails = 'Setting up OAuth and SSO configurations.';
            break;
          case 3:
            this.processMessage = 'Setting up permissions...';
            this.processDetails = 'Configuring role-based access control.';
            break;
          case 4:
            this.processMessage = 'Finalizing registration...';
            this.processDetails = 'Completing tenant setup and activation.';
            break;
        }

        currentStep++;
        
        // Random delay between 1-3 seconds for realism
        const delay = Math.random() * 2000 + 1000;
        setTimeout(processStep, delay);
      } else {
        // All steps completed
        this.processingSteps[this.processingSteps.length - 1].completed = true;
        this.processingSteps[this.processingSteps.length - 1].active = false;
        this.completeRegistration();
      }
    };

    // Start the process after a brief delay
    setTimeout(processStep, 1000);
  }

  private completeRegistration(): void {
  // Update tenant consent status in backend to reflect completion
  this.api.updateTenant(this.tenantId, { consentStatus: 'consented', status: 'azure_registered' }).subscribe({
      next: () => {
        console.log('✅ Tenant consent granted and Azure AD registration completed');
        this.isProcessing = false;
        this.isComplete = true;
      },
      error: (error) => {
        console.error('❌ Error completing registration:', error);
        this.isProcessing = false;
      }
    });
  }

  cancelConsent(): void {
    const confirmed = confirm('Are you sure you want to cancel the registration process? Your tenant will not be fully configured.');
    if (confirmed) {
      // Navigate back to the platform
      this.router.navigate(['/']);
    }
  }

  goToTenantPortal(): void {
    if (this.tenantInfo) {
      // Navigate to tenant login with pre-filled email
      this.router.navigate(['/tenant', this.tenantId, 'login'], {
        queryParams: { 
          email: this.tenantInfo.adminEmail,
          registered: 'true'
        }
      });
    }
  }

  goToDocs(): void {
    this.router.navigate(['/docs']);
  }
} 