import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult, InteractionRequiredAuthError, BrowserConfigurationAuthError } from '@azure/msal-browser';
import { silentRequest } from '../../auth/msal-complete-config';

/**
 * ✅ MSAL Token Interceptor for Azure AD + YARP Gateway Integration
 * Automatically attaches tokens to API calls and handles token refresh
 */
@Injectable()
export class MsalTokenInterceptor implements HttpInterceptor {
  
  constructor(private msalService: MsalService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // ✅ Check if request needs authentication
    if (!this.shouldAttachToken(req.url)) {
      return next.handle(req);
    }

    // ✅ Get token and attach to request
    return from(this.getAccessToken()).pipe(
      switchMap((token: string | null) => {
        const authReq = this.addAuthHeader(req, token);
        return next.handle(authReq);
      }),
      catchError((error: HttpErrorResponse) => {
        // ✅ Handle 401 errors by attempting token refresh
        if (error.status === 401) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Determine if request should have authentication token attached
   */
  private shouldAttachToken(url: string): boolean {
    const origin = (typeof window !== 'undefined' && (window as any).location) ? (window as any).location.origin : '';
    const protectedEndpoints = [
      `${origin}/api`,            // ✅ All API routed via proxy at current origin
      `${origin}/orchestrator`,   // ✅ Orchestrator if exposed via proxy
    ];

    const unprotectedEndpoints = [
      '/health',
      '/swagger',
      '/favicon.ico',
      '.css',
      '.js',
      '.png',
      '.jpg',
      '.svg'
    ];

    // ✅ Skip static resources and public endpoints
    if (unprotectedEndpoints.some(endpoint => url.includes(endpoint))) {
      return false;
    }

    // ✅ Attach token to protected API endpoints
    return protectedEndpoints.some(endpoint => url.startsWith(endpoint));
  }

  /**
   * ✅ Get access token from MSAL with proper scopes
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      // Get the active account
      const activeAccount = this.msalService.instance.getActiveAccount();
      if (!activeAccount) {
        console.warn('⚠️ No active account found. User may need to login.');
        return null;
      }

      // Update silent request with active account
      const tokenRequest = {
        ...silentRequest,
        account: activeAccount
      };

      // ✅ Attempt silent token acquisition
      const result: AuthenticationResult = await this.msalService.instance.acquireTokenSilent(tokenRequest);
      
      console.log('✅ Token acquired silently', {
        scopes: result.scopes,
        expiresOn: result.expiresOn,
        account: result.account?.username
      });

      return result.accessToken;

    } catch (error) {
      console.error('❌ Error acquiring token silently:', error);
      
      // ✅ Handle different error types
      if (error instanceof InteractionRequiredAuthError) {
        console.warn('⚠️ Interaction required - redirecting to login...');
        // Trigger interactive login
        await this.msalService.instance.acquireTokenRedirect(silentRequest);
      } else if (error instanceof BrowserConfigurationAuthError) {
        console.error('❌ MSAL configuration error:', error);
      }
      
      return null;
    }
  }

  /**
   * ✅ Add authorization header to request
   */
  private addAuthHeader(req: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (!token) {
      console.warn('⚠️ No token available for request:', req.url);
      return req;
    }

    // ✅ Clone request and add Authorization header
    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Client-Version': '1.0.0',
        'X-Client-Platform': 'Angular'
      }
    });

    console.log('✅ Added auth header to request:', {
      url: req.url,
      method: req.method,
      hasToken: !!token
    });

    return authReq;
  }

  /**
   * ✅ Handle 401 Unauthorized errors
   */
  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.warn('⚠️ 401 Unauthorized - attempting token refresh...');
    
    return from(this.refreshTokenAndRetry()).pipe(
      switchMap((token: string | null) => {
        if (token) {
          // ✅ Retry original request with new token
          const authReq = this.addAuthHeader(req, token);
          return next.handle(authReq);
        } else {
          // ✅ Token refresh failed - redirect to login
          console.error('❌ Token refresh failed - redirecting to login');
          this.msalService.instance.acquireTokenRedirect(silentRequest);
          return throwError(() => new Error('Authentication required'));
        }
      }),
      catchError((error) => {
        console.error('❌ Error during token refresh and retry:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Refresh token and return new access token
   */
  private async refreshTokenAndRetry(): Promise<string | null> {
    try {
      const activeAccount = this.msalService.instance.getActiveAccount();
      if (!activeAccount) {
        return null;
      }

      const tokenRequest = {
        ...silentRequest,
        account: activeAccount,
        forceRefresh: true // ✅ Force token refresh
      };

      const result: AuthenticationResult = await this.msalService.instance.acquireTokenSilent(tokenRequest);
      console.log('✅ Token refreshed successfully');
      
      return result.accessToken;
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      return null;
    }
  }
} 