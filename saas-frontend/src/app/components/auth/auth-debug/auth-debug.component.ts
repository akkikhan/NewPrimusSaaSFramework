import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';

@Component({
  selector: 'app-auth-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="debug-container">
      <h1>Azure AD Authentication Debug</h1>
      
      <div class="section">
        <h2>MSAL Configuration</h2>
        <pre>{{ msalConfig | json }}</pre>
      </div>

      <div class="section">
        <h2>Current Accounts</h2>
        <pre>{{ accounts | json }}</pre>
      </div>

      <div class="section">
        <h2>Session Storage</h2>
        <pre>{{ sessionData | json }}</pre>
      </div>

      <div class="section">
        <h2>Local Storage (MSAL)</h2>
        <pre>{{ msalCache | json }}</pre>
      </div>

      <div class="section">
        <h2>Actions</h2>
        <button (click)="testLogin()">Test Login (Graph API only)</button>
        <button (click)="testLoginWithBackend()">Test Login (With Backend API)</button>
        <button (click)="getToken()">Get Access Token</button>
        <button (click)="clearCache()">Clear All Cache</button>
      </div>

      <div class="section" *ngIf="lastResult">
        <h2>Last Result</h2>
        <pre>{{ lastResult | json }}</pre>
      </div>

      <div class="section" *ngIf="lastError">
        <h2>Last Error</h2>
        <pre class="error">{{ lastError | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .debug-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .section {
      margin: 20px 0;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    h2 {
      margin-top: 0;
      color: #333;
    }

    pre {
      background: white;
      padding: 10px;
      border-radius: 4px;
      overflow: auto;
      font-size: 12px;
    }

    .error {
      background: #fee;
      color: #c00;
    }

    button {
      margin-right: 10px;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    button:hover {
      background: #0056b3;
    }
  `]
})
export class AuthDebugComponent implements OnInit {
  msalConfig: any = {};
  accounts: AccountInfo[] = [];
  sessionData: any = {};
  msalCache: any = {};
  lastResult: any = null;
  lastError: any = null;

  constructor(private msalService: MsalService) {}

  ngOnInit() {
    this.loadDebugInfo();
  }

  loadDebugInfo() {
    // Get MSAL configuration (hardcoded since instance doesn't expose config)
    this.msalConfig = {
      clientId: '5e65bf41-d3de-4a1b-9311-46b292b88c94', // Platform Admin app registration
      authority: 'https://login.microsoftonline.com/khanaakiboutlook.onmicrosoft.com',
  redirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '/'),
      note: 'Configuration from MSALInstanceFactory'
    };

    // Get accounts
    this.accounts = this.msalService.instance.getAllAccounts();

    // Get session storage
    this.sessionData = {
      authToken: sessionStorage.getItem('authToken'),
      userData: sessionStorage.getItem('userData'),
      userRole: sessionStorage.getItem('userRole')
    };

    // Get MSAL cache from local storage
    this.msalCache = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('msal')) {
        this.msalCache[key] = localStorage.getItem(key);
      }
    }
  }

  async testLogin() {
    try {
      this.lastError = null;
      console.log('🔐 Testing login with Graph API scopes only...');
      
      await this.msalService.loginRedirect({
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        prompt: 'select_account'
      });
    } catch (error) {
      console.error('❌ Login failed:', error);
      this.lastError = error;
    }
  }

  async testLoginWithBackend() {
    try {
      this.lastError = null;
      console.log('🔐 Testing login with backend API scope...');
      
      await this.msalService.loginRedirect({
        scopes: ['openid', 'profile', 'email', 'User.Read', 'api://4c024768-9d55-4193-9956-ac3a9686cdd0/access_as_user'],
        prompt: 'select_account'
      });
    } catch (error) {
      console.error('❌ Login with backend scope failed:', error);
      this.lastError = error;
    }
  }

  async getToken() {
    try {
      this.lastError = null;
      const accounts = this.msalService.instance.getAllAccounts();
      
      if (accounts.length === 0) {
        this.lastError = 'No accounts found. Please login first.';
        return;
      }

      console.log('🎫 Getting access token...');
      
      // Try backend API scope
      try {
        const response = await this.msalService.acquireTokenSilent({
          scopes: ['api://4c024768-9d55-4193-9956-ac3a9686cdd0/access_as_user'],
          account: accounts[0]
        }).toPromise();
        
        if (response) {
          this.lastResult = {
            tokenType: 'Backend API Token',
            accessToken: response.accessToken.substring(0, 50) + '...',
            scopes: response.scopes,
            expiresOn: response.expiresOn
          };
          sessionStorage.setItem('authToken', response.accessToken);
        }
      } catch (backendError) {
        console.warn('⚠️ Backend token failed, trying Graph API token...');
        
        const response = await this.msalService.acquireTokenSilent({
          scopes: ['User.Read'],
          account: accounts[0]
        }).toPromise();
        
        if (response) {
          this.lastResult = {
            tokenType: 'Graph API Token',
            accessToken: response.accessToken.substring(0, 50) + '...',
            scopes: response.scopes,
            expiresOn: response.expiresOn,
            note: 'Backend API token failed, using Graph API token as fallback'
          };
          sessionStorage.setItem('authToken', response.accessToken);
        }
      }
    } catch (error) {
      console.error('❌ Token acquisition failed:', error);
      this.lastError = error;
    }
  }

  clearCache() {
    console.log('🧹 Clearing all authentication cache...');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear MSAL cache from local storage
    const msalKeys = Object.keys(localStorage).filter(key => key.includes('msal'));
    msalKeys.forEach(key => localStorage.removeItem(key));
    
    this.lastResult = 'All cache cleared. Please refresh the page.';
    this.loadDebugInfo();
  }
}