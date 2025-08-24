import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription, timer } from 'rxjs';
import { takeUntil, filter, switchMap, catchError } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser';
import { DialogService } from '../../shared/services/dialog.service';
import { Router } from '@angular/router';

export interface TokenExpirationConfig {
  // Token expiration settings
  warningThresholdMinutes: number; // Show warning this many minutes before expiration
  refreshThresholdMinutes: number; // Start auto-refresh this many minutes before expiration
  maxRefreshAttempts: number; // Maximum number of refresh attempts
  
  // Session settings
  sessionTimeoutMinutes: number; // Total session timeout
  enableAutoRefresh: boolean; // Whether to auto-refresh tokens
  enableUserNotifications: boolean; // Whether to show user notifications
  
  // UI settings
  showExpirationWarning: boolean; // Show warning dialog before expiration
  showSessionExpired: boolean; // Show session expired dialog
  redirectOnExpiration: boolean; // Redirect to login on expiration
}

export interface TokenInfo {
  accessToken: string;
  expiresOn: Date;
  scopes: string[];
  account: any;
  isExpired: boolean;
  minutesUntilExpiration: number;
}

@Injectable({
  providedIn: 'root'
})
export class TokenExpirationService implements OnDestroy {
  private readonly defaultConfig: TokenExpirationConfig = {
    warningThresholdMinutes: 5, // Show warning 5 minutes before expiration
    refreshThresholdMinutes: 10, // Start auto-refresh 10 minutes before expiration
    maxRefreshAttempts: 3,
    sessionTimeoutMinutes: 60, // 1 hour session timeout
    enableAutoRefresh: true,
    enableUserNotifications: true,
    showExpirationWarning: true,
    showSessionExpired: true,
    redirectOnExpiration: true
  };

  private config: TokenExpirationConfig = { ...this.defaultConfig };
  private tokenInfoSubject = new BehaviorSubject<TokenInfo | null>(null);
  private isExpiringSubject = new BehaviorSubject<boolean>(false);
  private refreshAttempts = 0;
  private expirationTimer?: Subscription;
  private refreshTimer?: Subscription;
  private warningShown = false;
  private sessionExpiredShown = false;

  // Public observables
  public tokenInfo$ = this.tokenInfoSubject.asObservable();
  public isExpiring$ = this.isExpiringSubject.asObservable();

  constructor(
    private msalService: MsalService,
    private dialogService: DialogService,
    private router: Router
  ) {
    this.initializeTokenMonitoring();
  }

  /**
   * Configure token expiration settings
   */
  configure(config: Partial<TokenExpirationConfig>): void {
    this.config = { ...this.defaultConfig, ...config };
    console.log('🔧 [Token Expiration] Configuration updated:', this.config);
  }

  /**
   * Get current token information
   */
  getCurrentTokenInfo(): TokenInfo | null {
    return this.tokenInfoSubject.value;
  }

  /**
   * Check if token is expiring soon
   */
  isTokenExpiringSoon(): boolean {
    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo) return false;
    
    return tokenInfo.minutesUntilExpiration <= this.config.warningThresholdMinutes;
  }

  /**
   * Manually refresh the current token
   */
  async refreshToken(): Promise<boolean> {
    try {
      console.log('🔄 [Token Expiration] Manual token refresh requested');
      
      const activeAccount = this.msalService.instance.getActiveAccount();
      if (!activeAccount) {
        console.warn('⚠️ [Token Expiration] No active account for token refresh');
        return false;
      }

      const tokenRequest = {
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        account: activeAccount,
        forceRefresh: true
      };

      const result: AuthenticationResult = await this.msalService.instance.acquireTokenSilent(tokenRequest);
      
      console.log('✅ [Token Expiration] Token refreshed successfully');
      this.refreshAttempts = 0;
      this.updateTokenInfo(result);
      return true;

    } catch (error) {
      console.error('❌ [Token Expiration] Token refresh failed:', error);
      this.refreshAttempts++;
      
      if (error instanceof InteractionRequiredAuthError) {
        console.warn('⚠️ [Token Expiration] User interaction required for token refresh');
        await this.handleSessionExpiration('Token refresh requires re-authentication');
        return false;
      }
      
      return false;
    }
  }

  /**
   * Initialize token monitoring
   */
  private initializeTokenMonitoring(): void {
    console.log('🔧 [Token Expiration] Initializing token monitoring...');
    
    // Monitor authentication state changes
    this.msalService.instance.enableAccountStorageEvents();
    
    // Set up periodic token checks
    this.expirationTimer = interval(30000) // Check every 30 seconds
      .pipe(
        filter(() => this.config.enableAutoRefresh)
      )
      .subscribe(() => {
        this.checkTokenExpiration();
      });

    // Initial check
    this.checkTokenExpiration();
  }

  /**
   * Check current token expiration status
   */
  private async checkTokenExpiration(): Promise<void> {
    try {
      const activeAccount = this.msalService.instance.getActiveAccount();
      if (!activeAccount) {
        console.log('ℹ️ [Token Expiration] No active account - skipping token check');
        return;
      }

      // Get current token info
      const tokenRequest = {
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        account: activeAccount,
        forceRefresh: false
      };

      const result: AuthenticationResult = await this.msalService.instance.acquireTokenSilent(tokenRequest);
      this.updateTokenInfo(result);

      // Check if token needs refresh
      if (this.shouldRefreshToken()) {
        await this.handleTokenRefresh();
      }

      // Check if warning should be shown
      if (this.shouldShowWarning()) {
        await this.showExpirationWarning();
      }

    } catch (error) {
      console.error('❌ [Token Expiration] Error checking token expiration:', error);
      
      if (error instanceof InteractionRequiredAuthError) {
        await this.handleSessionExpiration('Authentication required');
      }
    }
  }

  /**
   * Update token information
   */
  private updateTokenInfo(result: AuthenticationResult): void {
    const expiresOn = result.expiresOn ? new Date(result.expiresOn) : new Date();
    const now = new Date();
    const minutesUntilExpiration = Math.max(0, (expiresOn.getTime() - now.getTime()) / (1000 * 60));

    const tokenInfo: TokenInfo = {
      accessToken: result.accessToken,
      expiresOn: expiresOn,
      scopes: result.scopes,
      account: result.account,
      isExpired: expiresOn <= now,
      minutesUntilExpiration: minutesUntilExpiration
    };

    this.tokenInfoSubject.next(tokenInfo);
    this.isExpiringSubject.next(minutesUntilExpiration <= this.config.warningThresholdMinutes);

    console.log('📊 [Token Expiration] Token info updated:', {
      expiresOn: expiresOn.toISOString(),
      minutesUntilExpiration: Math.round(minutesUntilExpiration),
      isExpired: tokenInfo.isExpired
    });
  }

  /**
   * Determine if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo || tokenInfo.isExpired) return false;
    
    return tokenInfo.minutesUntilExpiration <= this.config.refreshThresholdMinutes &&
           this.refreshAttempts < this.config.maxRefreshAttempts;
  }

  /**
   * Determine if warning should be shown
   */
  private shouldShowWarning(): boolean {
    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo || tokenInfo.isExpired || this.warningShown) return false;
    
    return tokenInfo.minutesUntilExpiration <= this.config.warningThresholdMinutes &&
           this.config.showExpirationWarning &&
           this.config.enableUserNotifications;
  }

  /**
   * Handle automatic token refresh
   */
  private async handleTokenRefresh(): Promise<void> {
    try {
      console.log('🔄 [Token Expiration] Starting automatic token refresh...');
      
      const success = await this.refreshToken();
      if (success) {
        console.log('✅ [Token Expiration] Automatic token refresh successful');
        this.warningShown = false; // Reset warning flag
      } else {
        console.warn('⚠️ [Token Expiration] Automatic token refresh failed');
      }

    } catch (error) {
      console.error('❌ [Token Expiration] Automatic token refresh error:', error);
    }
  }

  /**
   * Show expiration warning dialog
   */
  private async showExpirationWarning(): Promise<void> {
    if (this.warningShown) return;

    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo) return;

    this.warningShown = true;
    const minutesLeft = Math.round(tokenInfo.minutesUntilExpiration);

    console.log('⚠️ [Token Expiration] Showing expiration warning dialog');

    this.dialogService.warning(
      'Session Expiring Soon',
      `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. ` +
      'Would you like to extend your session?'
    ).subscribe(result => {
      if (result.confirmed) {
        this.refreshToken();
      }
    });
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpiration(reason: string): Promise<void> {
    if (this.sessionExpiredShown) return;

    this.sessionExpiredShown = true;
    console.log('🚨 [Token Expiration] Session expired:', reason);

    if (this.config.showSessionExpired && this.config.enableUserNotifications) {
      this.dialogService.error(
        'Session Expired',
        'Your session has expired. You will be redirected to the login page.'
      ).subscribe(() => {
        this.performLogout();
      });
    } else {
      this.performLogout();
    }
  }

  /**
   * Perform logout and cleanup
   */
  private performLogout(): void {
    console.log('🚪 [Token Expiration] Performing logout due to session expiration');
    
    // Clear all timers
    this.clearTimers();
    
    // Clear authentication state
    this.tokenInfoSubject.next(null);
    this.isExpiringSubject.next(false);
    this.warningShown = false;
    this.sessionExpiredShown = false;
    this.refreshAttempts = 0;

    // Redirect to login if configured
    if (this.config.redirectOnExpiration) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.expirationTimer) {
      this.expirationTimer.unsubscribe();
      this.expirationTimer = undefined;
    }
    
    if (this.refreshTimer) {
      this.refreshTimer.unsubscribe();
      this.refreshTimer = undefined;
    }
  }

  /**
   * Reset service state (useful for testing or manual logout)
   */
  reset(): void {
    console.log('🔄 [Token Expiration] Resetting service state');
    this.clearTimers();
    this.tokenInfoSubject.next(null);
    this.isExpiringSubject.next(false);
    this.warningShown = false;
    this.sessionExpiredShown = false;
    this.refreshAttempts = 0;
    this.initializeTokenMonitoring();
  }

  ngOnDestroy(): void {
    console.log('🧹 [Token Expiration] Cleaning up service');
    this.clearTimers();
  }
} 