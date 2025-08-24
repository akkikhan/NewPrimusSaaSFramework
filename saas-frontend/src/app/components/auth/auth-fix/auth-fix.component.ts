import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { DualAuthService } from '../../../core/services/dual-auth.service';

@Component({
  selector: 'app-auth-fix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-fix-container">
      <div class="auth-fix-card">
        <h1>🔧 Authentication Fix</h1>
        
        <div class="section">
          <h2>Current Status</h2>
          <div class="status-grid">
            <div class="status-item">
              <span class="label">MSAL Accounts:</span>
              <span class="value">{{msalAccounts.length}}</span>
            </div>
            <div class="status-item">
              <span class="label">Active Account:</span>
              <span class="value">{{activeAccount?.username || 'None'}}</span>
            </div>
            <div class="status-item">
              <span class="label">Session Storage Auth:</span>
              <span class="value">{{hasSessionAuth ? 'Yes' : 'No'}}</span>
            </div>
          </div>
        </div>

        <div class="section" *ngIf="errorMessages.length > 0">
          <h2>Errors Found</h2>
          <div class="error-list">
            <div class="error-item" *ngFor="let error of errorMessages">
              {{error}}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Quick Actions</h2>
          <div class="actions">
            <button class="btn btn-primary" (click)="fixAuthentication()">
              Fix Authentication & Go to Dashboard
            </button>
            <button class="btn btn-secondary" (click)="clearAndLogin()">
              Clear Everything & Start Fresh
            </button>
            <button class="btn btn-info" (click)="viewDetails()">
              View Detailed Info
            </button>
          </div>
        </div>

        <div class="section" *ngIf="showDetails">
          <h2>Detailed Information</h2>
          <pre>{{detailedInfo | json}}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-fix-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      padding: 2rem;
    }

    .auth-fix-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      padding: 2.5rem;
      max-width: 600px;
      width: 100%;
    }

    h1 {
      color: #333;
      margin: 0 0 2rem 0;
      text-align: center;
    }

    h2 {
      color: #555;
      margin: 0 0 1rem 0;
      font-size: 1.2rem;
    }

    .section {
      margin-bottom: 2rem;
    }

    .status-grid {
      display: grid;
      gap: 1rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .label {
      font-weight: 600;
      color: #666;
    }

    .value {
      color: #333;
    }

    .error-list {
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 6px;
      padding: 1rem;
    }

    .error-item {
      color: #c00;
      margin-bottom: 0.5rem;
    }

    .error-item:last-child {
      margin-bottom: 0;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5a67d8;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #cbd5e0;
    }

    .btn-info {
      background: #4299e1;
      color: white;
    }

    .btn-info:hover {
      background: #3182ce;
    }

    pre {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.875rem;
    }
  `]
})
export class AuthFixComponent implements OnInit {
  msalAccounts: any[] = [];
  activeAccount: any = null;
  hasSessionAuth = false;
  errorMessages: string[] = [];
  showDetails = false;
  detailedInfo: any = {};

  constructor(
    private msalService: MsalService,
    private dualAuthService: DualAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkCurrentStatus();
  }

  private checkCurrentStatus() {
    // Check MSAL accounts
    this.msalAccounts = this.msalService.instance.getAllAccounts();
    this.activeAccount = this.msalService.instance.getActiveAccount();

    // Check session storage
    const authToken = sessionStorage.getItem('authToken');
    const userData = sessionStorage.getItem('userData');
    this.hasSessionAuth = !!(authToken && userData);

    // Check for errors
    this.errorMessages = [];
    
    // Check for failed requests in localStorage
    const failedRequestsKey = Object.keys(localStorage).find(key => key.includes('failedRequests'));
    if (failedRequestsKey) {
      const failedRequests = localStorage.getItem(failedRequestsKey);
      if (failedRequests?.includes('invalid_resource')) {
        this.errorMessages.push('Invalid resource error detected - API scope configuration issue');
      }
    }

    // Check for account mismatch
    if (this.msalAccounts.length > 0 && !this.activeAccount) {
      this.errorMessages.push('MSAL accounts found but no active account set');
    }

    // Check for session mismatch
    if (this.activeAccount && !this.hasSessionAuth) {
      this.errorMessages.push('Active MSAL account but no session storage auth data');
    }
  }

  fixAuthentication() {
    console.log('🔧 Fixing authentication...');

    // Clear any failed requests
    Object.keys(localStorage).forEach(key => {
      if (key.includes('failedRequests')) {
        localStorage.removeItem(key);
      }
    });

    if (this.activeAccount) {
      // We have an active account, set up the session
      const userData = {
        id: this.activeAccount.localAccountId,
        email: this.activeAccount.username,
        name: this.activeAccount.name || this.activeAccount.username,
        role: 'PlatformAdmin',
        tenantId: null,
        isPlatformAdmin: true
      };

      // Set session storage
      sessionStorage.setItem('authToken', 'dummy-token-for-fix');
      sessionStorage.setItem('userData', JSON.stringify(userData));
      sessionStorage.setItem('userRole', 'PlatformAdmin');

      // Update dual auth service
      this.dualAuthService.setUserProfile(userData);

      console.log('✅ Authentication fixed, redirecting to dashboard...');
      this.router.navigate(['/dashboard']);
    } else if (this.msalAccounts.length > 0) {
      // We have accounts but no active one, set the first as active
      this.msalService.instance.setActiveAccount(this.msalAccounts[0]);
      this.fixAuthentication(); // Retry
    } else {
      alert('No Azure AD accounts found. Please login first.');
      this.router.navigate(['/login']);
    }
  }

  clearAndLogin() {
    console.log('🧹 Clearing all authentication data...');

    // Clear all MSAL data
    this.msalService.instance.clearCache();

    // Clear all storage
    sessionStorage.clear();
    localStorage.clear();

    console.log('✅ All cleared, redirecting to login...');
    this.router.navigate(['/login']);
  }

  viewDetails() {
    this.showDetails = !this.showDetails;
    
    if (this.showDetails) {
      this.detailedInfo = {
        msalAccounts: this.msalAccounts,
        activeAccount: this.activeAccount,
        sessionStorage: {
          authToken: sessionStorage.getItem('authToken'),
          userData: sessionStorage.getItem('userData'),
          userRole: sessionStorage.getItem('userRole')
        },
        localStorage: {
          saasfactory_user: localStorage.getItem('saasfactory_user'),
          failedRequests: Object.keys(localStorage)
            .filter(key => key.includes('failedRequests'))
            .reduce((acc, key) => ({...acc, [key]: localStorage.getItem(key)}), {})
        }
      };
    }
  }
}
