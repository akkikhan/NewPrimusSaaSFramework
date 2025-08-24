import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import {
  BehaviorSubject,
  from,
  Observable,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
  tenantId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
  isAuthenticated: boolean;
  authProvider: 'azure' | 'local';
  lastLoginTime?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  displayName: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;
  selectedTenant: TenantInfo | null;
}

@Injectable({
  providedIn: 'root',
})
export class DualAuthService implements OnDestroy {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private selectedTenantSubject = new BehaviorSubject<TenantInfo | null>(null);
  private availableTenantsSubject = new BehaviorSubject<TenantInfo[]>([]);
  private destroy$ = new Subject<void>();

  public userProfile$ = this.userProfileSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public selectedTenant$ = this.selectedTenantSubject.asObservable();
  public availableTenants$ = this.availableTenantsSubject.asObservable();

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {
    this.initializeService();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the authentication service
   */
  private initializeService(): void {
    console.log('🔄 [Dual Auth] Initializing authentication service...');

    // Check for existing authentication
    this.checkExistingAuth();

    // Don't auto-load tenants - only load when explicitly requested
    // this.loadAvailableTenants();
  }

  /**
   * Check for existing authentication state
   */
  private checkExistingAuth(): void {
    // Check for stored local auth
    const storedUser = localStorage.getItem('saasfactory_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.userProfileSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        console.log('✅ [Dual Auth] Restored local auth session:', user.email);
        return;
      } catch (error) {
        console.warn('⚠️ [Dual Auth] Invalid stored user data, clearing...');
        localStorage.removeItem('saasfactory_user');
      }
    }

    // Check for Azure AD auth
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      console.log(
        '✅ [Dual Auth] Found Azure AD account, setting up admin auth...'
      );
      this.setupAzureAdAuth(accounts[0]);
    }
  }

  /**
   * Setup Azure AD authentication for platform admin
   */
  private setupAzureAdAuth(account: AccountInfo): void {
    console.log(
      '🔄 [Dual Auth] Setting up Azure AD auth for account:',
      account.username
    );

    const adminProfile: UserProfile = {
      id: account.localAccountId,
      name: account.name || account.username,
      email: account.username,
      roles: ['platform_admin', 'super_admin'],
      tenantId: 'platform',
      isPlatformAdmin: true,
      permissions: ['*'], // Full platform access
      isAuthenticated: true,
      authProvider: 'azure',
      lastLoginTime: new Date().toISOString(),
    };

    console.log('👤 [Dual Auth] Created admin profile:', adminProfile);

    // Set the user profile first
    this.userProfileSubject.next(adminProfile);

    // Then set authentication state
    this.isAuthenticatedSubject.next(true);

    // Store for session persistence
    localStorage.setItem('saasfactory_user', JSON.stringify(adminProfile));

    console.log(
      '✅ [Dual Auth] Platform admin authenticated via Azure AD - Profile and auth state set'
    );
  }

  /**
   * Load tenants only if they haven't been loaded yet
   */
  public loadTenantsIfNeeded(): void {
    const currentTenants = this.availableTenantsSubject.getValue();
    if (!currentTenants || currentTenants.length === 0) {
      console.log('🔄 [Dual Auth] Loading tenants on demand...');
      this.loadAvailableTenants();
    } else {
      console.log('✅ [Dual Auth] Tenants already loaded, skipping API call');
    }
  }

  /**
   * Load available tenants from the API
   */
  public loadAvailableTenants(): void {
    this.http
      .get<TenantInfo[]>(`${this.apiUrl}/tenants/public/list`)
      .pipe(
        map((response) => response || []),
        catchError((error) => {
          console.warn(
            '⚠️ [Dual Auth] Failed to load tenants, using fallback data'
          );
          return of(this.getFallbackTenants());
        })
      )
      .subscribe((tenants) => {
        this.availableTenantsSubject.next(tenants);
        console.log(
          `✅ [Dual Auth] Loaded ${tenants.length} available tenants`
        );
      });
  }

  /**
   * Get fallback tenant data for development
   */
  private getFallbackTenants(): TenantInfo[] {
    return [
      {
        id: 'acme-corp-20241230',
        name: 'acme-corp',
        displayName: 'Acme Corporation',
        domain: 'acme-corp.com',
        isActive: true,
        createdAt: '2024-12-30T10:30:00Z',
      },
      {
        id: 'techstart-20241230',
        name: 'techstart',
        displayName: 'TechStart Inc',
        domain: 'techstart.com',
        isActive: true,
        createdAt: '2024-12-30T11:00:00Z',
      },
    ];
  }

  /**
   * Azure AD login for platform administrators
   */
  public loginAzureAD(): Observable<boolean> {
    console.log('🔐 [Dual Auth] Starting Azure AD login for platform admin...');
    this.setLoading(true);
    this.clearError();

    return from(this.msalService.loginPopup()).pipe(
      switchMap((result: AuthenticationResult) => {
        console.log('✅ [Dual Auth] Azure AD login result received:', result);
        if (result && result.account) {
          console.log(
            '👤 [Dual Auth] Setting up Azure AD auth for account:',
            result.account.username
          );
          this.setupAzureAdAuth(result.account);
          return of(true);
        }
        console.warn('⚠️ [Dual Auth] No account returned from Azure AD');
        return throwError('No account returned from Azure AD');
      }),
      catchError((error) => {
        console.error('❌ [Dual Auth] Azure AD login failed:', error);
        this.setError('Azure AD login failed. Please try again.');

        // Fallback to redirect
        console.log('🔄 [Dual Auth] Falling back to redirect login...');
        this.msalService.loginRedirect();
        return of(false);
      }),
      finalize(() => {
        console.log('🏁 [Dual Auth] Azure AD login process completed');
        this.setLoading(false);
      })
    );
  }

  /**
   * Email/password login for tenant users
   */
  public loginTenant(credentials: LoginCredentials): Observable<boolean> {
    console.log('🔐 [Dual Auth] Starting tenant login for:', credentials.email);
    this.setLoading(true);
    this.clearError();

    if (!credentials.tenantId) {
      this.setError('Please select your organization first');
      this.setLoading(false);
      return of(false);
    }

    return this.http
      .post<any>(`${this.apiUrl}/api/v2/auth/tenant/login`, {
        email: credentials.email,
        password: credentials.password,
        tenantId: credentials.tenantId,
      })
      .pipe(
        map((response) => {
          if (response && response.user) {
            const tenantProfile: UserProfile = {
              id: response.user.id,
              name: response.user.name || response.user.email,
              email: response.user.email,
              roles: response.user.roles || ['tenant_user'],
              tenantId: credentials.tenantId!,
              isPlatformAdmin: false,
              permissions: response.user.permissions || [],
              isAuthenticated: true,
              authProvider: 'local',
              lastLoginTime: new Date().toISOString(),
            };

            // Find and set selected tenant
            const availableTenants = this.availableTenantsSubject.value;
            const selectedTenant = availableTenants.find(
              (t) => t.id === credentials.tenantId
            );
            if (selectedTenant) {
              this.selectedTenantSubject.next(selectedTenant);
            }

            this.userProfileSubject.next(tenantProfile);
            this.isAuthenticatedSubject.next(true);

            // Store for session persistence
            localStorage.setItem(
              'saasfactory_user',
              JSON.stringify(tenantProfile)
            );

            console.log(
              '✅ [Dual Auth] Tenant user authenticated:',
              tenantProfile.email
            );
            return true;
          }

          throw new Error('Invalid response from server');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('❌ [Dual Auth] Tenant login failed:', error);

          let errorMessage = 'Login failed. Please check your credentials.';
          if (error.status === 401) {
            errorMessage = 'Invalid email or password.';
          } else if (error.status === 403) {
            errorMessage = 'Account is disabled or access denied.';
          } else if (error.status === 404) {
            errorMessage = 'Organization not found.';
          }

          this.setError(errorMessage);
          return of(false);
        }),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Set selected tenant for login
   */
  public selectTenant(tenant: TenantInfo): void {
    console.log('🏢 [Dual Auth] Selected tenant:', tenant.displayName);
    this.selectedTenantSubject.next(tenant);
  }

  /**
   * Logout current user
   */
  public logout(): Observable<boolean> {
    console.log('🚪 [Dual Auth] Logging out current user...');

    const currentUser = this.userProfileSubject.value;

    // Clear local state immediately
    this.userProfileSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.selectedTenantSubject.next(null);
    localStorage.removeItem('saasfactory_user');

    // Clear all MSAL storage
    if (typeof window !== 'undefined') {
      // Clear MSAL-specific keys from sessionStorage and localStorage
      Object.keys(sessionStorage).forEach((key) => {
        if (key.includes('msal') || key.includes('azure')) {
          sessionStorage.removeItem(key);
        }
      });

      Object.keys(localStorage).forEach((key) => {
        if (key.includes('msal') || key.includes('azure')) {
          localStorage.removeItem(key);
        }
      });
    }

    // If Azure AD user, logout from Azure AD too
    if (currentUser?.authProvider === 'azure') {
      try {
        // Use logoutRedirect for complete cleanup
        this.msalService.logoutRedirect({
          postLogoutRedirectUri: window.location.origin + '/login',
        });
        return of(true);
      } catch (error) {
        console.warn('⚠️ [Dual Auth] Azure AD logout failed:', error);
        // Force navigation to login page
        window.location.href = '/login';
        return of(true);
      }
    }

    console.log('✅ [Dual Auth] Local logout completed');
    // Force navigation to login page for non-Azure AD users
    window.location.href = '/login';
    return of(true);
  }

  /**
   * Get current user profile
   */
  public getCurrentUser(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  /**
   * Check if current user is platform admin
   */
  public isPlatformAdmin(): boolean {
    const user = this.userProfileSubject.value;
    return user?.isPlatformAdmin === true;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  /**
   * Set error message
   */
  private setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  /**
   * Clear error message
   */
  private clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Select role for user (compatibility method)
   */
  public selectRole(roleSelectionData: any): Observable<boolean> {
    console.log('🎯 [Dual Auth] Role selection requested:', roleSelectionData);

    // For DualAuthService, we'll handle role selection by updating the user profile
    const currentUser = this.userProfileSubject.value;
    if (currentUser) {
      const updatedUser: UserProfile = {
        ...currentUser,
        roles: [roleSelectionData.role],
        tenantId: roleSelectionData.tenantId || currentUser.tenantId,
      };

      this.userProfileSubject.next(updatedUser);
      localStorage.setItem('saasfactory_user', JSON.stringify(updatedUser));

      console.log('✅ [Dual Auth] Role selected and user profile updated');
      return of(true);
    }

    console.warn('⚠️ [Dual Auth] No current user for role selection');
    return of(false);
  }

  /**
   * Set user profile directly (used by app component after MSAL redirect)
   */
  public setUserProfile(userData: any): void {
    console.log(
      '👤 [Dual Auth] Setting user profile from app component:',
      userData
    );

    const userProfile: UserProfile = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      roles: userData.isPlatformAdmin
        ? ['platform_admin', 'super_admin']
        : ['tenant_user'],
      tenantId: userData.tenantId || 'platform',
      isPlatformAdmin: userData.isPlatformAdmin || false,
      permissions: userData.isPlatformAdmin ? ['*'] : ['read'],
      isAuthenticated: true,
      authProvider: 'azure',
      lastLoginTime: new Date().toISOString(),
    };

    this.userProfileSubject.next(userProfile);
    this.isAuthenticatedSubject.next(true);

    // Store for session persistence
    localStorage.setItem('saasfactory_user', JSON.stringify(userProfile));

    console.log('✅ [Dual Auth] User profile set successfully');
  }
}
