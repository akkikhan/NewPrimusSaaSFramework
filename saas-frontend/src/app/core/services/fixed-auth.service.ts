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
  SilentRequest,
  InteractionRequiredAuthError
} from '@azure/msal-browser';
import { 
  Observable, 
  BehaviorSubject, 
  of, 
  from,
  Subject,
  throwError
} from 'rxjs';
import { 
  map, 
  catchError, 
  switchMap, 
  tap, 
  take,
  takeUntil,
  filter
} from 'rxjs/operators';

// Import the fixed configuration
import { 
  msalConfig, 
  loginRequest, 
  apiScopes
} from '../../auth/msal-fixed-config';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isPlatformAdmin: boolean;
  tenantId?: string;
  accessToken?: string;
  idToken?: string;
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
export class FixedAuthService implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State management
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null
  });
  
  public authState$ = this.authStateSubject.asObservable();
  public isAuthenticated$ = this.authState$.pipe(map(state => state.isAuthenticated));
  public isLoading$ = this.authState$.pipe(map(state => state.isLoading));
  public user$ = this.authState$.pipe(map(state => state.user));
  public error$ = this.authState$.pipe(map(state => state.error));

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private router: Router
  ) {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initialize(): void {
    console.log('🔧 [Fixed Auth Service] Initializing...');
    
    // Listen for interaction completion
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('✅ [Fixed Auth Service] Interaction completed');
        this.checkAndSetAuthState();
      });
    
    // Handle redirect promise
    this.msalService.handleRedirectObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result) {
            console.log('✅ [Fixed Auth Service] Redirect handled successfully');
            this.handleAuthResult(result);
          }
        },
        error: (error) => {
          console.error('❌ [Fixed Auth Service] Redirect error:', error);
          this.setError('Authentication failed. Please try again.');
        }
      });
    
    // Initial auth check
    this.checkAndSetAuthState();
  }

  private checkAndSetAuthState(): void {
    console.log('🔍 [Fixed Auth Service] Checking authentication state...');
    
    const account = this.msalService.instance.getActiveAccount() || this.msalService.instance.getAllAccounts()[0];
    
    if (account) {
      console.log('✅ [Fixed Auth Service] Account found:', account.username);
      this.setAuthenticatedState(account);
    } else {
      console.log('❌ [Fixed Auth Service] No account found');
      this.clearAuthState();
    }
    
    this.updateState({ isLoading: false });
  }

  private setAuthenticatedState(account: AccountInfo): void {
    const userProfile: UserProfile = {
      id: account.localAccountId,
      email: account.username,
      name: account.name || account.username,
      roles: ['platform_admin'], // Default role for now
      isPlatformAdmin: true,
      tenantId: account.tenantId
    };
    
    this.updateState({
      isAuthenticated: true,
      user: userProfile,
      error: null
    });
    
    // Store in session for guards
    sessionStorage.setItem('authToken', 'authenticated');
    sessionStorage.setItem('userData', JSON.stringify(userProfile));
  }

  private clearAuthState(): void {
    this.updateState({
      isAuthenticated: false,
      user: null,
      error: null
    });
    
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
  }

  private updateState(partial: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({ ...currentState, ...partial });
  }

  private setError(error: string): void {
    this.updateState({ error, isLoading: false });
  }

  private handleAuthResult(result: AuthenticationResult): void {
    console.log('🎉 [Fixed Auth Service] Authentication successful');
    
    if (result.account) {
      this.msalService.instance.setActiveAccount(result.account);
      this.setAuthenticatedState(result.account);
      
      // Navigate to dashboard
      const returnUrl = sessionStorage.getItem('authReturnUrl') || '/dashboard';
      sessionStorage.removeItem('authReturnUrl');
      
      console.log('🚀 [Fixed Auth Service] Navigating to:', returnUrl);
      this.router.navigate([returnUrl]);
    }
  }

  // Public methods
  async login(): Promise<void> {
    console.log('🔐 [Fixed Auth Service] Starting login...');
    
    try {
      this.updateState({ isLoading: true, error: null });
      
      // Clear any existing failed requests
      this.clearFailedRequests();
      
      // Use redirect for more reliable authentication
      await this.msalService.loginRedirect(loginRequest);
    } catch (error) {
      console.error('❌ [Fixed Auth Service] Login failed:', error);
      this.setError('Login failed. Please try again.');
    }
  }

  async logout(): Promise<void> {
    console.log('🚪 [Fixed Auth Service] Logging out...');
    
    try {
      this.clearAuthState();
      
      await this.msalService.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + '/login'
      });
    } catch (error) {
      console.error('❌ [Fixed Auth Service] Logout failed:', error);
      // Force redirect anyway
      window.location.href = '/login';
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const account = this.msalService.instance.getActiveAccount() || this.msalService.instance.getAllAccounts()[0];
      if (!account) return null;
      
      // First try to get Graph token
      const graphTokenRequest = {
        scopes: apiScopes,
        account: account
      };
      
      const response = await this.msalService.instance.acquireTokenSilent(graphTokenRequest);
      return response.accessToken;
    } catch (error) {
      console.error('❌ [Fixed Auth Service] Token acquisition failed:', error);
      
      if (error instanceof InteractionRequiredAuthError) {
        // Try popup
        try {
          const response = await this.msalService.instance.acquireTokenPopup({
            scopes: apiScopes
          });
          return response.accessToken;
        } catch (popupError) {
          console.error('❌ [Fixed Auth Service] Popup failed:', popupError);
        }
      }
      
      return null;
    }
  }

  private clearFailedRequests(): void {
    // Clear any failed request entries from localStorage
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('failedRequests') || key.includes('server-telemetry'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('🧹 [Fixed Auth Service] Removing:', key);
      localStorage.removeItem(key);
    });
  }
}
