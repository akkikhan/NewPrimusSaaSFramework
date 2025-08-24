import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RbacService {
  // Use API Gateway v2 for RBAC endpoints
  private apiUrl = `${environment.apiUrl}/api/v2`;

  constructor(private http: HttpClient) {}

  /**
   * Get all roles from Cosmos DB - NO MOCK DATA
   */
  getRoles(tenantId?: string): Observable<any> {
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    return this.http.get<any>(`${this.apiUrl}/roles`, { params }).pipe(
      map((response) => {
        console.log('Roles API response:', response);
        // Ensure we return the expected structure
        if (response.success && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error fetching roles:', error);
        // Return empty array on error, no mock data
        return of([]);
      })
    );
  }

  /**
   * Get a single role by ID
   */
  getRole(roleId: string, tenantId?: string): Observable<any> {
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    return this.http
      .get<any>(`${this.apiUrl}/roles/${roleId}`, { params })
      .pipe(
        map((response) => response.data || response),
        catchError((error) => {
          console.error('Error fetching role:', error);
          return of(null);
        })
      );
  }

  /**
   * Create a new role
   */
  createRole(role: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/roles`, role).pipe(
      map((response) => {
        console.log('Role created:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Error creating role:', error);
        return of({
          success: false,
          error: error.error?.error || error.message,
        });
      })
    );
  }

  /**
   * Update an existing role
   */
  updateRole(roleId: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/roles/${roleId}`, updates).pipe(
      map((response) => {
        console.log('Role updated:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Error updating role:', error);
        return of({
          success: false,
          error: error.error?.error || error.message,
        });
      })
    );
  }

  /**
   * Delete a role
   */
  deleteRole(roleId: string, tenantId?: string): Observable<any> {
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    return this.http
      .delete<any>(`${this.apiUrl}/roles/${roleId}`, { params })
      .pipe(
        map((response) => {
          console.log('Role deleted:', response);
          return response;
        }),
        catchError((error) => {
          console.error('Error deleting role:', error);
          return of({
            success: false,
            error: error.error?.error || error.message,
          });
        })
      );
  }

  /**
   * Get all permissions from Cosmos DB - NO MOCK DATA
   */
  getPermissions(tenantId?: string): Observable<any> {
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    return this.http.get<any>(`${this.apiUrl}/permissions`, { params }).pipe(
      map((response) => {
        console.log('Permissions API response:', response);
        // Ensure we return the expected structure
        if (response.success && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError((error) => {
        console.error('Error fetching permissions:', error);
        // Return empty array on error, no mock data
        return of([]);
      })
    );
  }

  /**
   * Assign role to user
   */
  assignRole(
    userId: string,
    roleId: string,
    tenantId?: string
  ): Observable<any> {
    const payload = {
      userId,
      roleId,
      tenantId: tenantId || 'system',
    };

    return this.http.post<any>(`${this.apiUrl}/roles/assign`, payload).pipe(
      catchError((error) => {
        console.error('Error assigning role:', error);
        return of({
          success: false,
          error: error.error?.error || error.message,
        });
      })
    );
  }

  /**
   * Revoke role from user
   */
  revokeRole(
    userId: string,
    roleId: string,
    tenantId?: string
  ): Observable<any> {
    const payload = {
      userId,
      roleId,
      tenantId: tenantId || 'system',
    };

    return this.http.post<any>(`${this.apiUrl}/roles/revoke`, payload).pipe(
      catchError((error) => {
        console.error('Error revoking role:', error);
        return of({
          success: false,
          error: error.error?.error || error.message,
        });
      })
    );
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string, tenantId?: string): Observable<any> {
    let params = new HttpParams().set('userId', userId);
    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    return this.http.get<any>(`${this.apiUrl}/roles/user`, { params }).pipe(
      map((response) => response.data || response || []),
      catchError((error) => {
        console.error('Error fetching user roles:', error);
        return of([]);
      })
    );
  }

  /**
   * Check user permission
   */
  checkPermission(
    userId: string,
    resource: string,
    action: string,
    tenantId?: string
  ): Observable<boolean> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('resource', resource)
      .set('action', action)
      .set('tenantId', tenantId || 'system');

    return this.http
      .get<any>(`${this.apiUrl}/permissions/check`, { params })
      .pipe(
        map((response) => response.hasPermission || false),
        catchError((error) => {
          console.error('Error checking permission:', error);
          return of(false);
        })
      );
  }
}
