import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip authentication for login/public endpoints
  if (isPublicRoute(req.url)) {
    return next(req);
  }

  // For local development, just add basic headers with auth token if available
  const token = authService.getAccessToken();
  const headers: any = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': generateCorrelationId(),
    'X-Tenant-Id': authService.getCurrentTenantId() || 'default-tenant'
  };

  // Add Authorization header if token is available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({
    setHeaders: headers
  });

  // For local development, just proceed with the request
  // If it fails, that's okay - we're working with mock data anyway
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // In local mode, just log errors but don't show dialogs
      console.log(`[Local Mode] API call failed: ${req.method} ${req.url} - ${error.status} ${error.message}`);
      return throwError(() => error);
    })
  );
};

function isPublicRoute(url: string): boolean {
  const publicRoutes = [
    '/health',
    '/api/health',
    '/swagger',
    '/login',
  '/register',
  '/tenants/login',
  '/tenants/change-password',
  '/tenants/debug',
  // '/tenants/onboard' intentionally NOT public – onboarding is platform-admin only
  '/auto-login'
  ];
  
  return publicRoutes.some(route => url.includes(route));
}

function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 