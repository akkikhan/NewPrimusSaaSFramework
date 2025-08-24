import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
  isPlatformAdmin: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Predefined users for testing
const USERS = [
  {
    id: 'admin-001',
    email: 'admin@saasfactory.com',
    password: 'Admin123!',
    name: 'Platform Administrator',
    role: 'PlatformAdmin',
    isPlatformAdmin: true,
    tenantId: null
  },
  {
    id: 'tenant-001',
    email: 'admin@primussoft.com',
    password: 'Tenant123!',
    name: 'PrimusSoft Admin',
    role: 'TenantAdmin',
    isPlatformAdmin: false,
    tenantId: 'primussoft-20250801'
  },
  {
    id: 'user-001',
    email: 'user@primussoft.com',
    password: 'User123!',
    name: 'John Doe',
    role: 'TenantUser',
    isPlatformAdmin: false,
    tenantId: 'primussoft-20250801'
  }
];

@Injectable({
  providedIn: 'root'
})
export class LocalAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private router: Router) {
    // Check for existing session
    this.checkExistingSession();
  }

  private checkExistingSession(): void {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<{ success: boolean; message?: string }> {
    // Find user
    const user = USERS.find(u => 
      u.email.toLowerCase() === credentials.email.toLowerCase() && 
      u.password === credentials.password
    );

    if (user) {
      // Create user object without password
      const userInfo: User = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId || undefined,
        isPlatformAdmin: user.isPlatformAdmin
      };

      // Store in session
      sessionStorage.setItem('currentUser', JSON.stringify(userInfo));
      sessionStorage.setItem('authToken', 'local-token-' + Date.now());
      sessionStorage.setItem('userRole', user.role);

      // Update state
      this.currentUserSubject.next(userInfo);
      this.isAuthenticatedSubject.next(true);

      return of({ success: true }).pipe(delay(500));
    }

    return of({ 
      success: false, 
      message: 'Invalid email or password' 
    }).pipe(delay(500));
  }

  logout(): void {
    // Clear session
    sessionStorage.clear();
    
    // Update state
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Navigate to login
    this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  isPlatformAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.isPlatformAdmin === true;
  }
}
