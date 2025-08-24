import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-security-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="security-policies-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Security Policies</h1>
          <p>Configure and manage authentication security policies for your organization</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="createPolicy()">
            ➕ Create Policy
          </button>
        </div>
      </div>

      <div class="content-grid">
        <!-- Account Security Settings -->
        <div class="policy-card">
          <div class="card-header">
            <h3>Account Security</h3>
            <span class="policy-status active">Active</span>
          </div>
          <div class="card-content">
            <div class="policy-setting">
              <label class="setting-label">
                <input type="checkbox" [(ngModel)]="policies.accountLockout" name="accountLockout">
                Account Lockout Policy
              </label>
              <p class="setting-description">Lock accounts after multiple failed login attempts</p>
            </div>
            <div class="policy-setting">
              <label class="setting-label">
                <input type="checkbox" [(ngModel)]="policies.sessionTimeout" name="sessionTimeout">
                Session Timeout
              </label>
              <p class="setting-description">Automatically log out users after period of inactivity</p>
            </div>
          </div>
        </div>

        <!-- Login Security Settings -->
        <div class="policy-card">
          <div class="card-header">
            <h3>Login Security</h3>
            <span class="policy-status active">Active</span>
          </div>
          <div class="card-content">
            <div class="policy-setting">
              <label class="setting-label">
                <input type="checkbox" [(ngModel)]="policies.ipWhitelist" name="ipWhitelist">
                IP Address Restrictions
              </label>
              <p class="setting-description">Restrict login access to specific IP addresses</p>
            </div>
            <div class="policy-setting">
              <label class="setting-label">
                <input type="checkbox" [(ngModel)]="policies.deviceTracking" name="deviceTracking">
                Device Tracking
              </label>
              <p class="setting-description">Track and manage user devices for security</p>
            </div>
          </div>
        </div>

        <!-- Data Protection Settings -->
        <div class="policy-card">
          <div class="card-header">
            <h3>Data Protection</h3>
            <span class="policy-status active">Active</span>
          </div>
          <div class="card-content">
            <div class="policy-setting">
              <label class="setting-label">
                <input type="checkbox" [(ngModel)]="policies.dataEncryption" name="dataEncryption">
                Data Encryption
              </label>
              <p class="setting-description">Encrypt sensitive user data at rest and in transit</p>
            </div>
            <div class="policy-setting">
              <label class="setting-label">
                <input type="checkbox" [(ngModel)]="policies.auditLogging" name="auditLogging">
                Audit Logging
              </label>
              <p class="setting-description">Log all authentication and authorization events</p>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <button class="btn-primary" (click)="savePolicies()">Save Changes</button>
        <button class="btn-secondary" (click)="resetPolicies()">Reset to Defaults</button>
      </div>
    </div>
  `,
  styles: [`
    .security-policies-container {
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

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      border: none;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover {
      background: #1976d2;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .policy-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .card-header h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.2rem;
    }

    .policy-status {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .policy-status.active {
      background: #d4edda;
      color: #155724;
    }

    .card-content {
      padding: 1.5rem;
    }

    .policy-setting {
      margin-bottom: 1.5rem;
    }

    .policy-setting:last-child {
      margin-bottom: 0;
    }

    .setting-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
      color: #2c3e50;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }

    .setting-description {
      color: #7f8c8d;
      font-size: 0.9rem;
      margin: 0;
      margin-left: 2rem;
      line-height: 1.4;
    }

    .actions-section {
      display: flex;
      gap: 1rem;
      justify-content: center;
      padding: 2rem 0;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .security-policies-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .content-grid {
        grid-template-columns: 1fr;
      }
      
      .actions-section {
        flex-direction: column;
      }
    }
  `]
})
export class SecurityPoliciesComponent implements OnInit {
  policies = {
    accountLockout: true,
    sessionTimeout: true,
    ipWhitelist: false,
    deviceTracking: true,
    dataEncryption: true,
    auditLogging: true
  };

  constructor() {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    // Load existing policies from API
    console.log('Loading security policies...');
  }

  createPolicy(): void {
    console.log('Creating new security policy...');
  }

  savePolicies(): void {
    console.log('Saving security policies...', this.policies);
  }

  resetPolicies(): void {
    this.policies = {
      accountLockout: true,
      sessionTimeout: true,
      ipWhitelist: false,
      deviceTracking: true,
      dataEncryption: true,
      auditLogging: true
    };
  }
} 