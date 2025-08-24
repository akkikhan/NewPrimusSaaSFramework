import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class CorsInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone the request to add CORS headers
    const corsRequest = req.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return next.handle(corsRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle CORS-specific errors
        if (error.status === 0 && error.statusText === 'Unknown Error') {
          console.error('CORS Error: This might be a CORS-related issue. Check if the API server is running and CORS is properly configured.');
          console.error('Request URL:', req.url);
          console.error('Request Method:', req.method);
        }
        
        // Log CORS preflight failures
        if (error.status === 404 && req.method === 'OPTIONS') {
          console.error('CORS Preflight Failed: OPTIONS request failed for', req.url);
        }
        
        return throwError(() => error);
      })
    );
  }
}

/**
 * Usage in app.module.ts:
 * 
 * import { HTTP_INTERCEPTORS } from '@angular/common/http';
 * import { CorsInterceptor } from './interceptors/cors.interceptor';
 * 
 * @NgModule({
 *   providers: [
 *     {
 *       provide: HTTP_INTERCEPTORS,
 *       useClass: CorsInterceptor,
 *       multi: true
 *     }
 *   ]
 * })
 */
