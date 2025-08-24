import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-simple-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <div class="card">
        <h1>SaaS Factory Platform</h1>
        <h2>Administrator Login</h2>
        
        <button class="login-btn" (click)="login()">
          <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
            <path d="M11 0H0V11H11V0Z" fill="#F25022"/>
            <path d="M23 0H12V11H23V0Z" fill="#7FBA00"/>
            <path d="M11 12H0V23H11V12Z" fill="#00A4EF"/>
            <path d="M23 12H12V23H23V12Z" fill="#FFB900"/>
          </svg>
          Sign in with Microsoft
        </button>
        
        <p class="info">Use your Azure AD account to sign in</p>
        
        <div class="debug">
          <button (click)="clearStorage()">Clear Storage & Retry</button>
          <button (click)="forceLogin()">Force Dashboard Access</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .card {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
    }
    
    h1 {
      color: #333;
      margin: 0 0 0.5rem 0;
    }
    
    h2 {
      color: #666;
      font-weight: normal;
      margin: 0 0 2rem 0;
      font-size: 1.2rem;
    }
    
    .login-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 12px 24px;
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .login-btn:hover {
      background: #106ebe;
    }
    
    .info {
      margin-top: 1rem;
      color: #666;
      font-size: 14px;
    }
    
    .debug {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #eee;
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    
    .debug button {
      padding: 8px 16px;
      background: #f0f0f0;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    
    .debug button:hover {
      background: #e0e0e0;
    }
  `]
})
export class SimpleLoginComponent {
  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}

  async login() {
    try {
      // Clear any existing errors
      this.clearFailedRequests();
      
      // Simple login request with only Graph scopes
      const loginRequest = {
        scopes: ['openid', 'profile', 'email', 'User.Read']
      };
      
      // Use loginPopup for immediate feedback
      const response = await this.msalService.loginPopup(loginRequest).toPromise();
      
      if (response && response.account) {
        console.log('✅ Login successful:', response.account.username);
        
        // Set the account as active
        this.msalService.instance.setActiveAccount(response.account);
        
        // Store auth data
        const userData = {
          id: response.account.localAccountId,
          email: response.account.username,
          name: response.account.name || response.account.username,
          role: 'PlatformAdmin',
          isPlatformAdmin: true
        };
        
        sessionStorage.setItem('authToken', response.accessToken);
        sessionStorage.setItem('userData', JSON.stringify(userData));
        
        // Navigate to dashboard
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check the console for details.');
    }
  }
  
  clearStorage() {
    sessionStorage.clear();
    localStorage.clear();
    this.clearFailedRequests();
    alert('Storage cleared. Try logging in again.');
  }
  
  forceLogin() {
    // Force authentication state for testing
    const userData = {
      id: 'test-user',
      email: 'admin@saasfactory.com',
      name: 'Test Admin',
      role: 'PlatformAdmin',
      isPlatformAdmin: true
    };
    
    sessionStorage.setItem('authToken', 'force-token');
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    this.router.navigate(['/dashboard']);
  }
  
  private clearFailedRequests() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('failedRequests') || key.includes('server-telemetry'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}
