import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: `
    <div class="logout-container">
      <h2>Logging out...</h2>
      <p>Please wait while we sign you out and clear your session.</p>
      <div class="loading-spinner"></div>
    </div>
  `,
  styles: [`
    .logout-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 2s linear infinite;
      margin-top: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LogoutComponent implements OnInit {
  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}

  async ngOnInit() {
    console.log('🔄 [Logout] Starting logout process...');
    await this.performCompleteLogout();
  }

  private async performCompleteLogout(): Promise<void> {
    try {
      // 1. Clear all local storage items related to MSAL and our app
      this.clearAllCache();
      
      // 2. Clear session storage
      sessionStorage.clear();
      
      // 3. Clear MSAL cache
      const accounts = this.msalService.instance.getAllAccounts();
      console.log('🔄 [Logout] Found accounts to clear:', accounts.length);
      
      // Clear the cache
      try {
        // Use the clearCache method which is available
        await this.msalService.instance.clearCache();
        console.log('✅ [Logout] Cleared MSAL cache');
      } catch (error) {
        console.warn('⚠️ [Logout] Error clearing MSAL cache:', error);
      }
      
      // 4. Clear active account
      this.msalService.instance.setActiveAccount(null);
      
      // 5. Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 6. Perform Azure AD logout (this will redirect to Azure AD logout page)
      const logoutRequest = {
  postLogoutRedirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '/') + '/login',
  mainWindowRedirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '/') + '/login'
      };
      
      console.log('🔄 [Logout] Redirecting to Azure AD logout...');
      await this.msalService.logoutRedirect(logoutRequest);
      
    } catch (error) {
      console.error('❌ [Logout] Error during logout:', error);
      // Even if logout fails, redirect to login
      this.clearAllCache();
      sessionStorage.clear();
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  private clearAllCache(): void {
    try {
      // Clear all localStorage items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('msal') || 
          key.includes('5e65bf41-d3de-4a1b-9311-46b292b88c94') ||
          key.includes('authToken') ||
          key.includes('userRole') ||
          key.includes('tenant') ||
          key.includes('auth')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🧹 [Logout] Removed from localStorage:', key);
      });
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      console.log('✅ [Logout] All cache cleared');
    } catch (error) {
      console.error('❌ [Logout] Error clearing cache:', error);
    }
  }
}
