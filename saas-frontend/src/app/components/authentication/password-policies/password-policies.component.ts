import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="password-policies-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Password Policies</h1>
          <p>Configure password requirements and security settings</p>
        </div>
      </div>

      <div class="policy-sections">
        <!-- Password Requirements -->
        <div class="policy-section">
          <h3>Password Requirements</h3>
          <div class="policy-grid">
            <div class="policy-item">
              <label for="minLength">Minimum Length</label>
              <input type="number" id="minLength" [(ngModel)]="policies.minLength" 
                     min="6" max="32" class="form-input">
              <small>Characters required (6-32)</small>
            </div>
            <div class="policy-item">
              <label for="maxLength">Maximum Length</label>
              <input type="number" id="maxLength" [(ngModel)]="policies.maxLength" 
                     min="8" max="128" class="form-input">
              <small>Maximum characters allowed</small>
            </div>
          </div>

          <div class="checkbox-grid">
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.requireUppercase">
              <span>Require uppercase letters (A-Z)</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.requireLowercase">
              <span>Require lowercase letters (a-z)</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.requireNumbers">
              <span>Require numbers (0-9)</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.requireSpecialChars">
              <span>Require special characters (!&#64;#$%)</span>
            </label>
          </div>
        </div>

        <!-- Password History & Expiration -->
        <div class="policy-section">
          <h3>Password History & Expiration</h3>
          <div class="policy-grid">
            <div class="policy-item">
              <label for="historyCount">Password History</label>
              <input type="number" id="historyCount" [(ngModel)]="policies.historyCount" 
                     min="0" max="24" class="form-input">
              <small>Previous passwords to remember</small>
            </div>
            <div class="policy-item">
              <label for="maxAge">Password Expiration</label>
              <input type="number" id="maxAge" [(ngModel)]="policies.maxAge" 
                     min="0" max="365" class="form-input">
              <small>Days until password expires (0 = never)</small>
            </div>
          </div>

          <div class="checkbox-grid">
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.forceChangeOnFirstLogin">
              <span>Force password change on first login</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.preventReuse">
              <span>Prevent password reuse</span>
            </label>
          </div>
        </div>

        <!-- Account Lockout -->
        <div class="policy-section">
          <h3>Account Lockout Policy</h3>
          <div class="policy-grid">
            <div class="policy-item">
              <label for="maxAttempts">Failed Login Attempts</label>
              <input type="number" id="maxAttempts" [(ngModel)]="policies.maxAttempts" 
                     min="3" max="10" class="form-input">
              <small>Attempts before account lockout</small>
            </div>
            <div class="policy-item">
              <label for="lockoutDuration">Lockout Duration</label>
              <input type="number" id="lockoutDuration" [(ngModel)]="policies.lockoutDuration" 
                     min="5" max="1440" class="form-input">
              <small>Minutes until account unlocks</small>
            </div>
          </div>

          <div class="checkbox-grid">
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.enableLockout">
              <span>Enable account lockout</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" [(ngModel)]="policies.adminUnlockRequired">
              <span>Require admin to unlock accounts</span>
            </label>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <button class="btn-primary" (click)="savePolicies()">Save Changes</button>
        <button class="btn-secondary" (click)="resetToDefaults()">Reset to Defaults</button>
        <button class="btn-secondary" (click)="testPolicy()">Test Policy</button>
      </div>
    </div>
  `,
  styles: [`
    .password-policies-container {
      padding: 2rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .page-header p {
      color: #7f8c8d;
      margin: 0;
    }

    .policy-sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .policy-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .policy-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.3rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
    }

    .policy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .policy-item {
      display: flex;
      flex-direction: column;
    }

    .policy-item label {
      color: #2c3e50;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      margin-bottom: 0.25rem;
    }

    .form-input:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .policy-item small {
      color: #7f8c8d;
      font-size: 0.85rem;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .checkbox-item:hover {
      background: #f8f9fa;
      border-color: #2196f3;
    }

    .checkbox-item input[type="checkbox"] {
      margin: 0;
    }

    .checkbox-item span {
      color: #2c3e50;
      font-weight: 500;
    }

    .actions-section {
      display: flex;
      gap: 1rem;
      justify-content: center;
      padding: 2rem 0;
      border-top: 1px solid #e0e0e0;
      margin-top: 2rem;
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

    @media (max-width: 768px) {
      .password-policies-container {
        padding: 1rem;
      }
      
      .policy-grid {
        grid-template-columns: 1fr;
      }
      
      .checkbox-grid {
        grid-template-columns: 1fr;
      }
      
      .actions-section {
        flex-direction: column;
      }
    }
  `]
})
export class PasswordPoliciesComponent implements OnInit {
  policies = {
    minLength: 8,
    maxLength: 32,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    historyCount: 5,
    maxAge: 90,
    forceChangeOnFirstLogin: true,
    preventReuse: true,
    maxAttempts: 5,
    lockoutDuration: 30,
    enableLockout: true,
    adminUnlockRequired: false
  };

  constructor() {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    console.log('Loading password policies...');
  }

  savePolicies(): void {
    console.log('Saving password policies...', this.policies);
  }

  resetToDefaults(): void {
    this.policies = {
      minLength: 8,
      maxLength: 32,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      historyCount: 5,
      maxAge: 90,
      forceChangeOnFirstLogin: true,
      preventReuse: true,
      maxAttempts: 5,
      lockoutDuration: 30,
      enableLockout: true,
      adminUnlockRequired: false
    };
  }

  testPolicy(): void {
    console.log('Testing password policy with current settings...');
  }
} 