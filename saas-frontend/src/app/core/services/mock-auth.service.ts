import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError, tap } from 'rxjs/operators';
import { MOCK_USERS, validateMockCredentials, generateMockToken, MockUser } from '../mocks/mock-users';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockAuthService {
  private readonly apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}

  /**
   * Attempt real API login first, fallback to mock if it fails
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    // First try real API
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => console.log('✅ [MockAuth] Real API login successful:', response)),
      catchError(error => {
        console.log('⚠️ [MockAuth] Real API failed, using mock authentication');
        
        // Fallback to mock authentication
        const user = validateMockCredentials(credentials.email, credentials.password);
        
        if (user) {
          const token = generateMockToken(user);
          const response: LoginResponse = {
            success: true,
            token: token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: user.tenantId,
              tenantName: user.tenantName,
              isPlatformAdmin: user.role === 'Platform_Admin',
              isTenantAdmin: user.role === 'Tenant_Admin'
            }
          };
          
          // Store in session for persistence
          sessionStorage.setItem('mockAuthToken', token);
          sessionStorage.setItem('mockAuthUser', JSON.stringify(response.user));
          
          return of(response).pipe(delay(500)); // Simulate network delay
        }
        
        return throwError(() => ({ 
          success: false, 
          message: 'Invalid credentials' 
        }));
      })
    );
  }

  /**
   * Get available users for demonstration
   */
  getDemoUsers(): MockUser[] {
    return MOCK_USERS.map(user => ({
      ...user,
      password: '***' // Don't expose passwords
    }));
  }

  /**
   * Get mock user from stored session
   */
  getMockUser(): any {
    const userStr = sessionStorage.getItem('mockAuthUser');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  /**
   * Clear mock session
   */
  clearMockSession(): void {
    sessionStorage.removeItem('mockAuthToken');
    sessionStorage.removeItem('mockAuthUser');
  }
}
