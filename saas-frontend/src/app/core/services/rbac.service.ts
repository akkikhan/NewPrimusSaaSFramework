import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface RoleDto {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: PermissionDto[];
  tenantId: string;
  isSystemRole: boolean;
  isActive: boolean;
  priority: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  type?: string;
  status?: string;
  parentRoleId?: string;
}

export interface PermissionDto {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  scope: string;
  category: string;
  tenantId: string;
  isSystemPermission: boolean;
  isActive: boolean;
}

export interface UserRoleDto {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tenantId: string;
  assignedAt: string;
  assignedBy: string;
  expiresAt?: string;
  isActive: boolean;
  permissions?: string[];
}

export interface CreateRoleDto {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  priority?: number;
}

export interface UpdateRoleDto {
  displayName?: string;
  description?: string;
  permissions?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface AssignRoleDto {
  roleId: string;
  expiresAt?: string;
}

export interface PermissionCheckRequest {
  userId?: string;
  permission: string;
  resource?: string;
  tenantId?: string;
}

export interface PermissionCheckResult {
  userId: string;
  permission: string;
  resource?: string;
  hasPermission: boolean;
  tenantId: string;
  checkedAt: string;
  reason?: string;
}

export interface UserWithRolesDto {
  userId: string;
  email: string;
  displayName: string;
  tenantId: string;
  roles: UserRoleDto[];
  permissions: PermissionDto[];
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RbacService {
  private userContextSubject = new BehaviorSubject<UserWithRolesDto | null>(
    null
  );
  public userContext$ = this.userContextSubject.asObservable();

  private rolesCache$ = new BehaviorSubject<RoleDto[]>([]);
  private permissionsCache$ = new BehaviorSubject<PermissionDto[]>([]);

  constructor(private http: HttpClient, private authService: AuthService) {
    this.authService.isAuthenticated$.subscribe((isAuthenticated: boolean) => {
      if (isAuthenticated) {
        this.loadUserContext().subscribe();
      } else {
        this.clearCache();
      }
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.authService.getCurrentTenantId() || 'default-tenant',
    });
  }

  private makeRequest<T>(url: string, options: any = {}): Observable<T> {
    const fullUrl = url.startsWith('http') ? url : `/api/v2${url}`;
    const { body, method } = options;

    // Create clean request options object
    const requestOptions = {
      headers: this.getHeaders(),
    };

    if (environment.features?.enableDebugLogs) {
      console.log(`🌐 RBAC API Request: ${method || 'GET'} ${fullUrl}`);
    }

    switch (method) {
      case 'POST':
        return this.http.post<T>(
          fullUrl,
          body,
          requestOptions
        ) as Observable<T>;
      case 'PUT':
        return this.http.put<T>(fullUrl, body, requestOptions) as Observable<T>;
      case 'PATCH':
        return this.http.patch<T>(
          fullUrl,
          body,
          requestOptions
        ) as Observable<T>;
      case 'DELETE':
        return this.http.delete<T>(fullUrl, requestOptions) as Observable<T>;
      default:
        return this.http.get<T>(fullUrl, requestOptions) as Observable<T>;
    }
  }

  // User Context Management
  loadUserContext(): Observable<UserWithRolesDto | null> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = this.authService.getCurrentTenantId() || 'default-tenant';

    if (!currentUser?.id) {
      return of(null);
    }

    return this.getUserRoles(currentUser.id).pipe(
      switchMap((userRoles) => {
        const userContext: UserWithRolesDto = {
          userId: currentUser.id,
          email: currentUser.email,
          displayName: currentUser.name || currentUser.email,
          tenantId: tenantId,
          roles: userRoles,
          permissions: [],
          isActive: true,
        };

        // Extract permissions from roles
        const allPermissions = userRoles.flatMap(
          (role) => role.permissions || []
        );

        // Get detailed permission information
        return this.getPermissions().pipe(
          map((permissions) => {
            const uniquePermissionNames = [...new Set(allPermissions)];
            userContext.permissions = permissions.filter((p) =>
              uniquePermissionNames.includes(p.name)
            );
            this.userContextSubject.next(userContext);
            return userContext;
          })
        );
      }),
      catchError((error) => {
        console.error('Failed to load user context:', error);
        return of(null);
      })
    );
  }

  getCurrentUserContext(): UserWithRolesDto | null {
    return this.userContextSubject.value;
  }

  clearCache(): void {
    this.userContextSubject.next(null);
  }

  // Role Management (API-backed)
  getRoles(): Observable<RoleDto[]> {
    return this.makeRequest<RoleDto[]>('/roles').pipe(
      tap((roles) => {
        this.rolesCache$.next(roles);
        if (environment.features?.enableDebugLogs) {
          console.log('✅ Loaded roles from API:', roles);
        }
      }),
      catchError((error) => {
        console.error('Failed to load roles from API:', error);
        return of([]);
      })
    );
  }

  getRole(roleId: string): Observable<RoleDto> {
    return this.makeRequest<RoleDto>(`/roles/${roleId}`);
  }

  createRole(createRoleDto: CreateRoleDto): Observable<RoleDto> {
    return this.makeRequest<RoleDto>('/roles', {
      method: 'POST',
      body: createRoleDto,
    });
  }

  updateRole(
    roleId: string,
    updateRoleDto: UpdateRoleDto
  ): Observable<RoleDto> {
    return this.makeRequest<RoleDto>(`/roles/${roleId}`, {
      method: 'PUT',
      body: updateRoleDto,
    });
  }

  deleteRole(roleId: string): Observable<void> {
    return this.makeRequest<void>(`/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // Permission Management (API-backed)
  getPermissions(): Observable<PermissionDto[]> {
    return this.makeRequest<PermissionDto[]>('/roles/permissions').pipe(
      tap((permissions) => {
        this.permissionsCache$.next(permissions);
        if (environment.features?.enableDebugLogs) {
          console.log('✅ Loaded permissions from API:', permissions);
        }
      }),
      catchError((error) => {
        console.error('Failed to load permissions from API:', error);
        return of([]);
      })
    );
  }

  checkPermission(
    request: PermissionCheckRequest
  ): Observable<PermissionCheckResult> {
    return this.makeRequest<PermissionCheckResult>('/roles/permissions/check', {
      method: 'POST',
      body: request,
    });
  }

  // User Role Assignment (API-backed)
  getUserRoles(userId: string): Observable<UserRoleDto[]> {
    return this.makeRequest<UserRoleDto[]>(`/roles/users/${userId}/roles`).pipe(
      catchError((error) => {
        console.error(`Failed to load roles for user ${userId}:`, error);
        return of([]);
      })
    );
  }

  assignRole(
    userId: string,
    assignRoleDto: AssignRoleDto
  ): Observable<UserRoleDto> {
    return this.makeRequest<UserRoleDto>(`/roles/users/${userId}/roles`, {
      method: 'POST',
      body: assignRoleDto,
    });
  }

  removeRole(userId: string, roleId: string): Observable<void> {
    return this.makeRequest<void>(`/roles/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // Utility Methods
  hasPermission(permission: string): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return of(false);
    }

    return this.checkPermission({ permission }).pipe(
      map((result) => result.hasPermission),
      catchError(() => of(false))
    );
  }

  getUserPermissions(userId: string): Observable<string[]> {
    return this.getUserRoles(userId).pipe(
      map((userRoles) => {
        const allPermissions = userRoles.flatMap(
          (role) => role.permissions || []
        );
        return [...new Set(allPermissions)];
      })
    );
  }

  hasAnyRole(roles: string[]): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return of(false);
    }

    return this.getUserRoles(currentUser.id).pipe(
      map((userRoles) => {
        const userRoleNames = userRoles.map((role) => role.roleName);
        return roles.some((role) => userRoleNames.includes(role));
      })
    );
  }

  hasAllRoles(roles: string[]): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return of(false);
    }

    return this.getUserRoles(currentUser.id).pipe(
      map((userRoles) => {
        const userRoleNames = userRoles.map((role) => role.roleName);
        return roles.every((role) => userRoleNames.includes(role));
      })
    );
  }

  hasAnyPermission(permissions: string[]): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return of(false);
    }

    return this.getUserPermissions(currentUser.id).pipe(
      map((userPermissions) => {
        return permissions.some((permission) =>
          userPermissions.includes(permission)
        );
      })
    );
  }

  hasAllPermissions(permissions: string[]): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return of(false);
    }

    return this.getUserPermissions(currentUser.id).pipe(
      map((userPermissions) => {
        return permissions.every((permission) =>
          userPermissions.includes(permission)
        );
      })
    );
  }

  isPlatformAdmin(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.isPlatformAdmin || false;
  }

  isTenantAdmin(): Observable<boolean> {
    return this.hasAnyRole(['TENANT_ADMIN', 'PLATFORM_ADMIN']);
  }

  combineChecks(checks: Observable<boolean>[]): Observable<boolean> {
    if (checks.length === 0) {
      return of(true);
    }

    return combineLatest(checks).pipe(
      map((results) => results.every((result) => result))
    );
  }

  canPerform(action: string, resource?: string): Observable<boolean> {
    const permission = resource ? `${resource}.${action}` : action;
    return this.hasAnyPermission([permission]);
  }

  // Legacy method names for backward compatibility
  assignRoleToUser(
    userId: string,
    assignRoleDto: AssignRoleDto
  ): Observable<UserRoleDto> {
    return this.assignRole(userId, assignRoleDto);
  }

  removeRoleFromUser(userId: string, roleId: string): Observable<void> {
    return this.removeRole(userId, roleId);
  }
}
