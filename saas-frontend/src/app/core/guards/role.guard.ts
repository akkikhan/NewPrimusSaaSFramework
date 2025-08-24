import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Platform Admin Guard - Only allows platform admins
 */
export const platformAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Check session storage for user data
  const userDataStr = sessionStorage.getItem('userData');
  const userRole = sessionStorage.getItem('userRole');
  
  if (!userDataStr) {
    console.log('🚫 [Platform Admin Guard] No user data found');
    router.navigate(['/login']);
    return false;
  }
  
  try {
    const userData = JSON.parse(userDataStr);
    
    // Check if user is a platform admin
    if (userRole === 'PlatformAdmin' || userData.role === 'PlatformAdmin') {
      console.log('✅ [Platform Admin Guard] Access granted to platform admin');
      return true;
    } else {
      console.log('🚫 [Platform Admin Guard] Access denied - not a platform admin');
      router.navigate(['/unauthorized']);
      return false;
    }
  } catch (error) {
    console.error('❌ [Platform Admin Guard] Error parsing user data:', error);
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Tenant Admin Guard - Only allows tenant admins for their specific tenant
 */
export const tenantAdminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const router = inject(Router);
  
  // Get tenant ID from route
  const routeTenantId = route.params['tenantId'] || route.queryParams['tenantId'];
  
  // Check session storage for user data
  const userDataStr = sessionStorage.getItem('userData');
  const userRole = sessionStorage.getItem('userRole');
  const currentTenantId = sessionStorage.getItem('currentTenantId');
  
  if (!userDataStr) {
    console.log('🚫 [Tenant Admin Guard] No user data found');
    router.navigate(['/login']);
    return false;
  }
  
  try {
    const userData = JSON.parse(userDataStr);
    
    // Check if user is a tenant admin
    if (userRole === 'TenantAdmin' || userData.role === 'TenantAdmin') {
      // If route has tenant ID, verify it matches
      if (routeTenantId && userData.tenantId !== routeTenantId) {
        console.log('🚫 [Tenant Admin Guard] Tenant ID mismatch');
        router.navigate(['/unauthorized']);
        return false;
      }
      
      console.log('✅ [Tenant Admin Guard] Access granted to tenant admin');
      return true;
    } else {
      console.log('🚫 [Tenant Admin Guard] Access denied - not a tenant admin');
      router.navigate(['/unauthorized']);
      return false;
    }
  } catch (error) {
    console.error('❌ [Tenant Admin Guard] Error parsing user data:', error);
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Combined Role Guard - Allows both platform and tenant admins
 */
export const adminOrTenantGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const userDataStr = sessionStorage.getItem('userData');
  const userRole = sessionStorage.getItem('userRole');
  
  if (!userDataStr) {
    console.log('🚫 [Admin/Tenant Guard] No user data found');
    router.navigate(['/login']);
    return false;
  }
  
  try {
    const userData = JSON.parse(userDataStr);
    
    if (userRole === 'PlatformAdmin' || userRole === 'TenantAdmin' || 
        userData.role === 'PlatformAdmin' || userData.role === 'TenantAdmin') {
      console.log('✅ [Admin/Tenant Guard] Access granted');
      return true;
    } else {
      console.log('🚫 [Admin/Tenant Guard] Access denied - invalid role');
      router.navigate(['/unauthorized']);
      return false;
    }
  } catch (error) {
    console.error('❌ [Admin/Tenant Guard] Error parsing user data:', error);
    router.navigate(['/login']);
    return false;
  }
};
