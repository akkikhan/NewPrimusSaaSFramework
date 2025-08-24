import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserRoleContext {
  email: string;
  roles: RoleOption[];
  hasMultipleRoles: boolean;
  defaultRole?: RoleOption;
}

export interface RoleOption {
  role: 'Platform_Admin' | 'Tenant_Admin' | 'Tenant_User';
  tenantId?: string;
  tenantName?: string;
  context: 'platform' | 'tenant';
  redirectPath: string;
}

export interface TokenValidationRequest {
  accessToken: string;
  idToken: string;
  email: string;
}

export interface TokenValidationResponse {
  isValid?: boolean;
  userEmail?: string;
  userRoles?: UserRoleContext;
  message?: string;
  // Backend actual response structure
  userContext?: any;
  redirectPath?: string;
  roleCount?: number;
  availableRoles?: any[];
  requiresRoleSelection?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoleResolutionService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Validate token and resolve user roles
   */
  resolveUserRole(tokenRequest: TokenValidationRequest): Observable<UserRoleContext> {
    const url = `${this.apiUrl}/auth/resolve-role`;
    
    console.log('🔍 [RoleResolution] Resolving user role:', {
      email: tokenRequest.email,
      hasAccessToken: !!tokenRequest.accessToken,
      hasIdToken: !!tokenRequest.idToken,
      timestamp: new Date().toISOString()
    });

    // Ensure we have the required token
    if (!tokenRequest.accessToken && !tokenRequest.idToken) {
      console.error('❌ [RoleResolution] No tokens provided for role resolution');
      return throwError(() => new Error('Authentication token required'));
    }

    // Always use access token for API authorization, fallback to ID token only if necessary
    const token = tokenRequest.accessToken || tokenRequest.idToken;
    if (!token) {
      console.error('❌ [RoleResolution] No valid token available for authorization');
      return throwError(() => new Error('Valid authorization token required'));
    }

    // Set up headers with the Bearer token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Request-ID': `role-resolution-${Date.now()}`
    };
    
    return this.http.post<TokenValidationResponse>(url, tokenRequest, { headers }).pipe(
      tap(response => {
        console.log('🔄 [RoleResolution] Backend response:', {
          userContext: response.userContext,
          redirectPath: response.redirectPath,
          roleCount: response.roleCount,
          availableRoles: response.availableRoles?.length,
          requiresRoleSelection: response.requiresRoleSelection,
          timestamp: new Date().toISOString()
        });
      }),
      map(response => {
        // Check if we have a valid response with user context
        if (!response.userContext) {
          console.error('❌ [RoleResolution] No user context in response');
          throw new Error('User context not found in response');
        }
        
        // Check if we have available roles
        if (!response.availableRoles || response.availableRoles.length === 0) {
          console.error('❌ [RoleResolution] No roles found for user');
          throw new Error('No roles assigned to user');
        }
        
        // Convert backend response to frontend UserRoleContext format
        const roles: RoleOption[] = response.availableRoles.map((role: any) => ({
          role: role.role,
          context: role.context,
          tenantId: role.tenantId,
          tenantName: role.tenantName,
          redirectPath: role.redirectPath
        }));
        
        const userRoleContext: UserRoleContext = {
          email: response.userContext.email,
          roles: roles,
          hasMultipleRoles: (response.roleCount || 0) > 1,
          defaultRole: roles[0]
        };
        
        console.log('✅ [RoleResolution] Role resolution successful:', {
          email: userRoleContext.email,
          roleCount: userRoleContext.roles.length,
          hasMultipleRoles: userRoleContext.hasMultipleRoles,
          redirectPath: response.redirectPath
        });
        
        return userRoleContext;
      }),
      catchError(error => {
        console.error('❌ [RoleResolution] Role resolution failed:', error);
        
        // If backend returns 404 or is unavailable, provide mock data
        if (error.status === 404 || error.status === 0) {
          console.log('🔄 [RoleResolution] Backend unavailable, using mock role data');
          return this.getMockUserRoleContext(tokenRequest.email);
        }
        
        // Provide fallback error handling
        const errorMessage = error?.error?.message || error.message || 'Failed to resolve user roles';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Get mock user role context when backend is unavailable
   */
  private getMockUserRoleContext(email: string): Observable<UserRoleContext> {
    const mockRoles: RoleOption[] = [
      {
        role: 'Platform_Admin',
        context: 'platform',
        redirectPath: '/dashboard'
      },
      {
        role: 'Tenant_Admin',
        tenantId: 'demo-tenant-001',
        tenantName: 'Demo Company',
        context: 'tenant',
        redirectPath: '/tenant/demo-tenant-001/dashboard'
      }
    ];

    const userRoleContext: UserRoleContext = {
      email,
      roles: mockRoles,
      hasMultipleRoles: mockRoles.length > 1,
      defaultRole: mockRoles[0]
    };

    console.log('✅ [RoleResolution] Mock role context generated:', userRoleContext);
    return of(userRoleContext).pipe(delay(500)); // Simulate network delay
  }

  /**
   * Select and activate a specific role
   */
  selectRole(email: string, selectedRole: RoleOption): Observable<any> {
    const url = `${this.apiUrl}/auth/select-role`;
    
    console.log('🎯 [RoleResolution] Role selection request:', {
      email,
      selectedRole,
      timestamp: new Date().toISOString(),
      url,
      context: selectedRole?.context || 'No context provided'
    });
    
    const request = {
      email,
      role: selectedRole.role,
      context: selectedRole.context,
      tenantId: selectedRole.tenantId,
      source: 'azure-ad-login'
    };

    return this.http.post(url, request).pipe(
      tap((response: any) => {
        console.log('✅ [RoleResolution] Role selection successful:', response);
      }),
      catchError(error => {
        console.error('❌ [RoleResolution] Role selection failed:', error);
        
        // If backend returns 404 or is unavailable, provide mock response
        if (error.status === 404 || error.status === 0) {
          console.log('🔄 [RoleResolution] Backend unavailable, using mock role selection');
          return this.getMockRoleSelection(selectedRole);
        }
        
        const errorMessage = error?.error?.message || error.message || 'Failed to select role';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Get mock role selection response when backend is unavailable
   */
  private getMockRoleSelection(selectedRole: RoleOption): Observable<any> {
    const mockResponse = {
      success: true,
      message: 'Role selected successfully (mock)',
      selectedRole,
      redirectPath: selectedRole.redirectPath,
      userContext: {
        role: selectedRole.role,
        tenantId: selectedRole.tenantId,
        tenantName: selectedRole.tenantName
      }
    };

    console.log('✅ [RoleResolution] Mock role selection completed:', mockResponse);
    return of(mockResponse).pipe(delay(200)); // Simulate network delay
  }

  /**
   * Get role display information
   */
  getRoleDisplayInfo(role: string): { name: string; icon: string; description: string } {
    switch (role) {
      case 'Platform_Admin':
        return {
          name: 'Platform Administrator',
          icon: '👑',
          description: 'Full platform management access'
        };
      case 'Tenant_Admin':
        return {
          name: 'Tenant Administrator',
          icon: '🏢',
          description: 'Tenant management and configuration'
        };
      case 'Tenant_User':
        return {
          name: 'Tenant User',
          icon: '👤',
          description: 'Standard tenant user access'
        };
      default:
        return {
          name: 'User',
          icon: '👤',
          description: 'Standard user access'
        };
    }
  }

  /**
   * Store user context in localStorage
   */
  storeUserContext(userContext: any, selectedRole: RoleOption): void {
    const contextData = {
      ...userContext,
      selectedRole: selectedRole.role,
      selectedContext: selectedRole.context,
      tenantId: selectedRole.tenantId,
      tenantName: selectedRole.tenantName,
      redirectPath: selectedRole.redirectPath,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('userContext', JSON.stringify(contextData));
    localStorage.setItem('selectedRole', selectedRole.role);
    
    if (selectedRole.tenantId) {
      localStorage.setItem('tenantContext', JSON.stringify({
        tenantId: selectedRole.tenantId,
        tenantName: selectedRole.tenantName
      }));
    }

    console.log('💾 [RoleResolution] User context stored:', contextData);
  }

  /**
   * Clear stored user context
   */
  clearUserContext(): void {
    localStorage.removeItem('userContext');
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('tenantContext');
    console.log('🧹 [RoleResolution] User context cleared');
  }

  /**
   * Get stored user context
   */
  getStoredUserContext(): any {
    try {
      const contextData = localStorage.getItem('userContext');
      return contextData ? JSON.parse(contextData) : null;
    } catch (error) {
      console.error('❌ [RoleResolution] Failed to parse stored user context:', error);
      return null;
    }
  }
}
