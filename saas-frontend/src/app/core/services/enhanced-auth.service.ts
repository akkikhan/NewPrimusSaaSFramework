import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { 
  EventMessage, 
  EventType, 
  AuthenticationResult, 
  AccountInfo,
  InteractionStatus,
  PopupRequest,
  RedirectRequest,
  SilentRequest
} from '@azure/msal-browser';
import { 
  Observable, 
  BehaviorSubject, 
  of, 
  from,
  Subject,
  firstValueFrom
} from 'rxjs';
import { 
  map, 
  catchError, 
  switchMap, 
  tap, 
  take,
  takeUntil,
  finalize,
  filter,
  timeout
} from 'rxjs/operators';
import { loginRequest, apiScopes, backendApiScopes } from '../../auth/msal-complete-config';
import { SessionService } from './session.service';
import { RoleResolutionService, UserRoleContext, RoleOption } from './role-resolution.service';
import { TokenExpirationService } from './token-expiration.service';
import { environment } from '../../../environments/environment';
import { MockAuthService } from './mock-auth.service';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string; // Added username field for flexibility
  roles: string[];
  tenantId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
  isAuthenticated: boolean;
  lastLoginTime?: string;
  // JWT Token information
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  tokenIssuer?: string;
  tokenAudience?: string;
}

export interface TokenValidationRequest {
  accessToken: string;
  idToken: string;
  email: string;
  username?: string; // Added username field
  refreshToken?: string; // Added refresh token
  tokenExpiry?: Date; // Added token expiry
  tenantId?: string; // Added tenant context
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedAuthService implements OnDestroy {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();
  private redirectPathSubject = new BehaviorSubject<string>('/dashboard');
  private roleResolutionInProgress = false;

  public userProfile$ = this.userProfileSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public userContext$ = this.userProfileSubject.asObservable(); // Alias for compatibility

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private sessionService: SessionService,
    private roleResolutionService: RoleResolutionService,
    private tokenExpirationService: TokenExpirationService,
    private router: Router
  ) {
    this.initializeAuthService();
    this.initializeTokenExpiration();
  }

  ngOnInit(): void {
    console.log('🔄 [Enhanced Auth] Initializing Enhanced Authentication Service...');
    
    // ✅ ENABLED AUTO-CHECK: Check authentication state on initialization
    // This ensures users stay logged in after page refresh
    console.log('✅ [Enhanced Auth] Auto-authentication enabled - checking existing session');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Update the user profile
   */
  private updateUserProfile(profile: UserProfile): void {
    console.log('👤 [Enhanced Auth] Updating user profile:', {
      email: profile.email,
      roles: profile.roles,
      timestamp: new Date().toISOString()
    });
    
    this.userProfileSubject.next(profile);
    this.isAuthenticatedSubject.next(true);
    this.errorSubject.next(null);
  }

  /**
   * Redirect to role selection UI
   */
  private redirectToRoleSelection(email: string): void {
    console.log('🔄 [Enhanced Auth] Redirecting to role selection:', email);
    
    const queryParams = { email };
    this.router.navigate(['/auth/select-role'], { queryParams });
  }

  /**
   * Redirect to appropriate dashboard
   */
  private redirectToDashboard(path: string): void {
    console.log('✅ [Enhanced Auth] Redirecting to dashboard:', path);
    
    this.redirectPathSubject.next(path);
    this.router.navigate([path]);
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): void {
    console.error('❌ [Enhanced Auth] Authentication error:', error);
    
    const authError: AuthError = {
      code: error.errorCode || 'unknown_error',
      message: error.message || 'An unknown error occurred during authentication',
      details: error
    };
    
    this.errorSubject.next(authError.message);
    this.clearAuthState();
  }

  /**
   * Handle role resolution after successful authentication
   */
  private async handleRoleResolution(roleContext: UserRoleContext, account: AccountInfo): Promise<void> {
    console.log('🎯 [Enhanced Auth] Handling role resolution:', {
      email: account.username,
      hasMultipleRoles: roleContext.hasMultipleRoles,
      roleCount: roleContext.roles.length,
      timestamp: new Date().toISOString()
    });

    if (this.roleResolutionInProgress) {
      console.log('⚠️ [Enhanced Auth] Role resolution already in progress, skipping...');
      return;
    }

    this.roleResolutionInProgress = true;

    try {
      if (roleContext.roles.length === 0) {
        throw new Error('No roles assigned to user');
      }

      // If user has multiple roles, store state and show selection UI
      if (roleContext.hasMultipleRoles) {
        console.log('ℹ️ [Enhanced Auth] Multiple roles found, showing selection UI');
        this.sessionService.setRoleContext(roleContext);
        this.redirectToRoleSelection(account.username);
        return;
      }

      // If single role, auto-select it
      console.log('✅ [Enhanced Auth] Single role found, auto-selecting');
      
      // ✅ DISABLED: Don't call select-role API for single roles
      // This prevents unnecessary API calls when user has only one role
      console.log('ℹ️ [Enhanced Auth] Skipping select-role API call for single role user');
      
      // Update user profile and redirect directly
      this.updateUserProfile({
        id: account.localAccountId,
        name: account.name || '',
        email: account.username,
        roles: [roleContext.roles[0].role],
        tenantId: roleContext.roles[0].tenantId || '',
        isPlatformAdmin: roleContext.roles[0].role === 'Platform_Admin',
        permissions: [],
        isAuthenticated: true,
        lastLoginTime: new Date().toISOString()
      });

      this.redirectToDashboard(roleContext.roles[0].redirectPath);
    } catch (error) {
      console.error('❌ [Enhanced Auth] Role resolution failed:', error);
      this.handleAuthError(error);
    } finally {
      this.roleResolutionInProgress = false;
    }
  }

  /**
   * Initialize the authentication service
   */
  private initializeAuthService(): void {
    console.log('🔄 [Enhanced Auth] Initializing authentication service...');
    
    // Set loading state during initialization
    this.isLoadingSubject.next(true);
    
    // ✅ ENABLED AUTO-CHECK: Check authentication state on initialization
    // This ensures users stay logged in after page refresh
    console.log('✅ [Enhanced Auth] Auto-authentication enabled - checking existing session');
    this.checkAuthenticationState();
    
    // ✅ Listen for interaction status changes (handles redirect completion)
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('✅ [Enhanced Auth] Interaction completed, checking auth state...');
        // Only check auth state if there's an active account (manual login completed)
        const activeAccount = this.msalService.instance.getActiveAccount();
        if (activeAccount) {
          this.checkAuthenticationState();
        } else {
          console.log('ℹ️ [Enhanced Auth] No active account after interaction - user needs to login manually');
          this.setLoading(false);
        }
      });

    // ✅ Listen for authentication events
    this.msalBroadcastService.msalSubject$
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: EventMessage) => {
        console.log('📡 [Enhanced Auth] MSAL Event:', result.eventType);
        
        if (result.eventType === EventType.LOGIN_SUCCESS) {
          const authResult = result.payload as AuthenticationResult;
          console.log('✅ [Enhanced Auth] Login success event received');
          if (authResult.account) {
            this.handleSuccessfulAuthentication(authResult.account);
          }
        } else if (result.eventType === EventType.LOGIN_FAILURE) {
          console.error('❌ [Enhanced Auth] Login failure event:', result.payload);
          this.setError('Login failed. Please try again.');
          this.setLoading(false);
        }
      });

    console.log('✅ [Enhanced Auth] Authentication service ready - auto-check enabled');
  }

  /**
   * Initialize token expiration monitoring
   */
  private initializeTokenExpiration(): void {
    console.log('🔧 [Enhanced Auth] Initializing token expiration monitoring...');
    
    // Configure token expiration service
    this.tokenExpirationService.configure({
      warningThresholdMinutes: 5, // Show warning 5 minutes before expiration
      refreshThresholdMinutes: 10, // Start auto-refresh 10 minutes before expiration
      maxRefreshAttempts: 3,
      sessionTimeoutMinutes: 60, // 1 hour session timeout
      enableAutoRefresh: true,
      enableUserNotifications: true,
      showExpirationWarning: true,
      showSessionExpired: true,
      redirectOnExpiration: true
    });

    // Subscribe to token expiration events
    this.tokenExpirationService.isExpiring$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isExpiring => {
        if (isExpiring) {
          console.log('⚠️ [Enhanced Auth] Token is expiring soon');
        }
      });

    console.log('✅ [Enhanced Auth] Token expiration monitoring initialized');
  }

  /**
   * Login with Azure AD
   */
  async loginWithAzureAD(): Promise<void> {
    console.log('🔐 [Enhanced Auth] Initiating Azure AD login...');
    this.setLoading(true);
    this.clearError();
    
    try {
      // Use MSAL redirect for login
      await this.msalService.loginRedirect({
        ...loginRequest,
        scopes: [...apiScopes, ...backendApiScopes]
      });
    } catch (error) {
      console.error('❌ [Enhanced Auth] Azure AD login failed:', error);
      this.setError('Azure AD login failed. Please try again.');
      this.setLoading(false);
      throw error;
    }
  }

  /**
   * Check current authentication state and resolve roles
   */
  private async checkAuthenticationState(): Promise<void> {
    console.log('🔍 [Enhanced Auth] Checking authentication state...');
    this.setLoading(true);
    
    try {
      // First check session storage
      const sessionToken = sessionStorage.getItem('authToken');
      const sessionUserData = sessionStorage.getItem('userData');
      
      if (sessionToken && sessionUserData) {
        console.log('✅ [Enhanced Auth] Found session storage auth data');
        const userData = JSON.parse(sessionUserData);
        
        // Set the user profile from session
        this.userProfileSubject.next({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          roles: userData.role === 'PlatformAdmin' ? ['platform_admin'] : ['tenant_admin'],
          permissions: userData.role === 'PlatformAdmin' ? ['*'] : [],
          isPlatformAdmin: userData.role === 'PlatformAdmin',
          tenantId: userData.tenantId,
          isAuthenticated: true,
          lastLoginTime: new Date().toISOString()
        });
        
        this.isAuthenticatedSubject.next(true);
        this.setLoading(false);
        return;
      }
      
      const activeAccount = this.msalService.instance.getActiveAccount();
      const allAccounts = this.msalService.instance.getAllAccounts();
      
      console.log('👤 [Enhanced Auth] Auth state:', {
        activeAccount: activeAccount?.username,
        accountCount: allAccounts.length,
        timestamp: new Date().toISOString()
      });
      
      if (activeAccount) {
        console.log('✅ [Enhanced Auth] Found active account, getting tokens...');
        await this.handleAuthenticatedUser(activeAccount);
      } else if (allAccounts.length > 0) {
        console.log('🔄 [Enhanced Auth] Setting first account as active...');
        this.msalService.instance.setActiveAccount(allAccounts[0]);
        await this.handleAuthenticatedUser(allAccounts[0]);
      } else {
        console.log('ℹ️ [Enhanced Auth] No accounts found - login required');
        this.clearAuthState();
      }
    } catch (error) {
      console.error('❌ [Enhanced Auth] Authentication error:', error);
      this.handleAuthError(error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle authenticated user and resolve roles
   */
  private async handleAuthenticatedUser(account: AccountInfo): Promise<void> {
    try {
      console.log('🔄 [Enhanced Auth] Getting auth tokens...');
      
      // Get both access token and ID token
      const silentRequest: SilentRequest = {
        scopes: [...apiScopes],
        account: account,
        forceRefresh: false
      };

      const authResult = await firstValueFrom(
        from(this.msalService.acquireTokenSilent(silentRequest))
      );

      console.log('✅ [Enhanced Auth] Tokens acquired, checking for hardcoded admin...');

      // AUTHORITATIVE OVERRIDE: Platform Admin override for specific user ID
      if (account.localAccountId === "0052ce48-7fc4-43ba-be31-10841072d107") {
        console.log('👑 [Enhanced Auth] AUTHORITATIVE OVERRIDE: Platform Admin detected for user ID', account.localAccountId);
        
        // Create authoritative user profile - bypass ALL role checks
        const userProfile: UserProfile = {
          id: account.localAccountId,
          name: account.name || 'Akki Khan',
          email: account.username,
          username: account.username, // Added username
          roles: ['Platform_Admin'],
          tenantId: account.tenantId || '',
          isPlatformAdmin: true,
          permissions: this.getRolePermissions(['Platform_Admin']),
          isAuthenticated: true,
          lastLoginTime: new Date().toISOString(),
          // JWT Token information
          accessToken: authResult.accessToken,
          idToken: authResult.idToken,
          tokenExpiry: authResult.expiresOn ? new Date(authResult.expiresOn) : undefined,
          tokenIssuer: authResult.fromCache ? 'Cache' : 'Azure AD',
          tokenAudience: authResult.account?.environment || 'login.microsoftonline.com'
        };

        // Update user profile and persist to storage
        this.updateUserProfile(userProfile);
        
        // Store session data for persistence
        this.sessionService.startSession({
          user: userProfile,
          account: account,
          token: authResult.accessToken
        });
        
        // Skip ALL role resolution and go directly to dashboard
        this.redirectToDashboard('/dashboard');
        return;
      }

      // For other users, proceed with normal role resolution
      console.log('🔄 [Enhanced Auth] Proceeding with normal role resolution...');
      
      // Resolve user roles with tokens
      const tokenRequest: TokenValidationRequest = {
        accessToken: authResult.accessToken,
        idToken: authResult.idToken,
        email: account.username,
        username: account.username,
        tenantId: account.tenantId,
        tokenExpiry: authResult.expiresOn ? new Date(authResult.expiresOn) : undefined
      };

      // Call role resolution service
      const roleContext = await firstValueFrom(
        this.roleResolutionService.resolveUserRole(tokenRequest)
      );

      // Handle role context
      await this.handleRoleResolution(roleContext, account);
    } catch (error) {
      console.error('❌ [Enhanced Auth] Error checking authentication state:', error);
      // Don't clear auth state on error - let the user try again
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Handle successful authentication with role-based redirect
   */
  private handleSuccessfulAuthentication(account: AccountInfo): void {
    console.log('✅ [Enhanced Auth] Authentication successful for:', account.username);
    
    try {
      // AUTHORITATIVE OVERRIDE: Platform Admin override for specific user ID
      if (account.localAccountId === "0052ce48-7fc4-43ba-be31-10841072d107") {
        console.log('👑 [Enhanced Auth] AUTHORITATIVE OVERRIDE: Platform Admin detected in success handler for user ID', account.localAccountId);
        
        // Create authoritative user profile - bypass ALL role checks
        const userProfile: UserProfile = {
          id: account.localAccountId,
          name: account.name || 'Akki Khan',
          email: account.username,
          username: account.username, // Added username
          roles: ['Platform_Admin'],
          tenantId: account.tenantId || '',
          isPlatformAdmin: true,
          permissions: this.getRolePermissions(['Platform_Admin']),
          isAuthenticated: true,
          lastLoginTime: new Date().toISOString(),
          // JWT Token information will be acquired in next step
          accessToken: undefined, // Will be set when token is acquired
          idToken: undefined, // Will be set when token is acquired
          tokenExpiry: undefined,
          tokenIssuer: 'Azure AD',
          tokenAudience: account.environment || 'login.microsoftonline.com'
        };

        // Update user profile and set authentication state
        this.updateUserProfile(userProfile);
        this.isAuthenticatedSubject.next(true);
        this.isLoadingSubject.next(false);
        
        // Store session data for persistence
        this.sessionService.startSession({
          user: userProfile,
          account: account,
          token: null // Will be acquired in the next step
        });
        
        // Skip ALL role resolution and go directly to dashboard
        this.redirectToDashboard('/dashboard');
        return;
      }

      // For other users, proceed with normal flow
      console.log('🔄 [Enhanced Auth] Proceeding with normal authentication flow...');
      
      // Set user profile
      this.setUserProfile(account);
      
      // Ensure authentication state is set to true
      this.isAuthenticatedSubject.next(true);
      this.isLoadingSubject.next(false);
      
      console.log('✅ [Enhanced Auth] Authentication state set to true for user:', account.username);
      
      // Determine redirect based on user role
      this.determineRedirectBasedOnRole(account);
    } catch (error) {
      console.error('❌ [Enhanced Auth] Error handling successful authentication:', error);
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Determine redirect destination based on user role
   */
  private determineRedirectBasedOnRole(account: AccountInfo): void {
    const userProfile = this.getUserProfileFromAccount(account);
    
    console.log('🔍 [Enhanced Auth] Determining redirect for user:', userProfile.email, 'Roles:', userProfile.roles);
    
    let redirectPath = '/dashboard'; // Default fallback
    
    // Check if user is a Platform Admin
    if (userProfile.isPlatformAdmin || userProfile.roles.includes('Platform_Admin')) {
      console.log('👑 [Enhanced Auth] Platform Admin detected - redirecting to Admin Dashboard');
      redirectPath = '/dashboard';
    }
    // Check if user is a Tenant User
    else if (userProfile.roles.includes('Tenant_User') || userProfile.roles.includes('Tenant_Admin')) {
      console.log('🏢 [Enhanced Auth] Tenant User detected - redirecting to Tenant Portal');
      redirectPath = '/tenant-portal';
    }
    // Check if user has specific role-based redirects
    else if (userProfile.roles.includes('Analytics_User')) {
      console.log('📊 [Enhanced Auth] Analytics User detected - redirecting to Analytics');
      redirectPath = '/analytics';
    }
    else if (userProfile.roles.includes('Audit_User')) {
      console.log('📋 [Enhanced Auth] Audit User detected - redirecting to Audit Logs');
      redirectPath = '/audit';
    }
    else {
      console.log('👤 [Enhanced Auth] Standard user - redirecting to Dashboard');
      redirectPath = '/dashboard';
    }
    
    // Store redirect path for navigation
    this.redirectPathSubject.next(redirectPath);
    
    console.log('🎯 [Enhanced Auth] Redirect path determined:', redirectPath);
  }

  /**
   * Get user profile from account info with role determination
   */
  private getUserProfileFromAccount(account: AccountInfo): UserProfile {
    const email = account.username;
    const name = account.name || account.username;
    
    // Determine roles based on email domain or specific logic
    const roles = this.determineUserRoles(email, account);
    
    return {
      id: account.localAccountId || account.homeAccountId,
      name: name,
      email: email,
      username: account.username, // Added username
      roles: roles,
      tenantId: account.tenantId || 'default',
      isPlatformAdmin: roles.includes('Platform_Admin'),
      permissions: this.getRolePermissions(roles),
      isAuthenticated: true,
      lastLoginTime: new Date().toISOString(),
      // JWT Token information - will be populated when tokens are available
      accessToken: undefined, // Will be set when token is acquired
      idToken: undefined, // Will be set when token is acquired
      tokenExpiry: undefined,
      tokenIssuer: 'Azure AD',
      tokenAudience: account.environment || 'login.microsoftonline.com'
    };
  }

  /**
   * Determine user roles based on email domain and account info
   */
  private determineUserRoles(email: string, account: AccountInfo): string[] {
    const roles: string[] = [];
    
    // AUTHORITATIVE OVERRIDE: Platform admin for specific user ID
    if (account.localAccountId === "0052ce48-7fc4-43ba-be31-10841072d107") {
      console.log('AUTHORITATIVE OVERRIDE: Platform admin role assigned to user ID', account.localAccountId, '- REMOVE AFTER AZURE AD GROUP AUTH IS READY');
      roles.push('Platform_Admin');
      return roles; // Return immediately - no other role checks needed
    }
    // Check for specific email domains for platform admins
    else if (email.includes('@saasfactory.com') || email.includes('@yourdomain.com')) {
      roles.push('Platform_Admin');
    }
    
    // Check for tenant-specific domains
    if (email.includes('@tenant') || email.includes('@customer')) {
      roles.push('Tenant_User');
    }
    
    // Check for specific Azure AD groups or claims
    if (account.idTokenClaims) {
      const claims = account.idTokenClaims as any;
      
      // Check for role claims
      if (claims.roles && Array.isArray(claims.roles)) {
        roles.push(...claims.roles);
      }
      
      // Check for group claims
      if (claims.groups && Array.isArray(claims.groups)) {
        // Map Azure AD groups to roles
        claims.groups.forEach((group: string) => {
          if (group.includes('Admin')) {
            roles.push('Platform_Admin');
          } else if (group.includes('Analytics')) {
            roles.push('Analytics_User');
          } else if (group.includes('Audit')) {
            roles.push('Audit_User');
          }
        });
      }
    }
    
    // Default role if none assigned
    if (roles.length === 0) {
      roles.push('User');
    }
    
    // Remove duplicates
    return [...new Set(roles)];
  }

  /**
   * Get permissions for roles
   */
  private getRolePermissions(roles: string[]): string[] {
    const permissions: string[] = [];
    
    roles.forEach(role => {
      switch (role) {
        case 'Platform_Admin':
          permissions.push('users.read', 'users.write', 'tenants.read', 'tenants.write', 'analytics.read', 'audit.read');
          break;
        case 'Tenant_Admin':
          permissions.push('users.read', 'users.write', 'analytics.read', 'audit.read');
          break;
        case 'Tenant_User':
          permissions.push('users.read', 'analytics.read');
          break;
        case 'Analytics_User':
          permissions.push('analytics.read', 'analytics.write');
          break;
        case 'Audit_User':
          permissions.push('audit.read');
          break;
        default:
          permissions.push('dashboard.read');
          break;
      }
    });
    
    return [...new Set(permissions)];
  }

  /**
   * Enhanced login that handles role resolution
   */
  /**
   * 🔐 UNIFIED LOGIN FLOW - Azure AD with Role Resolution
   */
  async loginPopup(): Promise<void> {
    try {
      console.log('🔐 [Enhanced Auth] Starting unified Azure AD login flow...');
      this.isLoadingSubject.next(true);
      this.clearError();

      const loginRequest: PopupRequest = {
        scopes: apiScopes,
        prompt: 'select_account'
      };

      // Step 1: Perform Azure AD authentication
      console.log('🔐 [Enhanced Auth] Step 1: Azure AD authentication...');
      const loginResult = await firstValueFrom(this.msalService.loginPopup(loginRequest));
      console.log('✅ [Enhanced Auth] Azure AD login successful:', loginResult);

      if (loginResult.account) {
        this.msalService.instance.setActiveAccount(loginResult.account);

        // Step 2: Ensure we have a valid access token
        const userEmail = loginResult.account.username;
        let accessToken = loginResult.accessToken;
        
        // If no access token, explicitly request it
        if (!accessToken) {
          console.log('🔄 [Enhanced Auth] No access token found, acquiring one...');
          const tokenRequest = {
            scopes: apiScopes,
            account: loginResult.account,
            forceRefresh: true
          };
          const tokenResult = await firstValueFrom(
            this.msalService.acquireTokenSilent(tokenRequest)
          );
          accessToken = tokenResult.accessToken;
        }

        console.log('🔍 [Enhanced Auth] Step 2: Resolving user roles for:', userEmail);
        
        // Step 3: Send tokens to backend for role resolution with access token
        const roleContext = await firstValueFrom(
          this.roleResolutionService.resolveUserRole({
            accessToken: accessToken,
            idToken: loginResult.idToken,
            email: userEmail
          })
        );

        console.log('🎯 [Enhanced Auth] Step 3: Role resolution complete:', roleContext);

        // Step 4: Check for stored role session first
        const storedSession = this.checkStoredRoleSession();
        if (storedSession.valid && storedSession.role) {
          // Find matching role in available roles
          const matchingRole = roleContext.roles.find(r => 
            r.role === storedSession.role && r.context === storedSession.context
          );

          if (matchingRole) {
            console.log('🎯 [Enhanced Auth] Found stored role session, auto-selecting:', matchingRole);
            await this.selectAndActivateRole(userEmail, matchingRole);
            return;
          }
        }

        // Step 5: Handle role selection or automatic redirect
        if (roleContext.hasMultipleRoles && roleContext.roles.length > 1) {
          // Multiple roles - show role selection UI
          console.log('🎭 [Enhanced Auth] Multiple roles detected, showing selection UI');
          this.showRoleSelectionUI(roleContext);
        } else if (roleContext.roles.length === 1) {
          // Single role - auto-select and redirect
          console.log('👤 [Enhanced Auth] Single role detected, auto-selecting:', roleContext.roles[0]);
          await this.selectAndActivateRole(userEmail, roleContext.roles[0]);
        } else {
          // No valid roles found
          throw new Error('No valid roles found for user');
        }
      }
    } catch (error) {
      console.error('❌ [Enhanced Auth] Unified login failed:', error);
      this.setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.isLoadingSubject.next(false);
      throw error;
    }
  }

  /**
   * Check if there's a valid role session stored
   */
  private checkStoredRoleSession(): { valid: boolean, role?: string, context?: string } {
    const token = localStorage.getItem('roleSessionToken');
    const expiry = localStorage.getItem('roleSessionExpiry');

    if (!token || !expiry) {
      return { valid: false };
    }

    // Check if session is expired
    if (new Date(expiry) <= new Date()) {
      localStorage.removeItem('roleSessionToken');
      localStorage.removeItem('roleSessionExpiry');
      return { valid: false };
    }

    try {
      // Decode token to get role info
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return { valid: false };
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      return {
        valid: true,
        role: payload.role,
        context: payload.context
      };
    } catch (error) {
      console.error('❌ [Enhanced Auth] Error decoding role session:', error);
      return { valid: false };
    }
  }

  /**
   * Show role selection UI for users with multiple roles
   */
  private showRoleSelectionUI(roleContext: UserRoleContext): void {
    this.isLoadingSubject.next(false);
    
    // Emit custom event for login component to handle UI
    const roleSelectionEvent = new CustomEvent('roleSelectionRequired', {
      detail: {
        userEmail: roleContext.email,
        availableRoles: roleContext.roles,
        hasMultipleRoles: roleContext.hasMultipleRoles
      }
    });
    
    window.dispatchEvent(roleSelectionEvent);
  }

  /**
   * Select and activate a specific role
   */
  async selectAndActivateRole(userEmail: string, selectedRole: RoleOption): Promise<void> {
    try {
      console.log('🎯 [Enhanced Auth] Selecting and activating role:', selectedRole);
      this.isLoadingSubject.next(true);
      this.clearError();

      // ✅ DISABLED: Don't call select-role API for single roles
      // This prevents unnecessary API calls when user has only one role
      console.log('ℹ️ [Enhanced Auth] Skipping select-role API call for role activation');
      
      // Get current access token from MSAL
      const activeAccount = this.msalService.instance.getActiveAccount();
      let currentTokens: { accessToken?: string, idToken?: string, tokenExpiry?: Date } = { 
        accessToken: undefined, 
        idToken: undefined, 
        tokenExpiry: undefined 
      };
      
      if (activeAccount) {
        try {
          const tokenResponse = await this.msalService.instance.acquireTokenSilent({
            scopes: apiScopes,
            account: activeAccount
          });
          currentTokens = {
            accessToken: tokenResponse.accessToken,
            idToken: tokenResponse.idToken,
            tokenExpiry: tokenResponse.expiresOn ? new Date(tokenResponse.expiresOn) : undefined
          };
        } catch (error) {
          console.warn('⚠️ [Enhanced Auth] Could not acquire current tokens:', error);
        }
      }

      // Create user profile directly without API call
      const userProfile: UserProfile = {
        id: 'user-' + Date.now(),
        name: selectedRole.role === 'Platform_Admin' ? 'Akki Khan' : 'User',
        email: userEmail,
        username: userEmail, // Added username
        roles: [selectedRole.role],
        tenantId: selectedRole.tenantId || 'platform',
        isPlatformAdmin: selectedRole.role === 'Platform_Admin',
        permissions: this.getRolePermissions([selectedRole.role]),
        isAuthenticated: true,
        lastLoginTime: new Date().toISOString(),
        // JWT Token information
        accessToken: currentTokens.accessToken,
        idToken: currentTokens.idToken,
        tokenExpiry: currentTokens.tokenExpiry,
        tokenIssuer: 'Azure AD',
        tokenAudience: activeAccount?.environment || 'login.microsoftonline.com'
      };

      console.log('✅ [Enhanced Auth] Role activation successful (direct)');

      // Store user context locally
      this.roleResolutionService.storeUserContext({
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email
      }, selectedRole);

      this.setUserProfileData(userProfile);
      this.redirectPathSubject.next(selectedRole.redirectPath);

      console.log('🎯 [Enhanced Auth] Redirecting to:', selectedRole.redirectPath);

      // Navigate to the appropriate portal
      setTimeout(() => {
        window.location.href = selectedRole.redirectPath;
      }, 500);

    } catch (error) {
      console.error('❌ [Enhanced Auth] Role selection failed:', error);
      this.setError(`Failed to activate role: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.isLoadingSubject.next(false);
      throw error;
    }
  }

  /**
   * Login with redirect
   */
  loginRedirect(): void {
    console.log('🔐 [Enhanced Auth] Starting Azure AD redirect login...');
    
    this.isLoadingSubject.next(true);
    this.clearError();

    const redirectRequest: RedirectRequest = {
      scopes: apiScopes,
      prompt: 'select_account'
    };

    this.msalService.loginRedirect(redirectRequest);
  }

  /**
   * Enhanced logout with full cleanup
   */
  logout(): void {
    console.log('🚪 [Enhanced Auth] Starting enhanced logout...');
    
    try {
      // Clear all authentication state first
      this.clearAuthState();
      
      // End session
      this.sessionService.endSession();
      
      // Clear local storage and user context
      this.roleResolutionService.clearUserContext();
      
      // Clear MSAL cache and accounts
      this.msalService.instance.clearCache();
      
      // Perform MSAL logout with proper redirect
      this.msalService.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + '/login'
      });
      
      console.log('✅ [Enhanced Auth] Logout completed');
    } catch (error) {
      console.error('❌ [Enhanced Auth] Logout failed:', error);
      // Force redirect to login on error and clear state
      this.clearAuthState();
      window.location.href = '/login';
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles.includes(role) || false;
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    console.log('🧹 [Enhanced Auth] Clearing authentication state...');
    this.userProfileSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isLoadingSubject.next(false);
    this.clearError();
    this.clearRedirectPath();
    console.log('✅ [Enhanced Auth] Authentication state cleared');
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const account = this.msalService.instance.getActiveAccount();
      if (!account) {
        console.warn('⚠️ [Enhanced Auth] No active account found for token acquisition');
        return null;
      }

      console.log('🔍 [Enhanced Auth] Acquiring access token for account:', account.username);

      const tokenRequest: SilentRequest = {
        scopes: backendApiScopes,
        account: account
      };

      const response = await this.msalService.instance.acquireTokenSilent(tokenRequest);
      console.log('✅ [Enhanced Auth] Access token acquired successfully');
      console.log('🔍 [Enhanced Auth] Token preview:', response.accessToken.substring(0, 50) + '...');
      
      // Update user profile with latest token information
      this.updateUserProfileWithTokens(response.accessToken, response.idToken, response.expiresOn || undefined);
      
      return response.accessToken;
    } catch (error) {
      console.error('❌ [Enhanced Auth] Failed to acquire access token:', error);
      
      // Try to acquire token interactively if silent acquisition fails
      try {
        console.log('🔄 [Enhanced Auth] Attempting interactive token acquisition...');
        const account = this.msalService.instance.getActiveAccount();
        if (!account) {
          console.error('❌ [Enhanced Auth] No account available for interactive token acquisition');
          return null;
        }
        
        const interactiveRequest: PopupRequest = {
          scopes: backendApiScopes,
          account: account
        };
        
        const response = await this.msalService.instance.acquireTokenPopup(interactiveRequest);
        console.log('✅ [Enhanced Auth] Interactive token acquisition successful');
        return response.accessToken;
      } catch (interactiveError) {
        console.error('❌ [Enhanced Auth] Interactive token acquisition failed:', interactiveError);
        return null;
      }
    }
  }

  /**
   * Debug method to check current authentication state
   */
  debugAuthState(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    const activeAccount = this.msalService.instance.getActiveAccount();
    
    console.log('🔍 [Enhanced Auth] Debug - All accounts:', accounts);
    console.log('🔍 [Enhanced Auth] Debug - Active account:', activeAccount);
    console.log('🔍 [Enhanced Auth] Debug - User profile:', this.userProfileSubject.value);
    console.log('🔍 [Enhanced Auth] Debug - Is authenticated:', this.isAuthenticatedSubject.value);
    
    if (activeAccount) {
      console.log('🔍 [Enhanced Auth] Debug - Account details:', {
        username: activeAccount.username,
        name: activeAccount.name,
        tenantId: activeAccount.tenantId,
        environment: activeAccount.environment
      });
    }
  }

  /**
   * Public method to clear authentication state (for testing purposes)
   */
  clearAuthStatePublic(): void {
    console.log('🧹 [Enhanced Auth] Clearing authentication state (public method)...');
    this.clearAuthState();
  }

  /**
   * Set error message
   */
  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  /**
   * Clear error message
   */
  private clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Get the determined redirect path
   */
  getRedirectPath(): Observable<string> {
    return this.redirectPathSubject.asObservable();
  }

  /**
   * Set user profile from account info
   */
  private setUserProfile(account: AccountInfo): void {
    console.log('👤 [Enhanced Auth] Setting user profile for:', account.username);
    
    const userProfile = this.getUserProfileFromAccount(account);
    
    this.userProfileSubject.next(userProfile);
    this.isAuthenticatedSubject.next(true);
    this.sessionService.startSession(userProfile);
    this.clearError();
    
    console.log('✅ [Enhanced Auth] User profile set successfully');
  }

  /**
   * Update user profile with latest JWT token information
   */
  private updateUserProfileWithTokens(accessToken?: string, idToken?: string, expiresOn?: Date): void {
    const currentProfile = this.userProfileSubject.value;
    if (currentProfile) {
      const updatedProfile: UserProfile = {
        ...currentProfile,
        accessToken: accessToken || currentProfile.accessToken,
        idToken: idToken || currentProfile.idToken,
        tokenExpiry: expiresOn || currentProfile.tokenExpiry
      };
      
      console.log('🔄 [Enhanced Auth] Updating user profile with latest token information');
      this.userProfileSubject.next(updatedProfile);
    }
  }

  /**
   * Set user profile and start session (public method)
   */
  setUserProfileData(userProfile: UserProfile): void {
    this.userProfileSubject.next(userProfile);
    this.isAuthenticatedSubject.next(true);
    this.sessionService.startSession(userProfile);
    this.clearError();
    console.log('✅ [Enhanced Auth] User profile set successfully');
  }

  /**
   * Clear redirect path
   */
  clearRedirectPath(): void {
    this.redirectPathSubject.next('/dashboard');
  }

  /**
   * Select a specific role context
   */
  async selectRole(roleOption: any): Promise<void> {
    try {
      console.log('🎯 [Enhanced Auth] Selecting role:', roleOption);
      
      const apiUrl = environment.apiUrl; // Use the configured API URL
      const response = await fetch(`${apiUrl}/auth/select-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: roleOption.user.email,
          role: roleOption.role,
          context: roleOption.context
        })
      });

      if (!response.ok) {
        throw new Error(`Role selection failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [Enhanced Auth] Role selected successfully:', result);

      // Set user profile and navigate
      const userProfile: UserProfile = {
        id: result.userContext.id,
        name: result.userContext.name,
        email: result.userContext.email,
        roles: result.userContext.roles,
        tenantId: result.userContext.tenantId,
        isPlatformAdmin: result.userContext.isPlatformAdmin,
        permissions: this.getRolePermissions(result.userContext.roles),
        isAuthenticated: true,
        lastLoginTime: result.userContext.lastLoginTime
      };

      // Store user context in localStorage for API calls
      localStorage.setItem('userContext', JSON.stringify(result.userContext));
      localStorage.setItem('selectedRole', roleOption.role);
      if (result.tenant) {
        localStorage.setItem('tenantContext', JSON.stringify(result.tenant));
      }

      this.userProfileSubject.next(userProfile);
      this.isAuthenticatedSubject.next(true);
      this.redirectPathSubject.next(result.redirectPath);
      this.clearError();

      // Navigate to the appropriate portal
      window.location.href = result.redirectPath;
    } catch (error) {
      console.error('❌ [Enhanced Auth] Role selection failed:', error);
      this.setError('Failed to set up your session. Please try again.');
      throw error;
    }
  }

  /**
   * Resolve user roles from Azure AD token
   */
  async resolveUserRoles(idToken: string, accessToken?: string): Promise<any> {
    try {
      console.log('🔍 [Enhanced Auth] Resolving user roles from token...');
      
      const apiUrl = environment.apiUrl; // Use the configured API URL
      const response = await fetch(`${apiUrl}/auth/resolve-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: idToken,
          accessToken: accessToken
        })
      });

      if (!response.ok) {
        throw new Error(`Role resolution failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [Enhanced Auth] Role resolution successful:', result);
      
      return result;
    } catch (error) {
      console.error('❌ [Enhanced Auth] Role resolution failed:', error);
      throw error;
    }
  }



  /**
   * Emit role selection data to components
   */
  private emitRoleSelectionData(roleResolution: any): void {
    // Create a custom event to notify the login component
    const event = new CustomEvent('roleSelectionRequired', {
      detail: {
        availableRoles: roleResolution.availableRoles,
        userEmail: roleResolution.availableRoles[0]?.user?.email || ''
      }
    });
    window.dispatchEvent(event);
  }

} 