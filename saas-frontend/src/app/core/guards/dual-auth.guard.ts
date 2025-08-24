import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Check session storage for any auth token
  const authToken = sessionStorage.getItem('authToken');
  const userData = sessionStorage.getItem('userData');
  
  if (authToken && userData) {
    return true;
  }
  
  // Redirect to login with return URL
  router.navigate(['/login'], { 
    queryParams: { returnUrl: state.url } 
  });
  return false;
};

/**
 * Platform Admin Guard - Only allows platform admins
 */
export const platformAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const userData = sessionStorage.getItem('userData');
  if (userData) {
    const user = JSON.parse(userData);
    if (user.role === 'PlatformAdmin' || user.isPlatformAdmin) {
      return true;
    }
  }
  
  router.navigate(['/unauthorized']);
  return false;
};

/**
 * Tenant Admin Guard - Only allows tenant admins
 */
export const tenantAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const userData = sessionStorage.getItem('userData');
  if (userData) {
    const user = JSON.parse(userData);
    if (user.role === 'TenantAdmin' || user.role === 'TenantUser') {
      return true;
    }
  }
  
  router.navigate(['/unauthorized']);
  return false;
};

/**
 * Guest Guard - Prevents authenticated users from accessing login
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const msalService = inject(MsalService);
  
  // Check session storage
  const authToken = sessionStorage.getItem('authToken');
  const userRole = sessionStorage.getItem('userRole');
  
  if (authToken && userRole) {
    // Redirect based on role
    if (userRole === 'PlatformAdmin') {
      router.navigate(['/dashboard']);
    } else if (userRole === 'TenantAdmin') {
      router.navigate(['/tenant-portal']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  
  // Check MSAL
  const account = msalService.instance.getActiveAccount();
  if (account) {
    router.navigate(['/dashboard']);
    return false;
  }
  
  return true;
};

/**
 * Role Guard - Generic role-based guard
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const router = inject(Router);
    
    const userData = sessionStorage.getItem('userData');
    if (!userData) {
      router.navigate(['/login']);
      return false;
    }
    
    const user = JSON.parse(userData);
    if (allowedRoles.includes(user.role)) {
      return true;
    }
    
    router.navigate(['/unauthorized']);
    return false;
  };
};

/**
 * Admin Guard - Allows both platform and tenant admins
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const userData = sessionStorage.getItem('userData');
  if (userData) {
    const user = JSON.parse(userData);
    if (user.role === 'PlatformAdmin' || user.role === 'TenantAdmin' || user.isPlatformAdmin) {
      return true;
    }
  }
  
  router.navigate(['/unauthorized']);
  return false;
};
