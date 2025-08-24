import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mfa-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="mfa-settings-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Multi-Factor Authentication</h1>
          <p>Configure and manage multi-factor authentication settings</p>
        </div>
      </div>

      <div class="mfa-sections">
        <!-- MFA Status Overview -->
        <div class="status-section">
          <h3>MFA Status</h3>
          <div class="status-cards">
            <div class="status-card">
              <div class="status-icon enabled">📱</div>
              <div class="status-info">
                <h4>MFA Enabled</h4>
                <p>Multi-factor authentication is active</p>
              </div>
            </div>
            <div class="status-card">
              <div class="status-icon">👥</div>
              <div class="status-info">
                <h4>{{mfaStats.enrolledUsers}}/{{mfaStats.totalUsers}}</h4>
                <p>Users enrolled in MFA</p>
              </div>
            </div>
          </div>
        </div>

        <!-- MFA Configuration -->
        <div class="config-section">
          <h3>MFA Configuration</h3>
          <div class="config-options">
            <div class="config-option">
              <label class="config-label">
                <input type="checkbox" [(ngModel)]="settings.requireMfaForAllUsers">
                <span>Require MFA for all users</span>
              </label>
              <p>Force all users to set up multi-factor authentication</p>
            </div>
            
            <div class="config-option">
              <label class="config-label">
                <input type="checkbox" [(ngModel)]="settings.requireMfaForAdmins">
                <span>Require MFA for administrators</span>
              </label>
              <p>Force admin users to use multi-factor authentication</p>
            </div>

            <div class="config-option">
              <label class="config-label">
                <input type="checkbox" [(ngModel)]="settings.allowRememberDevice">
                <span>Allow "Remember this device"</span>
              </label>
              <p>Let users skip MFA on trusted devices for a period</p>
            </div>

            <div class="config-item">
              <label for="rememberDuration">Remember device duration</label>
              <select id="rememberDuration" [(ngModel)]="settings.rememberDuration" class="form-select">
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>
        </div>

        <!-- MFA Methods -->
        <div class="methods-section">
          <h3>Available MFA Methods</h3>
          <div class="methods-grid">
            <div class="method-card">
              <div class="method-header">
                <span class="method-icon">📱</span>
                <div>
                  <h4>Authenticator App</h4>
                  <p>TOTP-based authentication</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="methods.authenticatorApp">
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="method-card">
              <div class="method-header">
                <span class="method-icon">📧</span>
                <div>
                  <h4>Email Verification</h4>
                  <p>Code sent via email</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="methods.emailVerification">
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="method-card">
              <div class="method-header">
                <span class="method-icon">📞</span>
                <div>
                  <h4>SMS Verification</h4>
                  <p>Code sent via SMS</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="methods.smsVerification">
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="method-card">
              <div class="method-header">
                <span class="method-icon">🔑</span>
                <div>
                  <h4>Hardware Keys</h4>
                  <p>FIDO2/WebAuthn keys</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="methods.hardwareKeys">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Backup Codes -->
        <div class="backup-section">
          <h3>Backup & Recovery</h3>
          <div class="backup-options">
            <div class="backup-option">
              <label class="config-label">
                <input type="checkbox" [(ngModel)]="settings.enableBackupCodes">
                <span>Enable backup recovery codes</span>
              </label>
              <p>Allow users to generate one-time backup codes</p>
            </div>
            
            <div class="backup-option">
              <label class="config-label">
                <input type="checkbox" [(ngModel)]="settings.adminCanResetMfa">
                <span>Allow admin MFA reset</span>
              </label>
              <p>Administrators can reset user MFA settings</p>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <button class="btn-primary" (click)="saveSettings()">Save Changes</button>
        <button class="btn-secondary" (click)="generateBackupCodes()">Generate Backup Codes</button>
        <button class="btn-secondary" (click)="testMfa()">Test MFA</button>
      </div>
    </div>
  `,
  styles: [`
    .mfa-settings-container {
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

    .mfa-sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .status-section, .config-section, .methods-section, .backup-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .status-section h3, .config-section h3, .methods-section h3, .backup-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.3rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
    }

    .status-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 10px;
      border: 1px solid #e0e0e0;
    }

    .status-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      border-radius: 10px;
    }

    .status-icon.enabled {
      background: #d4edda;
    }

    .status-info h4 {
      margin: 0 0 0.25rem 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .status-info p {
      margin: 0;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .config-options {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .config-option, .backup-option {
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .config-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
      color: #2c3e50;
      cursor: pointer;
      margin-bottom: 0.5rem;
    }

    .config-option p, .backup-option p {
      color: #7f8c8d;
      font-size: 0.9rem;
      margin: 0;
      margin-left: 2rem;
    }

    .config-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .config-item label {
      color: #2c3e50;
      font-weight: 500;
    }

    .form-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
    }

    .methods-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .method-card {
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 1.5rem;
      background: #fafafa;
    }

    .method-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .method-icon {
      font-size: 2rem;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      border-radius: 8px;
    }

    .method-header h4 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .method-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
      margin-left: auto;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #2196f3;
    }

    input:checked + .slider:before {
      transform: translateX(26px);
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
      .mfa-settings-container {
        padding: 1rem;
      }
      
      .status-cards {
        grid-template-columns: 1fr;
      }
      
      .methods-grid {
        grid-template-columns: 1fr;
      }
      
      .actions-section {
        flex-direction: column;
      }
    }
  `]
})
export class MfaSettingsComponent implements OnInit {
  mfaStats = {
    enrolledUsers: 125,
    totalUsers: 200
  };

  settings = {
    requireMfaForAllUsers: false,
    requireMfaForAdmins: true,
    allowRememberDevice: true,
    rememberDuration: 30,
    enableBackupCodes: true,
    adminCanResetMfa: true
  };

  methods = {
    authenticatorApp: true,
    emailVerification: true,
    smsVerification: false,
    hardwareKeys: false
  };

  constructor() {}

  ngOnInit(): void {
    this.loadMfaSettings();
  }

  loadMfaSettings(): void {
    console.log('Loading MFA settings...');
  }

  saveSettings(): void {
    console.log('Saving MFA settings...', { settings: this.settings, methods: this.methods });
  }

  generateBackupCodes(): void {
    console.log('Generating backup codes...');
  }

  testMfa(): void {
    console.log('Testing MFA configuration...');
  }
} 