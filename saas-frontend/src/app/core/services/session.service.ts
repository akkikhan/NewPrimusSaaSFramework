import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subject, takeUntil, switchMap, of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { SilentRequest } from '@azure/msal-browser';
import { backendApiScopes } from '../../auth/msal-complete-config';

export interface SessionInfo {
  isActive: boolean;
  expiresAt: Date | null;
  lastActivity: Date | null;
  timeUntilExpiry: number; // in minutes
  tenantId?: string;
  selectedRole?: string;
  roleContext?: UserRoleContext;
}

import { UserRoleContext } from './role-resolution.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {
  private sessionInfoSubject = new BehaviorSubject<SessionInfo>({
    isActive: false,
    expiresAt: null,
    lastActivity: null,
    timeUntilExpiry: 0
  });

  private destroy$ = new Subject<void>();
  private readonly SESSION_TIMEOUT_MINUTES = 60; // Match backend configuration
  private readonly REFRESH_BUFFER_MINUTES = 5; // Refresh 5 minutes before expiry

  public sessionInfo$ = this.sessionInfoSubject.asObservable();

  constructor(private msalService: MsalService) {
    this.initializeSessionMonitoring();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Set role context for the current session
   */
  setRoleContext(roleContext: UserRoleContext): void {
    console.log('🔑 [Session] Setting role context:', {
      email: roleContext.email,
      roleCount: roleContext.roles.length,
      hasMultipleRoles: roleContext.hasMultipleRoles,
      timestamp: new Date().toISOString()
    });

    const currentInfo = this.sessionInfoSubject.value;
    
    this.sessionInfoSubject.next({
      ...currentInfo,
      roleContext,
      lastActivity: new Date()
    });
  }

  /**
   * Get current role context
   */
  getRoleContext(): UserRoleContext | undefined {
    return this.sessionInfoSubject.value.roleContext;
  }

  /**
   * Clear role context
   */
  clearRoleContext(): void {
    console.log('🗑️ [Session] Clearing role context');
    
    const currentInfo = this.sessionInfoSubject.value;
    const { roleContext, ...rest } = currentInfo;
    
    this.sessionInfoSubject.next({
      ...rest,
      lastActivity: new Date()
    });
  }

  /**
   * Initialize session monitoring
   */
  private initializeSessionMonitoring(): void {
    // Check session every minute
    interval(60000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.checkSessionValidity())
      )
      .subscribe();

    // Update activity on user interaction
    this.setupActivityTracking();
  }

  /**
   * Set up activity tracking
   */
  private setupActivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    const currentSession = this.sessionInfoSubject.value;
    if (currentSession.isActive) {
      const updatedSession: SessionInfo = {
        ...currentSession,
        lastActivity: new Date()
      };
      this.sessionInfoSubject.next(updatedSession);
      localStorage.setItem('lastActivity', new Date().toISOString());
    }
  }

  /**
   * Check if current session is valid
   */
  private async checkSessionValidity(): Promise<SessionInfo> {
    try {
      const account = this.msalService.instance.getActiveAccount();
      if (!account) {
        return this.createInactiveSession();
      }

      // Check if we have a valid access token
      const silentRequest: SilentRequest = {
        scopes: backendApiScopes,
        account: account,
        forceRefresh: false
      };

      const response = await this.msalService.instance.acquireTokenSilent(silentRequest);
      
      if (response && response.accessToken) {
        // Parse token to get expiry
        const tokenParts = response.accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiryTime = new Date(payload.exp * 1000);
          const timeUntilExpiry = Math.floor((expiryTime.getTime() - Date.now()) / (1000 * 60));

          const sessionInfo: SessionInfo = {
            isActive: true,
            expiresAt: expiryTime,
            lastActivity: this.getLastActivity(),
            timeUntilExpiry: timeUntilExpiry,
            tenantId: this.getTenantContext()?.tenantId,
            selectedRole: localStorage.getItem('selectedRole') || undefined
          };

          this.sessionInfoSubject.next(sessionInfo);

          // Check if we need to refresh soon
          if (timeUntilExpiry <= this.REFRESH_BUFFER_MINUTES && timeUntilExpiry > 0) {
            console.log('🔄 [Session] Token expires soon, attempting refresh...');
            await this.refreshToken();
          }

          return sessionInfo;
        }
      }

      return this.createInactiveSession();
    } catch (error) {
      console.error('❌ [Session] Session validation failed:', error);
      return this.createInactiveSession();
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const account = this.msalService.instance.getActiveAccount();
      if (!account) {
        return false;
      }

      const silentRequest: SilentRequest = {
        scopes: backendApiScopes,
        account: account,
        forceRefresh: true
      };

      const response = await this.msalService.instance.acquireTokenSilent(silentRequest);
      
      if (response && response.accessToken) {
        console.log('✅ [Session] Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [Session] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Create an inactive session object
   */
  private createInactiveSession(): SessionInfo {
    const sessionInfo: SessionInfo = {
      isActive: false,
      expiresAt: null,
      lastActivity: null,
      timeUntilExpiry: 0
    };
    this.sessionInfoSubject.next(sessionInfo);
    return sessionInfo;
  }

  /**
   * Get last activity from storage
   */
  private getLastActivity(): Date | null {
    const lastActivity = localStorage.getItem('lastActivity');
    return lastActivity ? new Date(lastActivity) : null;
  }

  /**
   * Get tenant context from storage
   */
  private getTenantContext(): any {
    const tenantContext = localStorage.getItem('tenantContext');
    return tenantContext ? JSON.parse(tenantContext) : null;
  }

  /**
   * Start a new session
   */
  startSession(userContext: any): void {
    const now = new Date();
    const expiryTime = new Date(now.getTime() + (this.SESSION_TIMEOUT_MINUTES * 60 * 1000));

    const sessionInfo: SessionInfo = {
      isActive: true,
      expiresAt: expiryTime,
      lastActivity: now,
      timeUntilExpiry: this.SESSION_TIMEOUT_MINUTES,
      tenantId: userContext.tenantId,
      selectedRole: userContext.roles?.[0]
    };

    this.sessionInfoSubject.next(sessionInfo);
    localStorage.setItem('lastActivity', now.toISOString());
    localStorage.setItem('sessionStartTime', now.toISOString());
  }

  /**
   * End the current session
   */
  endSession(): void {
    const sessionInfo = this.createInactiveSession();
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('userContext');
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('tenantContext');
  }

  /**
   * Check if session is about to expire
   */
  isSessionExpiringSoon(): boolean {
    const currentSession = this.sessionInfoSubject.value;
    return currentSession.isActive && currentSession.timeUntilExpiry <= this.REFRESH_BUFFER_MINUTES;
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo {
    return this.sessionInfoSubject.value;
  }
}
