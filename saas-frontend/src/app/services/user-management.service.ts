import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces matching backend DTOs
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  roles: string[];
  tenantId: string;
  createdAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface UserDetail extends User {
  profilePicture?: string;
  updatedAt?: Date;
  createdBy?: string;
  permissions: string[];
  preferences?: UserPreferences;
  activeSessions: UserSession[];
  metadata: { [key: string]: any };
}

export interface UserPreferences {
  language: string;
  timeZone: string;
  theme: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  tenantId: string;
  roles: string[];
  status: string;
  requirePasswordChange: boolean;
  sendWelcomeEmail: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles?: string[];
  status?: string;
  preferences?: UserPreferences;
  metadata?: { [key: string]: any };
}

export interface UserFilters {
  page: number;
  size: number;
  search?: string;
  status?: string;
  role?: string;
  tenantId?: string;
  sortBy: string;
  sortOrder: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  location: string;
  deviceType: string;
}

export interface BulkOperationRequest {
  operation: 'delete' | 'activate' | 'deactivate' | 'assign-role';
  userIds: string[];
  parameters?: { [key: string]: any };
}

export interface BulkOperationResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly baseUrl = `${environment.apiUrl}/api/users`;
  private usersSubject = new BehaviorSubject<User[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public users$ = this.usersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of users with filtering
   */
  getUsers(filters: UserFilters): Observable<PaginatedResponse<User>> {
    this.loadingSubject.next(true);
    
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('size', filters.size.toString())
      .set('sortBy', filters.sortBy)
      .set('sortOrder', filters.sortOrder);

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.tenantId) params = params.set('tenantId', filters.tenantId);

    return this.http.get<PaginatedResponse<User>>(this.baseUrl, { params }).pipe(
      tap(response => {
        this.usersSubject.next(response.data);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get user by ID with detailed information
   */
  getUserById(id: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new user
   */
  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.baseUrl, request).pipe(
      tap(newUser => {
        // Update local cache
        const currentUsers = this.usersSubject.value;
        this.usersSubject.next([newUser, ...currentUsers]);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing user
   */
  updateUser(id: string, request: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, request).pipe(
      tap(updatedUser => {
        // Update local cache
        const currentUsers = this.usersSubject.value;
        const index = currentUsers.findIndex(user => user.id === id);
        if (index >= 0) {
          currentUsers[index] = updatedUser;
          this.usersSubject.next([...currentUsers]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a user (soft delete)
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        // Remove from local cache
        const currentUsers = this.usersSubject.value;
        const filteredUsers = currentUsers.filter(user => user.id !== id);
        this.usersSubject.next(filteredUsers);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Assign roles to a user
   */
  assignRoles(userId: string, roles: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${userId}/roles`, { roles }).pipe(
      tap(() => {
        // Update local cache
        const currentUsers = this.usersSubject.value;
        const index = currentUsers.findIndex(user => user.id === userId);
        if (index >= 0) {
          currentUsers[index].roles = roles;
          this.usersSubject.next([...currentUsers]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get user's active sessions
   */
  getUserSessions(userId: string): Observable<UserSession[]> {
    return this.http.get<UserSession[]>(`${this.baseUrl}/${userId}/sessions`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reset user password (admin action)
   */
  resetUserPassword(userId: string, sendEmail: boolean = true): Observable<{ message: string; temporaryPassword?: string; emailSent: boolean }> {
    return this.http.post<{ message: string; temporaryPassword?: string; emailSent: boolean }>(
      `${this.baseUrl}/${userId}/reset-password`, 
      { sendEmail }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update user status (active/inactive)
   */
  updateUserStatus(userId: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${userId}/status`, { status }).pipe(
      tap(() => {
        // Update local cache
        const currentUsers = this.usersSubject.value;
        const index = currentUsers.findIndex(user => user.id === userId);
        if (index >= 0) {
          currentUsers[index].status = status;
          this.usersSubject.next([...currentUsers]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Perform bulk operations on multiple users
   */
  bulkOperations(request: BulkOperationRequest): Observable<BulkOperationResult> {
    return this.http.post<BulkOperationResult>(`${this.baseUrl}/bulk-operations`, request).pipe(
      tap(() => {
        // Refresh the user list after bulk operations
        // You might want to call getUsers() again or handle specific operations
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Search users by name or email
   */
  searchUsers(query: string, limit: number = 10): Observable<User[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('size', limit.toString())
      .set('page', '1');

    return this.http.get<PaginatedResponse<User>>(this.baseUrl, { params }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: string): Observable<User[]> {
    const params = new HttpParams()
      .set('role', role)
      .set('size', '100')
      .set('page', '1');

    return this.http.get<PaginatedResponse<User>>(this.baseUrl, { params }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Validate email availability
   */
  validateEmail(email: string, excludeUserId?: string): Observable<{ available: boolean; message?: string }> {
    let params = new HttpParams().set('email', email);
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }

    return this.http.get<{ available: boolean; message?: string }>(`${this.baseUrl}/validate-email`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Export users to CSV
   */
  exportUsers(filters?: Partial<UserFilters>): Observable<Blob> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.baseUrl}/export`, { 
      params, 
      responseType: 'blob' 
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Import users from CSV
   */
  importUsers(file: File): Observable<{ success: number; failed: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ success: number; failed: number; errors: string[] }>(
      `${this.baseUrl}/import`, 
      formData
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get available roles for assignment
   */
  getAvailableRoles(): Observable<Array<{ name: string; description: string }>> {
    return this.http.get<Array<{ name: string; description: string }>>('/api/roles').pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get user statistics
   */
  getUserStatistics(): Observable<{
    total: number;
    active: number;
    inactive: number;
    byRole: { [role: string]: number };
    recentlyCreated: number;
  }> {
    return this.http.get<{
      total: number;
      active: number;
      inactive: number;
      byRole: { [role: string]: number };
      recentlyCreated: number;
    }>(`${this.baseUrl}/statistics`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.usersSubject.next([]);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('UserManagementService Error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
} 