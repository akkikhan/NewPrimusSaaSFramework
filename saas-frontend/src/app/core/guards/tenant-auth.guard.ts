import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { TenantAuthService } from '../../services/tenant-auth.service';
import { environment } from '../../../environments/environment';

/**
 * Tenant Authentication Guard
 * 
 * This guard:
 * 1. Extracts tenant ID from URL
 * 2. Validates tenant exists
 * 3. Loads tenant configuration
 * 4. Checks if user is authenticated for this tenant
 * 5. Redirects to Azure AD if not authenticated
 * 6. Allows access if authenticated
 */
export const tenantAuthGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean> => {
  const router = inject(Router);
  const tenantService = inject(TenantService);
  const tenantAuthService = inject(TenantAuthService);

  try {
    // Extract tenant ID from route parameters
    const tenantId = route.params['tenantId'];
    
    if (!tenantId) {
      console.error('❌ [TenantAuthGuard] No tenant ID in route parameters');
      router.navigate(['/'], { 
        queryParams: { error: 'invalid_tenant' } 
      });
      return false;
    }

    if (environment.features?.enableDebugLogs) {
      console.log(`🔐 [TenantAuthGuard] Checking access for tenant: ${tenantId}`);
    }

    // Step 1: Check if tenant exists and load configuration
    let tenantConfig;
    try {
      tenantConfig = await tenantService.loadTenantConfig(tenantId);
    } catch (error) {
      console.error(`❌ [TenantAuthGuard] Failed to load tenant config for ${tenantId}:`, error);
      
      // Redirect to error page with appropriate message
      if ((error as Error).message.includes('not found')) {
        router.navigate(['/'], { 
          queryParams: { 
            error: 'tenant_not_found',
            tenantId: tenantId
          } 
        });
      } else {
        router.navigate(['/'], { 
          queryParams: { 
            error: 'tenant_config_error',
            tenantId: tenantId
          } 
        });
      }
      return false;
    }

    // Step 2: Check if tenant is active
    if (tenantConfig.status !== 'active') {
      console.warn(`⚠️ [TenantAuthGuard] Tenant ${tenantId} is not active (status: ${tenantConfig.status})`);
      router.navigate(['/'], { 
        queryParams: { 
          error: 'tenant_inactive',
          tenantId: tenantId
        } 
      });
      return false;
    }

    // Step 3: Handle special routes that don't require authentication
    const path = route.routeConfig?.path || '';
    const isAuthCallback = path.includes('auth/callback');
    const isLoginPage = path.includes('login');

    if (isAuthCallback) {
      if (environment.features?.enableDebugLogs) {
        console.log(`🔐 [TenantAuthGuard] Allowing auth callback for tenant: ${tenantId}`);
      }
      return true;
    }

    if (isLoginPage) {
      if (environment.features?.enableDebugLogs) {
        console.log(`🔐 [TenantAuthGuard] Allowing login page for tenant: ${tenantId}`);
      }
      return true;
    }

    // Step 4: Check if user is already authenticated for this tenant
    const isAuthenticated = await tenantAuthService.isAuthenticated(tenantId);
    
    if (isAuthenticated) {
      if (environment.features?.enableDebugLogs) {
        console.log(`✅ [TenantAuthGuard] User already authenticated for tenant: ${tenantId}`);
      }
      return true;
    }

    // Step 5: User is not authenticated - initiate Azure AD login
    if (environment.features?.enableDebugLogs) {
      console.log(`🔐 [TenantAuthGuard] User not authenticated for tenant ${tenantId}, initiating Azure AD login`);
    }

    try {
      await tenantAuthService.initiateAzureAdLogin(tenantConfig);
      // The login redirect will handle navigation, so we return false here
      return false;
    } catch (loginError) {
      console.error(`❌ [TenantAuthGuard] Failed to initiate login for tenant ${tenantId}:`, loginError);
      router.navigate(['/tenants', tenantId, 'login'], {
        queryParams: { 
          error: 'login_failed',
          returnUrl: state.url
        }
      });
      return false;
    }

  } catch (error) {
    console.error('❌ [TenantAuthGuard] Unexpected error:', error);
    router.navigate(['/'], { 
      queryParams: { error: 'guard_error' } 
    });
    return false;
  }
};

/**
 * Tenant Guest Guard
 * 
 * Prevents authenticated tenant users from accessing login pages
 */
export const tenantGuestGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean> => {
  const router = inject(Router);
  const tenantAuthService = inject(TenantAuthService);

  const tenantId = route.params['tenantId'];
  
  if (!tenantId) {
    return true; // Let other guards handle invalid tenant ID
  }

  const isAuthenticated = await tenantAuthService.isAuthenticated(tenantId);
  
  if (isAuthenticated) {
    // Redirect authenticated users to dashboard
    router.navigate(['/tenants', tenantId, 'dashboard']);
    return false;
  }

  return true;
};

/**
 * Tenant Exists Guard
 * 
 * Simple guard to check if tenant exists without full authentication
 */
export const tenantExistsGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean> => {
  const router = inject(Router);
  const tenantService = inject(TenantService);

  const tenantId = route.params['tenantId'];
  
  if (!tenantId) {
    router.navigate(['/']);
    return false;
  }

  try {
    const exists = await firstValueFrom(tenantService.tenantExists(tenantId));
    
    if (!exists) {
      router.navigate(['/'], { 
        queryParams: { 
          error: 'tenant_not_found',
          tenantId: tenantId
        } 
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ [TenantExistsGuard] Error checking tenant ${tenantId}:`, error);
    // In case of error, allow access (service might be down)
    return true;
  }
};
