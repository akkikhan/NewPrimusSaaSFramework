import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface TenantLoginResponse {
  token?: string;
  status?: string;
  message?: string;
  userId?: string;
  email?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    tenantId: string;
    isPlatformAdmin: boolean;
    authProvider: string;
    lastLoginTime?: string;
  };
  tenant?: {
    id: string;
    name: string;
    displayName: string;
  };
  expiresAt?: string;
}

export interface TenantLoginRequest {
  email: string;
  password: string;
  tenantId: string;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantAuthService {
  private tenantUserSubject = new BehaviorSubject<TenantUser | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');

  // Observables
  public tenantUser$ = this.tenantUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if tenant user is already logged in
    this.checkStoredTenantAuth();
  }

  /**
   * Tenant customer login - REAL API CALL
   */
  tenantLogin(email: string, password: string, tenantId: string): Observable<boolean> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next('');

    const loginRequest: TenantLoginRequest = {
      email,
      password,
      tenantId
    };

    console.log('🔐 [Tenant Auth] Attempting login for:', email, 'in tenant:', tenantId);

    return this.http.post<TenantLoginResponse>(
      `${environment.apiUrl}/auth/tenant/login`,
      loginRequest,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      tap(response => {
        // Handle password change required case
        if (response.status === 'password_change_required') {
          console.log('⚠️ [Tenant Auth] Password change required for user:', response.userId);
          
          // Store minimal user info for password change
          localStorage.setItem('temp_user_id', response.userId || '');
          localStorage.setItem('temp_user_email', response.email || '');
          localStorage.setItem('current_tenant_id', tenantId);
          
          // Don't set authenticated state yet - user needs to change password
          this.isLoadingSubject.next(false);
          return;
        }
        
        // Handle successful login
        if (response.user && response.token && response.expiresAt) {
          console.log('✅ [Tenant Auth] Login successful:', response.user.name);
          
          // Store tenant authentication
          localStorage.setItem('tenant_auth_token', response.token);
          // Use roles from response without test-time grants
          const userRoles = response.user.roles;

          localStorage.setItem('tenant_auth_user', JSON.stringify({
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            tenantId: response.user.tenantId,
            roles: userRoles,
            permissions: this.getPermissionsFromRoles(userRoles)
          }));
          localStorage.setItem('current_tenant_id', response.user.tenantId);
          localStorage.setItem('tenant_auth_expires', response.expiresAt);
          
          // Update state
          this.tenantUserSubject.next({
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            tenantId: response.user.tenantId,
            roles: userRoles,
            permissions: this.getPermissionsFromRoles(userRoles)
          });
          this.isAuthenticatedSubject.next(true);
          this.isLoadingSubject.next(false);
        }
      }),
      map(() => true),
      catchError(error => {
        console.error('❌ [Tenant Auth] Login failed:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.status === 401) {
          errorMessage = 'Invalid email or password.';
        } else if (error.status === 404) {
          errorMessage = 'Tenant not found.';
        } else if (error.status === 403) {
          errorMessage = 'Account is disabled or tenant is inactive.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.errorSubject.next(errorMessage);
        this.isLoadingSubject.next(false);
        return of(false);
      })
    );
  }

  /**
   * Change password for tenant user - REAL API CALL
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<boolean> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next('');

    const passwordRequest: ChangePasswordRequest = {
      userId,
      currentPassword,
      newPassword
    };

    console.log('🔐 [Tenant Auth] Changing password for user:', userId);

    return this.http.post<TenantLoginResponse>(
      `${environment.apiUrl}/auth/tenant/change-password`,
      passwordRequest,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      tap(response => {
        console.log('✅ [Tenant Auth] Password changed successfully');
        
        // Update stored token and user info
        if (response.token && response.user && response.expiresAt) {
          localStorage.setItem('tenant_auth_token', response.token);

          // Use roles from response without test-time grants
          const userRoles = response.user.roles;

          localStorage.setItem('tenant_auth_user', JSON.stringify({
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            tenantId: response.user.tenantId,
            roles: userRoles,
            permissions: this.getPermissionsFromRoles(userRoles)
          }));
          localStorage.setItem('tenant_auth_expires', response.expiresAt);
          
          // Update state
          this.tenantUserSubject.next({
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            tenantId: response.user.tenantId,
            roles: userRoles,
            permissions: this.getPermissionsFromRoles(userRoles)
          });
          this.isAuthenticatedSubject.next(true);
          this.isLoadingSubject.next(false);
        }
      }),
      map(() => true),
      catchError(error => {
        console.error('❌ [Tenant Auth] Password change failed:', error);
        
        let errorMessage = 'Password change failed. Please try again.';
        
        if (error.status === 401) {
          errorMessage = 'Current password is incorrect.';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid password format.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.errorSubject.next(errorMessage);
        this.isLoadingSubject.next(false);
        return of(false);
      })
    );
  }

  /**
   * Logout tenant user
   */
  tenantLogout(): void {
    console.log('🚪 [Tenant Auth] Logging out tenant user');
    
    // Clear tenant storage
    localStorage.removeItem('tenant_auth_token');
    localStorage.removeItem('tenant_auth_user');
    localStorage.removeItem('current_tenant_id');
    localStorage.removeItem('tenant_auth_expires');
    
    // Reset state
    this.tenantUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.errorSubject.next('');
  }

  /**
   * Get current tenant user
   */
  getCurrentTenantUser(): TenantUser | null {
    return this.tenantUserSubject.value;
  }

  /**
   * Get tenant authentication token
   */
  getTenantToken(): string | null {
    return localStorage.getItem('tenant_auth_token');
  }

  /**
   * Check if tenant user has permission
   */
  hasTenantPermission(permission: string): boolean {
    const user = this.getCurrentTenantUser();
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Check if tenant user has role
   */
  hasTenantRole(role: string): boolean {
    const user = this.getCurrentTenantUser();
    return user?.roles.includes(role) || false;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('tenant_auth_expires');
    if (!expiresAt) return true;
    
    const expiryDate = new Date(expiresAt);
    return Date.now() > expiryDate.getTime();
  }

  /**
   * Check if password change is required
   */
  isPasswordChangeRequired(): boolean {
    return localStorage.getItem('temp_user_id') !== null;
  }

  /**
   * Get temporary user ID for password change
   */
  getTempUserId(): string | null {
    return localStorage.getItem('temp_user_id');
  }

  /**
   * Get temporary user email for password change
   */
  getTempUserEmail(): string | null {
    return localStorage.getItem('temp_user_email');
  }

  /**
   * Clear temporary user data after password change
   */
  clearTempUserData(): void {
    localStorage.removeItem('temp_user_id');
    localStorage.removeItem('temp_user_email');
  }

  /**
   * Check stored tenant authentication on service init
   */
  private checkStoredTenantAuth(): void {
    const token = localStorage.getItem('tenant_auth_token');
    const userStr = localStorage.getItem('tenant_auth_user');
    
    if (token && userStr && !this.isTokenExpired()) {
      try {
        const user = JSON.parse(userStr);
        this.tenantUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        console.log('✅ [Tenant Auth] Restored tenant authentication for:', user.name);
      } catch (error) {
        console.error('❌ [Tenant Auth] Failed to restore tenant authentication:', error);
        this.tenantLogout();
      }
    } else if (this.isTokenExpired()) {
      console.log('⚠️ [Tenant Auth] Token expired, logging out');
      this.tenantLogout();
    }
  }

  /**
   * Clear any errors
   */
  clearError(): void {
    this.errorSubject.next('');
  }

  /**
   * Get permissions based on roles
   */
  private getPermissionsFromRoles(roles: string[]): string[] {
    const permissions = new Set<string>();
    
    roles.forEach(role => {
      switch (role) {
        case 'tenant_admin':
          permissions.add('users.manage');
          permissions.add('settings.update');
          permissions.add('billing.view');
          permissions.add('analytics.view');
          permissions.add('audit.view');
          break;
        case 'tenant_user':
          permissions.add('profile.update');
          permissions.add('dashboard.view');
          break;
        default:
          permissions.add('basic.access');
          break;
      }
    });
    
    return Array.from(permissions);
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): string | null {
    const token = localStorage.getItem('tenant_auth_token');
    
    if (!token) {
      console.log('❌ [Tenant Auth] No token found in localStorage');
      return null;
    }

    if (this.isTokenExpired()) {
      console.log('⚠️ [Tenant Auth] Token expired');
      this.tenantLogout();
      return null;
    }

    console.log('✅ [Tenant Auth] Token retrieved from localStorage');
    return token;
  }

  /**
   * Get authentication headers for API calls
   */
  getAuthHeaders(): { [key: string]: string } {
    const token = this.getAccessToken();
    
    if (!token) {
      console.log('❌ [Tenant Auth] No token available for headers');
      return {
        'Content-Type': 'application/json'
      };
    }

    console.log('✅ [Tenant Auth] Creating headers with Bearer token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': this.getCurrentTenantId() || 'default-tenant'
    };
  }

  /**
   * Get current tenant ID
   */
  getCurrentTenantId(): string | null {
    return localStorage.getItem('current_tenant_id');
  }

  /**
   * Check if user is currently authenticated (synchronous)
   */
  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
} 