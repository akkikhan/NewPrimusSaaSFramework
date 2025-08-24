import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { LocalAuthService } from '../services/local-auth.service';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(LocalAuthService);
  const router = inject(Router);

  // Check session storage first
  const currentUser = sessionStorage.getItem('currentUser');
  if (currentUser) {
    return true;
  }

  // Check auth service
  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      } else {
        // Redirect to login with return URL
        router.navigate(['/login'], { 
          queryParams: { returnUrl: state.url } 
        });
        return false;
      }
    })
  );
};

/**
 * Admin Guard - Protects admin-only routes
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(LocalAuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.isPlatformAdmin) {
    return true;
  } else {
    router.navigate(['/unauthorized']);
    return false;
  }
};

/**
 * Tenant Guard - Protects tenant routes
 */
export const tenantGuard: CanActivateFn = (route, state) => {
  const authService = inject(LocalAuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role === 'TenantAdmin' || user.role === 'TenantUser') {
    return true;
  } else {
    router.navigate(['/unauthorized']);
    return false;
  }
};

/**
 * Guest Guard - Prevents authenticated users from accessing login
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(LocalAuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        const user = authService.getCurrentUser();
        if (user?.isPlatformAdmin) {
          router.navigate(['/dashboard']);
        } else {
          router.navigate(['/tenant-portal']);
        }
        return false;
      }
      return true;
    })
  );
};

/**
 * Role Guard - Generic role-based guard
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(LocalAuthService);
    const router = inject(Router);

    const user = authService.getCurrentUser();
    
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    } else {
      router.navigate(['/unauthorized']);
      return false;
    }
  };
};
