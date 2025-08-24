import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username?: string;
  roles: string[];
  tenantId: string;
  isPlatformAdmin: boolean;
  permissions: string[];
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly STORAGE_KEYS = {
    CURRENT_USER: 'auth_current_user',
    ACCESS_TOKEN: 'auth_access_token'
  };

  // Local test users
  private testUsers: UserProfile[] = [
    {
      id: 'platform-admin-user',
      name: 'Platform Admin',
      email: 'admin@saasfactory.com',
      username: 'platform.admin',
      roles: ['PLATFORM_ADMIN'],
      tenantId: 'platform',
      isPlatformAdmin: true,
      permissions: [
        'platform.tenants.create', 'platform.tenants.read', 'platform.tenants.update', 'platform.tenants.delete',
        'platform.roles.manage.system', 'platform.users.manage.all', 'platform.audit.read.all'
      ],
      accessToken: 'mock-platform-admin-token',
      tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    {
      id: 'tenant-admin-user',
      name: 'Tenant Admin',
      email: 'admin@company-a.com',
      username: 'tenant.admin',
      roles: ['TENANT_ADMIN'],
      tenantId: 'default-tenant',
      isPlatformAdmin: false,
      permissions: [
        'tenant.users.create', 'tenant.users.read', 'tenant.users.update', 'tenant.users.delete',
        'tenant.roles.create', 'tenant.roles.read', 'tenant.roles.update', 'tenant.roles.delete',
        'tenant.settings.update', 'tenant.audit.read'
      ],
      accessToken: 'mock-tenant-admin-token',
      tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      id: 'tenant-user-1',
      name: 'John Doe',
      email: 'john.doe@company-a.com',
      username: 'john.doe',
      roles: ['TENANT_USER'],
      tenantId: 'default-tenant',
      isPlatformAdmin: false,
      permissions: [
        'profile.read', 'profile.update', 'dashboard.read', 'reports.read'
      ],
      accessToken: 'mock-tenant-user-token',
      tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Load saved user from localStorage
      const savedUser = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          this.logout();
        }
      }
    }
  }

  /**
   * Login with email and password (local only)
   */
  login(email: string, password: string = 'password'): Observable<UserProfile> {
    // Find user by email
    const user = this.testUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    // In a real app, you'd verify the password here
    // For local development, we'll accept any password
    
    // Save to localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, user.accessToken || '');
    }

    this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      
    return of(user);
  }

  /**
   * Login as specific user type (for testing)
   */
  loginAsUser(userType: 'platform-admin' | 'tenant-admin' | 'tenant-user'): Observable<UserProfile> {
    let user: UserProfile | undefined;
    
    switch (userType) {
      case 'platform-admin':
        user = this.testUsers.find(u => u.id === 'platform-admin-user');
        break;
      case 'tenant-admin':
        user = this.testUsers.find(u => u.id === 'tenant-admin-user');
        break;
      case 'tenant-user':
        user = this.testUsers.find(u => u.id === 'tenant-user-1');
        break;
    }

    if (!user) {
      return throwError(() => new Error('Test user not found'));
    }

    return this.login(user.email);
  }

  /**
   * Logout current user
   */
  logout(): Observable<boolean> {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    }

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    this.router.navigate(['/login']);
    return of(true);
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current tenant ID
   */
  getCurrentTenantId(): string | null {
    const user = this.getCurrentUser();
    return user?.tenantId || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    }
    return null;
  }

  /**
   * Check if current user has role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles.includes(role) || false;
  }

  /**
   * Check if current user has permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Get all test users (for demo purposes)
   */
  getTestUsers(): UserProfile[] {
    return this.testUsers.map(user => ({
      ...user,
      accessToken: undefined, // Don't expose tokens
      refreshToken: undefined
    }));
  }

  /**
   * Switch to different user (for testing)
   */
  switchUser(userId: string): Observable<UserProfile> {
    const user = this.testUsers.find(u => u.id === userId);
    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    return this.login(user.email);
  }

  /**
   * Get user profile information
   */
  getUserProfile(): Observable<UserProfile> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('No authenticated user'));
    }

    return of(user);
  }

  /**
   * Update user profile
   */
  updateUserProfile(updates: Partial<UserProfile>): Observable<UserProfile> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    const updatedUser = { ...currentUser, ...updates };
    
    // Update in test users array
    const userIndex = this.testUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      this.testUsers[userIndex] = updatedUser;
    }

    // Update localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }

    this.currentUserSubject.next(updatedUser);
    return of(updatedUser);
  }

  /**
   * Refresh token (mock implementation)
   */
  refreshToken(): Observable<string> {
    const user = this.getCurrentUser();
    if (!user) {
      return throwError(() => new Error('No authenticated user'));
    }

    // Generate new mock token
    const newToken = `mock-${user.id}-${Date.now()}`;
    const updatedUser = { ...user, accessToken: newToken };

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, newToken);
    }

    this.currentUserSubject.next(updatedUser);
    return of(newToken);
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): Observable<never> {
    console.error('Auth error:', error);
    return throwError(() => error);
  }

  /**
   * Get authentication headers for API calls (returns Observable for compatibility)
   */
  getAuthHeaders(): Observable<HttpHeaders> {
    const token = this.getAccessToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
    return of(headers);
  }

  /**
   * Get access token as Observable (for compatibility)
   */
  getAccessTokenObservable(): Observable<string> {
    const token = this.getAccessToken();
    return of(token || '');
  }

  /**
   * Clear authentication state (for compatibility)
   */
  clearAuthState(): void {
    this.logout().subscribe();
  }

  /**
   * User profile observable (for compatibility)
   */
  get userProfile$(): Observable<UserProfile | null> {
    return this.currentUser$;
  }
} 