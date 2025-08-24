import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class MsalHttpInterceptor implements HttpInterceptor {
  constructor(private msalService: MsalService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Skip token attachment for public endpoints
    const publicEndpoints = [
      '/api/v2/tenants/onboard-full',
      '/api/auth/verify-email',
      '/api/auth/verify-email/resend',
      '/api/v2/health',
      '/api/v2/system/health',
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      request.url.includes(endpoint)
    );

    if (isPublicEndpoint) {
      return next.handle(request);
    }

    // Get the active account
    const activeAccount = this.msalService.instance.getActiveAccount();

    if (!activeAccount) {
      // No active account, proceed without token
      return next.handle(request);
    }

    // Define scopes for your API
    const scopes = ['api://4b179a1d-ae0b-4b55-9c80-212124e6f944/.default'];

    // Acquire token silently
    return from(
      this.msalService.instance.acquireTokenSilent({
        scopes,
        account: activeAccount,
      })
    ).pipe(
      switchMap((tokenResponse) => {
        // Clone the request and add the authorization header
        const authRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
          },
        });

        console.log('MSAL: Token attached to request', {
          url: request.url,
          tokenPresent: !!tokenResponse.accessToken,
        });

        return next.handle(authRequest);
      }),
      catchError((error: any) => {
        if (error instanceof InteractionRequiredAuthError) {
          // Token expired or interaction required
          console.warn('MSAL: Interaction required for token refresh');

          // Trigger interactive login
          return from(
            this.msalService.instance.acquireTokenPopup({
              scopes,
              account: activeAccount,
            })
          ).pipe(
            switchMap((tokenResponse) => {
              const authRequest = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokenResponse.accessToken}`,
                },
              });
              return next.handle(authRequest);
            }),
            catchError((err) => {
              console.error('MSAL: Failed to acquire token', err);
              return throwError(() => err);
            })
          );
        }

        // For other errors, just pass the request without token
        console.warn('MSAL: Proceeding without token due to error', error);
        return next.handle(request);
      })
    );
  }
}
