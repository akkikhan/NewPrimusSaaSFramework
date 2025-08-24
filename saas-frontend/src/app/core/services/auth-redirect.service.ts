import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectService {
  
  constructor(
    private msalService: MsalService,
    private router: Router
  ) {}

  /**
   * Check authentication state and redirect accordingly
   */
  checkAuthAndRedirect(): void {
    console.log('🔍 [Auth Redirect] Checking authentication state...');
    
    // First check session storage
    const authToken = sessionStorage.getItem('authToken');
    const userRole = sessionStorage.getItem('userRole');
    const userData = sessionStorage.getItem('userData');
    
    if (authToken && userRole && userData) {
      console.log('✅ [Auth Redirect] Found session auth, role:', userRole);
      this.redirectBasedOnRole(userRole);
      return;
    }
    
    // Check MSAL account
    const account = this.msalService.instance.getActiveAccount();
    if (account) {
      console.log('✅ [Auth Redirect] Found MSAL account:', account.username);
      
      // Set up session storage
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
      
      this.redirectBasedOnRole('PlatformAdmin');
      return;
    }
    
    console.log('❌ [Auth Redirect] No authentication found');
  }
  
  /**
   * Redirect based on user role
   */
  private redirectBasedOnRole(role: string): void {
    const currentPath = this.router.url;
    
    // Don't redirect if already on the correct page
    if (role === 'PlatformAdmin' && !currentPath.includes('/dashboard')) {
      console.log('🚀 [Auth Redirect] Redirecting to platform admin dashboard');
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    } else if (role === 'TenantAdmin' && !currentPath.includes('/tenant-portal')) {
      console.log('🚀 [Auth Redirect] Redirecting to tenant portal');
      this.router.navigate(['/tenant-portal'], { replaceUrl: true });
    }
  }
  
  /**
   * Clear authentication and redirect to login
   */
  clearAuthAndRedirect(): void {
    console.log('🧹 [Auth Redirect] Clearing auth and redirecting to login');
    
    // Clear session storage
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('tenantId');
    
    // Clear MSAL
    this.msalService.instance.clearCache();
    
    // Navigate to login
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
