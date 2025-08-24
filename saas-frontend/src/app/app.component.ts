import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { AuthenticationResult, InteractionStatus, EventMessage, EventType } from '@azure/msal-browser';
import { Subject, filter, takeUntil } from 'rxjs';
import { DualAuthService } from './core/services/dual-auth.service';
import { DialogComponent } from './shared/components/dialog/dialog.component';
import { TokenStatusComponent } from './shared/components/token-status/token-status.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DialogComponent, TokenStatusComponent, ToastComponent],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
      <app-dialog></app-dialog>
      <app-token-status></app-token-status>
      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'SaaS Factory';
  private destroy$ = new Subject<void>();
  private isHandlingRedirect = false;

  constructor(
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private dualAuthService: DualAuthService,
    private router: Router
  ) {
    console.log('🚀 [App Component] Constructor - App starting...');
  }

  ngOnInit(): void {
    console.log('🚀 [App Component] OnInit - Initializing...');
    
    // First, handle any pending redirects from Azure AD
    this.handleInitialRedirect();
    
    // Then set up ongoing authentication handling
    this.setupAuthenticationListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle the initial redirect from Azure AD
   */
  private async handleInitialRedirect(): Promise<void> {
    console.log('🔄 [App Component] Checking for Azure AD redirect...');
    
    // Skip handling if we're on the redirect callback route
    const currentPath = this.router.url;
    if (currentPath.includes('/auth/callback')) {
      console.log('ℹ️ [App Component] On redirect callback route, skipping app-level handling');
      return;
    }
    // If we're already under a tenant route, let the tenant auth flow own the page
    if (currentPath.startsWith('/tenants/')) {
      console.log('ℹ️ [App Component] On tenant route, skipping platform-level auth handling');
      return;
    }
    
    // If this is a tenant sign-in (identified by custom 'state' containing tenantId),
    // forward the code/state to the tenant callback route so the tenant MSAL instance handles it.
    try {
  const url = new URL(window.location.href);
  // MSAL often returns params in the hash for SPAs; support both search and hash
  const searchCode = url.searchParams.get('code');
  const searchState = url.searchParams.get('state');
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.substring(1) : window.location.hash || '';
  const hashParams = new URLSearchParams(hash);
  const hashCode = hashParams.get('code');
  const hashState = hashParams.get('state');
  const code = searchCode || hashCode;
  const stateParam = searchState || hashState;

      if (code && stateParam) {
        let parsedState: any = null;
        try {
          // Our state is JSON-serialized; decode URI component first
          parsedState = JSON.parse(decodeURIComponent(stateParam));
        } catch {
          // If parsing fails, leave parsedState as null and continue with default flow
        }

        const tenantIdFromState = parsedState?.tenantId;
        if (tenantIdFromState) {
          console.log(`🔀 [App Component] Detected tenant login via state for tenant: ${tenantIdFromState}`);
          // Preserve the original code/state and forward to the tenant callback route
          const forwardUrl = `/tenants/${tenantIdFromState}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(stateParam)}`;
          // Use replace to avoid polluting history
          window.location.replace(forwardUrl);
          return;
        }
      }
    } catch (parseErr) {
      console.warn('⚠️ [App Component] Failed to inspect redirect state for tenant routing:', parseErr);
    }

    try {
      // This handles the redirect from Azure AD
      const result = await this.msalService.instance.handleRedirectPromise();
      
      if (result) {
        console.log('✅ [App Component] Azure AD redirect detected!');
        console.log('👤 [App Component] Account:', result.account?.username);
        console.log('🎫 [App Component] Token received:', !!result.accessToken);
        
        // Only process as platform login when not on a tenant flow
        if (!window.location.pathname.startsWith('/tenants/')) {
          this.processAuthenticationResult(result);
        } else {
          console.log('ℹ️ [App Component] Tenant route detected post-redirect; skipping platform session bootstrap');
        }
      } else {
        console.log('ℹ️ [App Component] No redirect to handle');
        
        // Check if user is already authenticated
        const activeAccount = this.msalService.instance.getActiveAccount();
        if (activeAccount) {
          console.log('✅ [App Component] User already authenticated:', activeAccount.username);
          // Avoid platform session bootstrap on tenant routes
          if (!window.location.pathname.startsWith('/tenants/')) {
            this.ensureSessionIsSetUp(activeAccount);
          }
        }
      }
    } catch (error) {
      console.error('❌ [App Component] Error handling redirect:', error);
      this.clearFailedRequests();
    }
  }

  /**
   * Set up ongoing authentication event listeners
   */
  private setupAuthenticationListeners(): void {
    console.log('🔄 [App Component] Setting up auth listeners...');
    
    // Listen for login success events
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroy$)
      )
      .subscribe((result: EventMessage) => {
        console.log('🎉 [App Component] Login success event!');
        const payload = result.payload as AuthenticationResult;
        if (payload?.account && !this.isHandlingRedirect) {
          this.processAuthenticationResult(payload);
        }
      });
    
    // Listen for when all interactions are complete
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('✅ [App Component] All MSAL interactions complete');
        
        // Final check - if we're authenticated but still on login page, redirect
        const currentPath = this.router.url;
  if ((currentPath === '/login' || currentPath === '/') && !currentPath.startsWith('/tenants/')) {
          const activeAccount = this.msalService.instance.getActiveAccount();
          if (activeAccount) {
            console.log('🔄 [App Component] Authenticated but on login page, redirecting...');
            this.navigateToDashboard();
          }
        }
      });
  }

  /**
   * Process successful authentication result
   */
  private processAuthenticationResult(result: AuthenticationResult): void {
    if (this.isHandlingRedirect) {
      console.log('⏳ [App Component] Already handling redirect, skipping...');
      return;
    }
    
    this.isHandlingRedirect = true;
    console.log('🔄 [App Component] Processing authentication result...');
    
    if (result.account) {
      // Set as active account
      this.msalService.instance.setActiveAccount(result.account);
      
      // Create user data (platform context only)
      const userData = {
        id: result.account.localAccountId,
        email: result.account.username,
        name: result.account.name || result.account.username,
        role: 'PlatformAdmin',
        tenantId: null,
        isPlatformAdmin: true
      };
      
      // Store in session (platform-only)
      if (!window.location.pathname.startsWith('/tenants/')) {
        sessionStorage.setItem('authToken', result.accessToken);
        sessionStorage.setItem('userData', JSON.stringify(userData));
        sessionStorage.setItem('userRole', 'PlatformAdmin');
      }
      
      console.log('✅ [App Component] Session data stored');
      
      // Update auth service
      this.dualAuthService.setUserProfile(userData);
      
      // Navigate to dashboard (platform-only)
      if (!window.location.pathname.startsWith('/tenants/')) {
        this.navigateToDashboard();
      }
    }
    
    setTimeout(() => {
      this.isHandlingRedirect = false;
    }, 2000);
  }

  /**
   * Ensure session is set up for already authenticated users
   */
  private ensureSessionIsSetUp(account: any): void {
    const existingToken = sessionStorage.getItem('authToken');
    if (!existingToken) {
      console.log('🔄 [App Component] Setting up session for existing account...');
      
      const userData = {
        id: account.localAccountId,
        email: account.username,
        name: account.name || account.username,
        role: 'PlatformAdmin',
        tenantId: null,
        isPlatformAdmin: true
      };
      
      sessionStorage.setItem('authToken', 'msal-authenticated');
      sessionStorage.setItem('userData', JSON.stringify(userData));
      sessionStorage.setItem('userRole', 'PlatformAdmin');
      
      this.dualAuthService.setUserProfile(userData);
    }
  }

  /**
   * Navigate to dashboard with retry logic
   */
  private navigateToDashboard(): void {
    const returnUrl = sessionStorage.getItem('authReturnUrl') || '/dashboard';
    sessionStorage.removeItem('authReturnUrl');
    
    console.log(`🚀 [App Component] Navigating to: ${returnUrl}`);
    
    // First attempt with router
    this.router.navigate([returnUrl], { replaceUrl: true })
      .then(success => {
        if (success) {
          console.log('✅ [App Component] Navigation successful');
        } else {
          console.warn('⚠️ [App Component] Navigation returned false, using location.href');
          window.location.href = returnUrl;
        }
      })
      .catch(error => {
        console.error('❌ [App Component] Navigation error:', error);
        // Fallback to direct navigation
        window.location.href = returnUrl;
      });
  }

  /**
   * Clear any failed request entries
   */
  private clearFailedRequests(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('failedRequests') || key.includes('server-telemetry'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🧹 [App Component] Removed:', key);
    });
  }
}
