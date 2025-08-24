import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { MsalBroadcastService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

export interface TenantAzureAdUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  organizationId: string;
  roles: string[];
  isAuthenticated: boolean;
}

export interface TenantAzureAdState {
  isLoading: boolean;
  user: TenantAzureAdUser | null;
  error: string | null;
  isAuthenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TenantAzureAdService {
  private userSubject = new BehaviorSubject<TenantAzureAdUser | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private isBrowser: boolean;

  public user$ = this.userSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.initializeService();
    }
  }

  private initializeService(): void {
    console.log('🔄 [Tenant Azure AD Service] Initializing...');
    
    // Listen for MSAL interaction status
    this.msalBroadcastService.inProgress$
      .subscribe((status: InteractionStatus) => {
        if (status === InteractionStatus.None) {
          this.handleMsalInteractionComplete();
        }
      });
  }

  /**
   * Login with Azure AD for a specific tenant
   */
  loginWithAzureAD(tenantId: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    console.log('🔐 [Tenant Azure AD Service] Starting Azure AD login for tenant:', tenantId);
    this.setLoading(true);
    this.clearError();

    try {
      // Use MSAL to login with redirect
      this.msalService.loginRedirect({
        scopes: ['openid', 'profile', 'email'],
        state: tenantId // Pass tenant ID in state
      });
      
      return of(true);
    } catch (error) {
      console.error('❌ [Tenant Azure AD Service] Login error:', error);
      this.setError('Failed to initiate Azure AD login. Please try again.');
      this.setLoading(false);
      return of(false);
    }
  }

  /**
   * Handle MSAL interaction completion
   */
  private handleMsalInteractionComplete(): void {
    console.log('✅ [Tenant Azure AD Service] MSAL interaction completed');
    
    const activeAccount = this.msalService.instance.getActiveAccount();
    if (activeAccount) {
      console.log('✅ [Tenant Azure AD Service] User authenticated:', activeAccount.username);
      this.processAuthenticatedUser(activeAccount);
    } else {
      console.log('ℹ️ [Tenant Azure AD Service] No active account found');
      this.setLoading(false);
    }
  }

  /**
   * Process authenticated user and extract tenant information
   */
  private processAuthenticatedUser(account: any): void {
    try {
      console.log('🔄 [Tenant Azure AD Service] Processing authenticated user:', {
        accountId: account.localAccountId || account.homeAccountId,
        username: account.username,
        tenantId: account.tenantId,
        timestamp: new Date().toISOString()
      });

      // Check if role resolution is pending
      const pendingRoleResolution = this.getPendingRoleResolution();
      
      // Extract user information from the account
      const user: TenantAzureAdUser = {
        id: account.localAccountId || account.homeAccountId || 'unknown',
        email: account.username || account.name || 'unknown@tenant.com',
        name: account.name || 'Unknown User',
        tenantId: pendingRoleResolution?.tenantId || account.tenantId || 'unknown-tenant',
        organizationId: account.tenantId || 'unknown-org',
        roles: this.extractRoles(account),
        isAuthenticated: true
      };

      console.log('👤 [Tenant Azure AD Service] Processed user:', {
        ...user,
        pendingRoleResolution: !!pendingRoleResolution,
        availableRoles: user.roles
      });
      
      // Update state
      this.userSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      
      // Handle role resolution if pending
      if (pendingRoleResolution?.requiresRoleResolution) {
        this.handleRoleResolution(user, pendingRoleResolution);
      } else {
        this.setLoading(false);
        this.clearError();
      }

      // Store user info in session storage for tenant context
      if (this.isBrowser) {
        sessionStorage.setItem('tenant_azure_ad_user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('❌ [Tenant Azure AD Service] Error processing user:', error);
      this.setError('Failed to process user information. Please try again.');
      this.setLoading(false);
    }
  }

  /**
   * Get pending role resolution state from localStorage
   */
  private getPendingRoleResolution(): any {
    if (!this.isBrowser) return null;
    
    try {
      const stored = localStorage.getItem('pendingRoleResolution');
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // Clear it immediately to prevent reuse
      localStorage.removeItem('pendingRoleResolution');
      
      return data;
    } catch (error) {
      console.error('❌ [Tenant Azure AD Service] Error reading role resolution state:', error);
      return null;
    }
  }

  /**
   * Handle role resolution after login
   */
  private handleRoleResolution(user: TenantAzureAdUser, pendingResolution: any): void {
    console.log('🎯 [Tenant Azure AD Service] Handling role resolution:', {
      user: { email: user.email, roles: user.roles },
      pendingResolution
    });

    // If user has multiple roles, redirect to role selection
    if (user.roles && user.roles.length > 1) {
      console.log('ℹ️ [Tenant Azure AD Service] Multiple roles found, redirecting to selection');
      // Navigate to role selection (handled by parent components)
      this.setLoading(false);
      this.clearError();
      return;
    }

    // If user has exactly one role, auto-select it
    if (user.roles && user.roles.length === 1) {
      console.log('✅ [Tenant Azure AD Service] Single role found, auto-selecting:', user.roles[0]);
      this.autoSelectRole(user.email, user.roles[0], pendingResolution.tenantId);
      return;
    }

    // No roles found - this is an error state
    console.error('❌ [Tenant Azure AD Service] No roles found for user');
    this.setError('No roles found for your account. Please contact support.');
    this.setLoading(false);
  }

  /**
   * Auto-select the single available role
   */
  private autoSelectRole(email: string, role: string, tenantId: string): void {
    const roleData = {
      email,
      role,
      tenantId,
      timestamp: new Date().toISOString()
    };

    console.log('🔄 [Tenant Azure AD Service] Auto-selecting role:', roleData);

    // Call role selection endpoint
    this.http.post('/api/auth/select-role', roleData)
      .subscribe({
        next: (response) => {
          console.log('✅ [Tenant Azure AD Service] Role auto-selection successful');
          this.setLoading(false);
          this.clearError();
        },
        error: (error) => {
          console.error('❌ [Tenant Azure AD Service] Role auto-selection failed:', error);
          this.setError('Failed to set user role. Please try again.');
          this.setLoading(false);
        }
      });
  }

  /**
   * Extract roles from Azure AD account
   */
  private extractRoles(account: any): string[] {
    const roles: string[] = [];
    
    // Extract roles from various possible sources
    if (account.idTokenClaims) {
      // Check for roles in ID token claims
      if (account.idTokenClaims.roles) {
        roles.push(...account.idTokenClaims.roles);
      }
      
      // Check for groups (if using group-based roles)
      if (account.idTokenClaims.groups) {
        roles.push(...account.idTokenClaims.groups);
      }
      
      // Check for custom claims
      if (account.idTokenClaims.extension_roles) {
        roles.push(...account.idTokenClaims.extension_roles);
      }
    }
    
    // Add default tenant user role if no roles found
    if (roles.length === 0) {
      roles.push('Tenant_User');
    }
    
    return roles;
  }

  /**
   * Get current user
   */
  getCurrentUser(): TenantAzureAdUser | null {
    return this.userSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Logout from Azure AD
   */
  logout(): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    console.log('🚪 [Tenant Azure AD Service] Logging out...');
    
    try {
      // Clear local state
      this.userSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.clearError();
      
      // Clear session storage
      sessionStorage.removeItem('tenant_azure_ad_user');
      
      // Logout from MSAL
      this.msalService.logoutRedirect({
        postLogoutRedirectUri: window.location.origin
      });
      
      return of(true);
    } catch (error) {
      console.error('❌ [Tenant Azure AD Service] Logout error:', error);
      return of(false);
    }
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): Observable<string | null> {
    if (!this.isBrowser) {
      return of(null);
    }

    const activeAccount = this.msalService.instance.getActiveAccount();
    if (!activeAccount) {
      console.warn('⚠️ [Tenant Azure AD Service] No active account for token acquisition');
      return of(null);
    }

    return new Observable(observer => {
      this.msalService.instance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: activeAccount
      })
      .then(response => {
        console.log('✅ [Tenant Azure AD Service] Token acquired successfully');
        observer.next(response.accessToken);
        observer.complete();
      })
      .catch(error => {
        console.error('❌ [Tenant Azure AD Service] Token acquisition failed:', error);
        observer.next(null);
        observer.complete();
      });
    });
  }

  /**
   * Validate tenant access
   */
  validateTenantAccess(tenantId: string): Observable<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return of(false);
    }

    // For now, allow access if user is authenticated
    // In a real implementation, you would validate against your backend
    return of(true);
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.isLoadingSubject.next(loading);
  }

  /**
   * Set error state
   */
  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Get current state
   */
  getCurrentState(): TenantAzureAdState {
    return {
      isLoading: this.isLoadingSubject.value,
      user: this.userSubject.value,
      error: this.errorSubject.value,
      isAuthenticated: this.isAuthenticatedSubject.value
    };
  }
} 