import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn, CanMatchFn } from '@angular/router';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { EnhancedAuthService } from '../services/enhanced-auth.service';
import { environment } from '../../../environments/environment';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(EnhancedAuthService);
  const router = inject(Router);

  // Check session storage first for immediate auth state
  const authToken = sessionStorage.getItem('authToken');
  const userData = sessionStorage.getItem('userData');
  
  if (authToken && userData) {
    console.log('✅ [Auth Guard] User authenticated via session storage');
    return true;
  }

  // Fall back to auth service check
  return authService.isLoading$.pipe(
    switchMap(isLoading => {
      if (isLoading) {
        console.log('🔄 [Auth Guard] Waiting for auth service to load...');
        // If loading, wait for it to complete
        return authService.isLoading$.pipe(
          map(loading => !loading),
    take(1),
          switchMap(() => authService.isAuthenticated$.pipe(take(1)))
        );
      } else {
        // If not loading, check auth state immediately
        return authService.isAuthenticated$.pipe(take(1));
      }
    }),
    map(isAuthenticated => {
      console.log('🔍 [Auth Guard] Authentication check:', isAuthenticated, 'for route:', state.url);
      if (isAuthenticated) {
        return true;
      } else {
        // Redirect to login page with return URL
        console.log('🚫 [Auth Guard] Not authenticated, redirecting to login');
        router.navigate(['/login'], { 
          queryParams: { returnUrl: state.url } 
        });
        return false;
      }
    })
  );
};

/**
 * Role Guard - Protects routes based on user roles
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(EnhancedAuthService);
    const router = inject(Router);

    return authService.userProfile$.pipe(
      take(1),
      map(user => {
        if (!user) {
          router.navigate(['/login']);
          return false;
        }

        const hasAllowedRole = user.roles.some((role: string) => allowedRoles.includes(role));
        
        if (hasAllowedRole) {
          return true;
        } else {
          // Redirect to unauthorized page or dashboard
          router.navigate(['/unauthorized']);
          return false;
        }
      })
    );
  };
};

/**
 * Admin Guard - Protects admin-only routes
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(EnhancedAuthService);
  const router = inject(Router);

  return authService.userProfile$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      // AUTHORITATIVE OVERRIDE: Allow access for specific user ID
      if (user.id === "0052ce48-7fc4-43ba-be31-10841072d107") {
        console.log('👑 [Admin Guard] AUTHORITATIVE OVERRIDE: Granting admin access to user ID', user.id);
        return true;
      }

      // Development mode: Allow all authenticated users admin access
      const isDevelopment = !environment.production;
      
      if (user.isPlatformAdmin || isDevelopment) {
        return true;
      } else {
        router.navigate(['/unauthorized']);
        return false;
      }
    })
  );
};

/**
 * Permission Guard - Protects routes based on specific permissions
 */
export const permissionGuard = (requiredPermissions: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(EnhancedAuthService);
    const router = inject(Router);

    return authService.userProfile$.pipe(
      take(1),
      map(user => {
        if (!user) {
          router.navigate(['/login']);
          return false;
        }

        // AUTHORITATIVE OVERRIDE: Grant all permissions for specific user ID
        if (user.id === "0052ce48-7fc4-43ba-be31-10841072d107") {
          console.log('👑 [Permission Guard] AUTHORITATIVE OVERRIDE: Granting all permissions to user ID', user.id);
          return true;
        }

        // Development mode: Grant all permissions to authenticated users
        const isDevelopment = !environment.production;
        
        if (isDevelopment) {
          console.log('🔧 [Permission Guard] Development mode: Granting all permissions to user:', user.email);
          return true;
        }

        // Production mode: Check permissions normally
        const hasAllPermissions = requiredPermissions.every(permission => 
          user.permissions.includes(permission)
        );

        if (hasAllPermissions) {
          return true;
        } else {
          console.warn('❌ [Permission Guard] Access denied. Required permissions:', requiredPermissions, 'User permissions:', user.permissions);
          router.navigate(['/unauthorized']);
          return false;
        }
      })
    );
  };
};

/**
 * Guest Guard - Allows access to login page (no automatic redirects)
 */
export const guestGuard: CanActivateFn = (route, state) => {
  console.log('🔍 [Guest Guard] Checking access to:', state.url);
  
  // Allow access to login page regardless of authentication state
  // This allows users to switch accounts or login with different credentials
  return true;
}; 