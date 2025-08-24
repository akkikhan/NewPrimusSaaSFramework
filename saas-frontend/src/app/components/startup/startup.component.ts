import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-startup',
  standalone: true,
  template: `
    <div class="startup-container">
      <div class="loading-content">
        <div class="spinner"></div>
        <h2>SaaS Factory</h2>
        <p>Initializing...</p>
      </div>
    </div>
  `,
  styles: [`
    .startup-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .loading-content {
      text-align: center;
      color: white;
    }
    
    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      margin: 0 auto 2rem;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    h2 {
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
    }
    
    p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
  `]
})
export class StartupComponent implements OnInit {
  
  constructor(
    private router: Router,
    private msalService: MsalService
  ) {}
  
  ngOnInit() {
    this.checkAuthAndRoute();
  }
  
  private async checkAuthAndRoute() {
    // Give MSAL time to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check session storage first
    const authToken = sessionStorage.getItem('authToken');
    const userRole = sessionStorage.getItem('userRole');
    
    if (authToken && userRole) {
      console.log('✅ [Startup] Found session auth, role:', userRole);
      
      if (userRole === 'PlatformAdmin') {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      } else if (userRole === 'TenantAdmin') {
        this.router.navigate(['/tenant-portal'], { replaceUrl: true });
      } else {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
      return;
    }
    
    // Check MSAL
    try {
      const accounts = this.msalService.instance.getAllAccounts();
      if (accounts && accounts.length > 0) {
        console.log('✅ [Startup] Found MSAL account');
        this.msalService.instance.setActiveAccount(accounts[0]);
        
        // Set up session
        const account = accounts[0];
        const userData = {
          id: account.localAccountId,
          email: account.username,
          name: account.name || account.username,
          role: 'PlatformAdmin',
          isPlatformAdmin: true,
          tenantId: null
        };
        
        sessionStorage.setItem('authToken', 'msal-active');
        sessionStorage.setItem('userData', JSON.stringify(userData));
        sessionStorage.setItem('userRole', 'PlatformAdmin');
        
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      } else {
        console.log('❌ [Startup] No authentication found, redirecting to login');
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    } catch (error) {
      console.error('❌ [Startup] Error checking auth:', error);
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
