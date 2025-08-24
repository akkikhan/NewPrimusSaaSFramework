import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { RbacService } from '../services/rbac.service';

export interface RouteRbacData {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL specified roles/permissions
  allowSelfAccess?: boolean; // If true, user can access their own resources
}

@Injectable({
  providedIn: 'root'
})
export class RbacGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private rbacService: RbacService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAccess(route, state);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAccess(route, state);
  }

  private checkAccess(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Check if user is authenticated
    return this.authService.isAuthenticated$.pipe(
      take(1),
      switchMap(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/auth/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return of(false);
        }

        // Get RBAC data from route
        const rbacData = this.getRbacData(route);
        
        // If no RBAC requirements, allow access
        if (!rbacData.roles && !rbacData.permissions) {
          return of(true);
        }

        // Check platform admin access (bypass all checks)
        if (this.rbacService.isPlatformAdmin()) {
          return of(true);
        }

        // Check self access for user-specific routes
        if (rbacData.allowSelfAccess && this.checkSelfAccess(route)) {
          return of(true);
        }

        // Check roles and permissions
        return this.performRbacCheck(rbacData).pipe(
          map(hasAccess => {
            if (!hasAccess) {
              this.handleAccessDenied();
            }
            return hasAccess;
          }),
          catchError(error => {
            console.error('RBAC Guard Error:', error);
            this.handleAccessDenied();
            return of(false);
          })
        );
      })
    );
  }

  private getRbacData(route: ActivatedRouteSnapshot): RouteRbacData {
    // Merge RBAC data from route hierarchy (parent routes can specify requirements)
    let rbacData: RouteRbacData = {};
    
    let currentRoute: ActivatedRouteSnapshot | null = route;
    while (currentRoute) {
      const routeData = currentRoute.data as RouteRbacData;
      if (routeData) {
        rbacData = { ...routeData, ...rbacData }; // Child route data takes precedence
      }
      currentRoute = currentRoute.parent;
    }
    
    return rbacData;
  }

  private checkSelfAccess(route: ActivatedRouteSnapshot): boolean {
    const currentUser = this.authService.getCurrentUser();
    const routeUserId = route.params['userId'] || route.params['id'];
    
    return currentUser?.id && routeUserId && currentUser.id === routeUserId;
  }

  private performRbacCheck(rbacData: RouteRbacData): Observable<boolean> {
    const checks: Observable<boolean>[] = [];

    // Check roles
    if (rbacData.roles && rbacData.roles.length > 0) {
      if (rbacData.requireAll) {
        checks.push(this.rbacService.hasAllRoles(rbacData.roles));
      } else {
        checks.push(this.rbacService.hasAnyRole(rbacData.roles));
      }
    }

    // Check permissions
    if (rbacData.permissions && rbacData.permissions.length > 0) {
      if (rbacData.requireAll) {
        checks.push(this.rbacService.hasAllPermissions(rbacData.permissions));
      } else {
        checks.push(this.rbacService.hasAnyPermission(rbacData.permissions));
      }
    }

    // If no checks, allow access
    if (checks.length === 0) {
      return of(true);
    }

    // Combine all checks - user must pass ALL checks
    return this.rbacService.combineChecks(checks);
  }

  private handleAccessDenied(): void {
    // Navigate to access denied page or show notification
    this.router.navigate(['/access-denied']);
    
    // You could also show a toast notification here
    console.warn('Access denied: Insufficient permissions');
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {
  
  constructor(private rbacGuard: RbacGuard) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.rbacGuard.canActivate(route, state);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.rbacGuard.canActivateChild(route, state);
  }
}

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate, CanActivateChild {
  
  constructor(private rbacGuard: RbacGuard) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.rbacGuard.canActivate(route, state);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.rbacGuard.canActivateChild(route, state);
  }
}

// Convenience guards for common role checks

@Injectable({
  providedIn: 'root'
})
export class TenantAdminGuard implements CanActivate {
  
  constructor(private rbacService: RbacService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.rbacService.isTenantAdmin().pipe(
      map(isAdmin => {
        if (!isAdmin) {
          this.router.navigate(['/access-denied']);
        }
        return isAdmin;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class PlatformAdminGuard implements CanActivate {
  
  constructor(private rbacService: RbacService, private router: Router) {}

  canActivate(): Observable<boolean> {
    if (this.rbacService.isPlatformAdmin()) {
      return of(true);
    }
    
    this.router.navigate(['/access-denied']);
    return of(false);
  }
} 