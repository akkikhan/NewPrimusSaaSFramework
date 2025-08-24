import { Injectable, OnDestroy } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { AuthenticationResult, InteractionStatus, AccountInfo } from '@azure/msal-browser';
import { BehaviorSubject, Subject, from, of, throwError } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface SimplifiedAuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'PlatformAdmin' | 'TenantAdmin' | null;
  } | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SimplifiedAuthService implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  private authStateSubject = new BehaviorSubject<SimplifiedAuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeAuth(): void {
    console.log('🔄 [Simplified Auth] Initializing authentication...');

    // Check for existing authentication
    this.checkExistingAuth();

    // Listen for interaction completion
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('✅ [Simplified Auth] MSAL interaction completed');
        this.checkExistingAuth();
      });
  }

  private checkExistingAuth(): void {
    // First check session storage
    const sessionToken = sessionStorage.getItem('authToken');
    const sessionUserData = sessionStorage.getItem('userData');
    
    if (sessionToken && sessionUserData) {
      console.log('✅ [Simplified Auth] Found session auth');
      const userData = JSON.parse(sessionUserData);
      this.updateAuthState(true, userData, false, null);
      return;
    }

    // Check MSAL
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      console.log('✅ [Simplified Auth] Found MSAL account');
      const account = accounts[0];
      this.handleMsalAccount(account);
    } else {
      console.log('ℹ️ [Simplified Auth] No authentication found');
      this.updateAuthState(false, null, false, null);
    }
  }

  private handleMsalAccount(account: AccountInfo): void {
    const user = {
      id: account.localAccountId,
      email: account.username,
      name: account.name || account.username,
      role: 'PlatformAdmin' as const
    };

    // Store in session
    sessionStorage.setItem('userData', JSON.stringify(user));
    sessionStorage.setItem('userRole', 'PlatformAdmin');

    this.updateAuthState(true, user, false, null);
  }

  public async loginWithAzureAD(): Promise<void> {
    console.log('🔐 [Simplified Auth] Starting Azure AD login...');
    this.updateAuthState(false, null, true, null);

    try {
      // Use simple scopes for initial login
      await this.msalService.loginRedirect({
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        prompt: 'select_account'
      });
    } catch (error: any) {
      console.error('❌ [Simplified Auth] Login failed:', error);
      this.updateAuthState(false, null, false, error.message);
      throw error;
    }
  }

  public async getAccessToken(): Promise<string | null> {
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      return null;
    }

    try {
      // Try to get token for backend API
      const response = await this.msalService.acquireTokenSilent({
        scopes: ['api://4c024768-9d55-4193-9956-ac3a9686cdd0/access_as_user'],
        account: accounts[0]
      }).toPromise();

      return response?.accessToken || null;
    } catch (error) {
      console.warn('⚠️ [Simplified Auth] Could not get backend token, trying Graph API token');
      
      try {
        // Fallback to Graph API token
        const response = await this.msalService.acquireTokenSilent({
          scopes: ['User.Read'],
          account: accounts[0]
        }).toPromise();
        
        return response?.accessToken || null;
      } catch (error2) {
        console.error('❌ [Simplified Auth] Failed to get any token:', error2);
        return null;
      }
    }
  }

  public logout(): void {
    console.log('🚪 [Simplified Auth] Logging out...');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear auth state
    this.updateAuthState(false, null, false, null);

    // MSAL logout
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: window.location.origin + '/login'
    });
  }

  private updateAuthState(
    isAuthenticated: boolean,
    user: SimplifiedAuthState['user'],
    loading: boolean,
    error: string | null
  ): void {
    this.authStateSubject.next({
      isAuthenticated,
      user,
      loading,
      error
    });
  }

  public isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  public getCurrentUser(): SimplifiedAuthState['user'] {
    return this.authStateSubject.value.user;
  }
}
