import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-redirect-handler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="redirect-container">
      <div class="content">
        <h1>🔄 Processing Authentication...</h1>
        <div class="status">
          <p>{{statusMessage}}</p>
          <div class="spinner"></div>
        </div>
        
        <div class="debug-info" *ngIf="showDebug">
          <h3>Debug Information:</h3>
          <pre>{{debugInfo | json}}</pre>
        </div>
        
        <button (click)="forceRedirect()" class="force-btn">
          Force Redirect to Dashboard
        </button>
      </div>
    </div>
  `,
  styles: [`
    .redirect-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }
    
    .content {
      text-align: center;
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 500px;
    }
    
    h1 {
      color: #333;
      margin-bottom: 2rem;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      margin: 2rem auto;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .debug-info {
      margin-top: 2rem;
      text-align: left;
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
    }
    
    .debug-info h3 {
      margin: 0 0 1rem 0;
      color: #666;
    }
    
    pre {
      margin: 0;
      font-size: 0.875rem;
      overflow-x: auto;
    }
    
    .force-btn {
      margin-top: 2rem;
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    
    .force-btn:hover {
      background: #5a67d8;
    }
  `]
})
export class RedirectHandlerComponent implements OnInit {
  statusMessage = 'Completing authentication...';
  showDebug = true;
  debugInfo: any = {};
  
  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}
  
  async ngOnInit() {
    console.log('🔄 [Redirect Handler] Processing redirect...');
    console.log('🔍 [Redirect Handler] Current URL:', window.location.href);
    
    // Gather debug info
    this.gatherDebugInfo();
    
    try {
      // First, let MSAL handle the redirect response
      console.log('🔄 [Redirect Handler] Calling handleRedirectPromise...');
      const result = await this.msalService.instance.handleRedirectPromise();
      
      if (result) {
        console.log('✅ [Redirect Handler] Redirect handled successfully!');
        console.log('👤 [Redirect Handler] Account:', result.account?.username);
        console.log('🎫 [Redirect Handler] Token:', !!result.accessToken);
        
        this.statusMessage = `Authenticated as ${result.account?.username}. Redirecting...`;
        
        // Set active account
        this.msalService.instance.setActiveAccount(result.account);
        
        // Setup session
        this.setupSession(result.account);
        
        // Navigate to dashboard
        setTimeout(() => {
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }, 1000);
        
      } else {
        console.log('ℹ️ [Redirect Handler] No redirect result - checking for existing account...');
        
        // Check for existing authentication
        const account = this.msalService.instance.getActiveAccount();
        if (account) {
          console.log('✅ [Redirect Handler] Found existing account:', account.username);
          this.statusMessage = `Already authenticated as ${account.username}. Redirecting...`;
          this.setupSession(account);
          setTimeout(() => {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }, 1000);
        } else {
          console.log('❌ [Redirect Handler] No account found, redirecting to login...');
          this.statusMessage = 'Authentication required. Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/login'], { replaceUrl: true });
          }, 1500);
        }
      }
      
    } catch (error) {
      console.error('❌ [Redirect Handler] Error processing redirect:', error);
      this.statusMessage = 'Authentication error. Redirecting to login...';
      setTimeout(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
      }, 2000);
    }
  }
  
  private gatherDebugInfo() {
    const url = new URL(window.location.href);
    
    this.debugInfo = {
      currentUrl: window.location.href,
      hasCode: url.searchParams.has('code'),
      hasState: url.searchParams.has('state'),
      hasError: url.searchParams.has('error'),
      errorDescription: url.searchParams.get('error_description'),
      accounts: this.msalService.instance.getAllAccounts().length,
      activeAccount: this.msalService.instance.getActiveAccount()?.username || 'None',
      sessionAuth: !!sessionStorage.getItem('authToken'),
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 [Redirect Handler] Debug info:', this.debugInfo);
  }
  
  private setupSession(account: any) {
    const userData = {
      id: account.localAccountId,
      email: account.username,
      name: account.name || account.username,
      role: 'PlatformAdmin',
      tenantId: null,
      isPlatformAdmin: true
    };
    
    sessionStorage.setItem('authToken', 'msal-redirect');
    sessionStorage.setItem('userData', JSON.stringify(userData));
    sessionStorage.setItem('userRole', 'PlatformAdmin');
    
    console.log('✅ [Redirect Handler] Session established');
  }
  
  forceRedirect() {
    console.log('🚀 [Redirect Handler] Forcing redirect to dashboard...');
    window.location.href = '/dashboard';
  }
}
