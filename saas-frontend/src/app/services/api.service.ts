import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import {
  catchError,
  delayWhen,
  map,
  retryWhen,
  take,
  tap,
  timeout,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface IntegrationLink {
  title: string;
  url: string;
  description?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly tenantId$ = new BehaviorSubject<string>(
    environment.tenant?.defaultTenantId || 'default-tenant'
  );
  private readonly currentTenant$ = this.tenantId$.asObservable();
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxRetryDelay: 10000,
  };

  constructor(private http: HttpClient) {
    this.logConfiguration();
    console.log(
      '🌐 [ApiService] Initialized with retry config:',
      this.retryConfig
    );
  }

  private logConfiguration(): void {
    console.log('🚀 SaaS Factory API Service Configuration:', {
      apiUrl: environment.apiUrl,
      enableMockData: environment.features?.enableMockData,
      enableDebugLogs: environment.features?.enableDebugLogs,
      tenant: environment.tenant?.defaultTenantId,
      endpoints: environment.api?.endpoints,
    });
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Version': '1.0',
      'X-Client': 'SaaSFactory-Angular',
    });

    // Note: Authorization headers are now handled by AuthInterceptor
    // Tenant header and correlation ID are also handled by AuthInterceptor

    if (environment.features?.enableDebugLogs) {
      console.log(
        '🔍 API Service Headers (before interceptor):',
        Object.fromEntries(headers.keys().map((key) => [key, headers.get(key)]))
      );
    }

    return headers;
  }

  /**
   * Enhanced retry logic that only retries transient failures
   */
  private shouldRetry(error: HttpErrorResponse, retryCount: number): boolean {
    // Don't retry if we've exceeded max retries
    if (retryCount >= this.retryConfig.maxRetries) {
      console.log(
        `❌ [ApiService] Max retries (${this.retryConfig.maxRetries}) exceeded for ${error.url}`
      );
      return false;
    }

    // Don't retry 4xx errors (client errors)
    if (error.status >= 400 && error.status < 500) {
      console.log(
        `❌ [ApiService] Not retrying 4xx error (${error.status}) for ${error.url}`
      );
      return false;
    }

    // Retry 5xx errors (server errors) and network errors
    if (error.status >= 500 || error.status === 0) {
      console.log(
        `🔄 [ApiService] Will retry 5xx/network error (${error.status}) for ${
          error.url
        }, attempt ${retryCount + 1}/${this.retryConfig.maxRetries}`
      );
      return true;
    }

    // Retry timeout errors
    if (
      error.message?.includes('Timeout') ||
      error.message?.includes('timeout')
    ) {
      console.log(
        `⏰ [ApiService] Will retry timeout error for ${error.url}, attempt ${
          retryCount + 1
        }/${this.retryConfig.maxRetries}`
      );
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(retryCount: number): number {
    const delay =
      this.retryConfig.retryDelay *
      Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    return Math.min(delay, this.retryConfig.maxRetryDelay);
  }

  /**
   * Enhanced retry operator with proper logging
   */
  private retryWithBackoff<T>() {
    return retryWhen((errors: Observable<HttpErrorResponse>) =>
      errors.pipe(
        tap((error: HttpErrorResponse) => {
          console.log(
            `🔄 [ApiService] Retry attempt for ${error.url} (status: ${error.status})`
          );
        }),
        delayWhen((error: HttpErrorResponse) => {
          const shouldRetry = this.shouldRetry(error, 0);
          return shouldRetry
            ? timer(this.getRetryDelay(0))
            : throwError(() => error);
        }),
        take(this.retryConfig.maxRetries + 1)
      )
    ) as any; // Type assertion to fix TypeScript issue
  }

  private handleErrorInternal<T>(operation = 'operation', fallbackData?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      // Let AuthInterceptor handle 401 errors first - don't catch them here
      if (error.status === 401) {
        console.log(
          `🔄 [ApiService] Allowing 401 error to bubble up to AuthInterceptor for ${operation}`
        );
        return throwError(() => error);
      }

      console.error(`${operation} failed:`, error);

      // Log error details for debugging
      if (environment.features?.enableDebugLogs) {
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
        });
      }

      // Enhanced error handling for specific connectivity issues
      if (
        error.message?.includes('Timeout') ||
        error.message?.includes('timeout')
      ) {
        console.error(
          `⏰ [ApiService] Request timeout for ${operation} - Backend services may not be running`
        );
        // Create a more user-friendly timeout error
        const timeoutError = new Error(
          `The ${operation} request timed out. Please ensure all backend services are running and try again.`
        );
        return throwError(() => timeoutError);
      }

      if (error.status === 0 || error.status === 502 || error.status === 503) {
        console.error(
          `🔌 [ApiService] Connection failed for ${operation} - Backend services may not be available`
        );
        const connectionError = new Error(
          `Unable to connect to backend services. Please ensure all services are running.`
        );
        return throwError(() => connectionError);
      }

      // Return fallback data if available
      if (fallbackData !== undefined) {
        console.warn(`Using fallback data for ${operation}`);
        return of(fallbackData);
      }

      // Re-throw the error
      return throwError(() => error);
    };
  }

  private makeRequest<T>(url: string, options: any = {}): Observable<T> {
    // Build final URL with smart prefixing:
    // - If full URL, use as-is
    // - If it starts with '/api/', do NOT prefix (let proxy route /api/v1 and /api/v2)
    // - Else, prefix with environment.apiUrl when provided
    const isFullUrl = url.startsWith('http://') || url.startsWith('https://');
    const fullUrl = isFullUrl
      ? url
      : url.startsWith('/api/')
      ? url
      : environment.apiUrl
      ? `${environment.apiUrl}${url}`
      : url;

    if (environment.features?.enableDebugLogs) {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);
      console.log(`🔍 Original URL: ${url}, Is Full URL: ${isFullUrl}`);
    }

    const method = options.method || 'GET';
    const requestOptions = {
      headers: this.getHeaders(),
      body: options.body,
      responseType: options.responseType || 'json',
    };

    if (method === 'GET') {
      return this.http
        .get<T>(fullUrl, requestOptions)
        .pipe(
          timeout(environment.api?.timeout || 5000),
          this.retryWithBackoff<T>(),
          catchError(this.handleErrorInternal<T>(`GET ${url}`))
        );
    } else if (method === 'POST') {
      return this.http
        .post<T>(fullUrl, options.body, requestOptions)
        .pipe(
          timeout(environment.api?.timeout || 5000),
          this.retryWithBackoff<T>(),
          catchError(this.handleErrorInternal<T>(`POST ${url}`))
        );
    } else if (method === 'PUT') {
      return this.http
        .put<T>(fullUrl, options.body, requestOptions)
        .pipe(
          timeout(environment.api?.timeout || 5000),
          this.retryWithBackoff<T>(),
          catchError(this.handleErrorInternal<T>(`PUT ${url}`))
        );
    } else if (method === 'PATCH') {
      return this.http
        .patch<T>(fullUrl, options.body, requestOptions)
        .pipe(
          timeout(environment.api?.timeout || 5000),
          this.retryWithBackoff<T>(),
          catchError(this.handleErrorInternal<T>(`PATCH ${url}`))
        );
    } else if (method === 'DELETE') {
      return this.http
        .delete<T>(fullUrl, requestOptions)
        .pipe(
          timeout(environment.api?.timeout || 5000),
          this.retryWithBackoff<T>(),
          catchError(this.handleErrorInternal<T>(`DELETE ${url}`))
        );
    } else {
      return throwError(() => new Error(`Unsupported HTTP method: ${method}`));
    }
  }

  // Tenant Management
  setCurrentTenant(tenantId: string): void {
    this.tenantId$.next(tenantId);
    if (environment.features?.enableDebugLogs) {
      console.log('🏢 Tenant switched to:', tenantId);
    }
  }

  getCurrentTenant(): Observable<string> {
    return this.currentTenant$;
  }

  // Health Check
  getApiStatus(): Observable<any> {
    return this.makeRequest('/auth/status').pipe(
      catchError(
        this.handleErrorInternal('getApiStatus', {
          status: 'ERROR',
          message: 'API not available',
          service: 'SaaS Factory API',
          timestamp: new Date().toISOString(),
        })
      )
    );
  }

  getHealthCheck(): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.health}`).pipe(
      catchError(
        this.handleErrorInternal('getHealthCheck', {
          status: 'Unhealthy',
          message: 'Backend not available',
          dependencies: { database: 'Unknown', cache: 'Unknown' },
        })
      )
    );
  }

  // User Management
  getCurrentUser(): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.users}/me`);
  }

  getUsers(
    page: number = 1,
    pageSize: number = 20,
    searchTerm?: string,
    status?: string,
    role?: string
  ): Observable<PagedResult<any>> {
    let params = `?page=${page}&pageSize=${pageSize}`;
    if (searchTerm) {
      params += `&searchTerm=${encodeURIComponent(searchTerm)}`;
    }
    if (status) {
      params += `&status=${encodeURIComponent(status)}`;
    }
    if (role) {
      params += `&role=${encodeURIComponent(role)}`;
    }
    return this.makeRequest<PagedResult<any>>(
      `${environment.api.endpoints.users}${params}`
    );
  }

  getUser(userId: string): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.users}/${userId}`);
  }

  createUser(userData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.users}`, {
      method: 'POST',
      body: userData,
    });
  }

  updateUser(userId: string, userData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.users}/${userId}`, {
      method: 'PUT',
      body: userData,
    });
  }

  deleteUser(userId: string): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.users}/${userId}`, {
      method: 'DELETE',
    });
  }

  enableUser(userId: string, enabled: boolean): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.users}/${userId}/enabled`,
      {
        method: 'PATCH',
        body: { enabled },
      }
    );
  }

  getUserSessions(userId: string): Observable<any[]> {
    return this.makeRequest(
      `${environment.api.endpoints.users}/${userId}/sessions`
    );
  }

  assignRoles(userId: string, roleIds: string[]): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.users}/${userId}/roles`,
      {
        method: 'POST',
        body: { roleIds },
      }
    );
  }

  getUserStatistics(): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.users}/statistics`);
  }

  resetUserPassword(userId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.users}/${userId}/reset-password`,
      {
        method: 'POST',
      }
    );
  }

  sendUserVerification(userId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.users}/${userId}/send-verification`,
      {
        method: 'POST',
      }
    );
  }

  // Settings Management
  getSettings(category?: string): Observable<any[]> {
    let url = environment.api.endpoints.settings;
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    return this.makeRequest<any[]>(url);
  }

  getSetting(key: string): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.settings}/${key}`);
  }

  updateSetting(key: string, data: { value: string }): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.settings}/${key}`, {
      method: 'PUT',
      body: data,
    });
  }

  updateMultipleSettings(settings: {
    [key: string]: string;
  }): Observable<any[]> {
    return this.makeRequest(`${environment.api.endpoints.settings}`, {
      method: 'PUT',
      body: { settings },
    });
  }

  resetSettings(category?: string): Observable<any> {
    let url = `${environment.api.endpoints.settings}/reset`;
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    return this.makeRequest(url, { method: 'POST' });
  }

  getSettingCategories(): Observable<any[]> {
    return this.makeRequest(`${environment.api.endpoints.settings}/categories`);
  }

  initializeSettings(): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.settings}/initialize`,
      {
        method: 'POST',
      }
    );
  }

  validateSetting(key: string, value: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.settings}/validate/${key}`,
      {
        method: 'POST',
        body: { value },
      }
    );
  }

  // Tenant Management
  getTenants(
    page: number = 1,
    pageSize: number = 20,
    searchTerm?: string,
    status?: string
  ): Observable<any> {
    // Always use direct HTTP to get raw array response from backend
    // The SDK wraps the response which causes issues with the component
    let params = `?page=${page}&pageSize=${pageSize}`;
    if (searchTerm) params += `&search=${encodeURIComponent(searchTerm)}`;
    if (status) params += `&status=${encodeURIComponent(status)}`;

    // Use full URL to ensure proper routing
    const fullUrl = `http://localhost:8080/api/v2/tenants${params}`;

    console.log('🔗 [ApiService] Fetching tenants from:', fullUrl);

    // Use direct HTTP client to bypass any interceptors that might be causing issues
    return this.http.get<any>(fullUrl).pipe(
      tap((response: any) => {
        console.log('📦 [ApiService] Raw tenant response:', {
          type: typeof response,
          isArray: Array.isArray(response),
          length: Array.isArray(response) ? response.length : 'N/A',
          sample:
            Array.isArray(response) && response.length > 0
              ? response[0]
              : response,
        });
      }),
      catchError((error) => {
        console.error('❌ [ApiService] Error fetching tenants:', error);
        return throwError(() => error);
      })
    );
  }

  getTenantsList(): Observable<any> {
    // Get all tenants as a simple list (for backward compatibility)
    const url = `${environment.api.endpoints.tenants}`;
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  getTenantStatistics(): Observable<any> {
    // Get tenant statistics from Azure CosmosDB
    const url = `${environment.api.endpoints.tenants}/statistics`;
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  getTenant(tenantId: string): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.tenants}/${tenantId}`);
  }

  createTenant(tenantData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.tenants}`, {
      method: 'POST',
      body: tenantData,
    });
  }

  updateTenant(tenantId: string, tenantData: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.tenants}/${tenantId}`,
      { method: 'PUT', body: tenantData }
    );
  }

  deleteTenant(tenantId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.tenants}/${tenantId}`,
      { method: 'DELETE' }
    );
  }

  duplicateTenant(tenantId: string): Observable<any> {
    // For now, simulate duplication - in real implementation this would call a backend endpoint
    return new Observable<any>((subscriber) => {
      setTimeout(() => {
        const duplicatedTenant = {
          id: `${tenantId}-copy-${Date.now()}`,
          tenantId: `${tenantId}-copy-${Date.now()}`,
          name: `Copy of ${tenantId}`,
          companyName: `Copy of ${tenantId}`,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        subscriber.next(duplicatedTenant);
        subscriber.complete();
      }, 1000);
    });
  }

  getTenantStats(tenantId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.tenants}/${tenantId}/stats`
    );
  }

  // Role Management
  getRoles(): Observable<any[]> {
    return this.makeRequest(`${environment.api.endpoints.rbac}`);
  }

  getRole(roleId: string): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.rbac}/${roleId}`);
  }

  createRole(roleData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.rbac}`, {
      method: 'POST',
      body: roleData,
    });
  }

  updateRole(roleId: string, roleData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.rbac}/${roleId}`, {
      method: 'PUT',
      body: roleData,
    });
  }

  deleteRole(roleId: string): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.rbac}/${roleId}`, {
      method: 'DELETE',
    });
  }

  getPermissions(): Observable<any[]> {
    return this.makeRequest(`${environment.api.endpoints.rbac}/permissions`);
  }

  checkPermission(permission: string): Observable<boolean> {
    return this.makeRequest(
      `${environment.api.endpoints.rbac}/permissions/check`,
      {
        method: 'POST',
        body: { permission },
      }
    ).pipe(
      map((response: any) => response.hasPermission || false),
      catchError(() => of(false))
    );
  }

  // Notifications
  getNotifications(
    page: number = 1,
    pageSize: number = 20,
    type?: string,
    status?: string,
    unreadOnly?: boolean
  ): Observable<PagedResult<any>> {
    let params = `?page=${page}&pageSize=${pageSize}`;
    if (type) params += `&type=${encodeURIComponent(type)}`;
    if (status) params += `&status=${encodeURIComponent(status)}`;
    if (unreadOnly !== undefined) params += `&unreadOnly=${unreadOnly}`;

    return this.makeRequest<PagedResult<any>>(
      `${environment.api.endpoints.notifications}${params}`
    ).pipe(
      catchError(
        this.handleErrorInternal<PagedResult<any>>('getNotifications', {
          items: [],
          totalItems: 0,
          totalPages: 0,
          page: 1,
          pageSize: pageSize,
        })
      )
    );
  }

  sendNotification(notification: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.notifications}/send`, {
      method: 'POST',
      body: notification,
    }).pipe(catchError(this.handleErrorInternal('sendNotification')));
  }

  markNotificationRead(notificationId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.notifications}/${notificationId}/read`,
      {
        method: 'PATCH',
      }
    ).pipe(catchError(this.handleErrorInternal('markNotificationRead')));
  }

  getNotificationTemplates(type?: string, status?: string): Observable<any[]> {
    let params = '';
    if (type || status) {
      params = '?';
      if (type) params += `type=${encodeURIComponent(type)}`;
      if (status)
        params += (type ? '&' : '') + `status=${encodeURIComponent(status)}`;
    }

    return this.makeRequest<any[]>(
      `${environment.api.endpoints.notifications}/templates${params}`
    ).pipe(
      catchError(
        this.handleErrorInternal<any[]>('getNotificationTemplates', [])
      )
    );
  }

  createNotificationTemplate(template: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.notifications}/templates`,
      {
        method: 'POST',
        body: template,
      }
    ).pipe(catchError(this.handleErrorInternal('createNotificationTemplate')));
  }

  updateNotificationTemplate(
    templateId: string,
    template: any
  ): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.notifications}/templates/${templateId}`,
      {
        method: 'PUT',
        body: template,
      }
    ).pipe(catchError(this.handleErrorInternal('updateNotificationTemplate')));
  }

  deleteNotificationTemplate(templateId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.notifications}/templates/${templateId}`,
      {
        method: 'DELETE',
      }
    ).pipe(catchError(this.handleErrorInternal('deleteNotificationTemplate')));
  }

  testNotificationTemplate(templateId: string, testData: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.notifications}/templates/${templateId}/test`,
      {
        method: 'POST',
        body: testData,
      }
    ).pipe(catchError(this.handleErrorInternal('testNotificationTemplate')));
  }

  getNotificationStats(): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.notifications}/stats`
    ).pipe(
      catchError(
        this.handleErrorInternal('getNotificationStats', {
          totalSent: 0,
          sentToday: 0,
          sentThisWeek: 0,
          sentThisMonth: 0,
          unreadCount: 0,
          typeBreakdown: {},
          statusBreakdown: {},
          priorityBreakdown: {},
          deliveryRate: 0,
          readRate: 0,
          generatedAt: new Date().toISOString(),
        })
      )
    );
  }

  // System Logs
  getSystemLogs(
    page: number = 1,
    pageSize: number = 50,
    level?: string,
    source?: string,
    timeRange?: string
  ): Observable<any> {
    let params = `?page=${page}&pageSize=${pageSize}`;
    if (level) params += `&level=${encodeURIComponent(level)}`;
    if (source) params += `&source=${encodeURIComponent(source)}`;
    if (timeRange) params += `&timeRange=${encodeURIComponent(timeRange)}`;

    return this.makeRequest(`/api/v2/logs/system${params}`).pipe(
      catchError(
        this.handleErrorInternal('getSystemLogs', {
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          page: 1,
          pageSize: pageSize,
        })
      )
    );
  }

  getErrorLogs(level?: string, timeRange?: string): Observable<any[]> {
    let params = '';
    if (level || timeRange) {
      params = '?';
      if (level) params += `level=${encodeURIComponent(level)}`;
      if (timeRange)
        params +=
          (level ? '&' : '') + `timeRange=${encodeURIComponent(timeRange)}`;
    }

    return this.makeRequest<any[]>(`/api/v2/logs/errors${params}`).pipe(
      catchError(this.handleErrorInternal<any[]>('getErrorLogs', []))
    );
  }

  getPerformanceLogs(timeRange?: string): Observable<any> {
    let params = timeRange ? `?timeRange=${encodeURIComponent(timeRange)}` : '';

    return this.makeRequest(`/api/v2/logs/performance${params}`).pipe(
      catchError(
        this.handleErrorInternal('getPerformanceLogs', {
          requests: [],
          metrics: {},
          stats: {},
        })
      )
    );
  }

  getLogStats(): Observable<any> {
    return this.makeRequest('/api/v2/logs/stats').pipe(
      catchError(
        this.handleErrorInternal('getLogStats', {
          totalLogs: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        })
      )
    );
  }

  // Analytics
  getDashboardMetrics(period: string = 'month'): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.analytics}/dashboard?period=${period}`
    );
  }

  getUserAnalytics(period: string = 'month'): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.analytics}/users?period=${period}`
    );
  }

  getTenantAnalytics(period: string = 'month'): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.analytics}/tenants?period=${period}`
    );
  }

  // Enhanced Audit Logs with comprehensive filtering and analytics
  getAuditLogs(filters: any = {}): Observable<any> {
    const {
      page = 1,
      pageSize = 20,
      action,
      userId,
      entityType,
      severity,
      result,
      startDate,
      endDate,
      searchTerm,
    } = filters;

    let url = `${environment.api.endpoints.audit}/logs?page=${page}&pageSize=${pageSize}`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (entityType) url += `&entityType=${encodeURIComponent(entityType)}`;
    if (severity) url += `&severity=${severity}`;
    if (result) url += `&result=${result}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;

    return this.makeRequest<any>(url).pipe(
      catchError(
        this.handleErrorInternal('getAuditLogs', {
          items: [],
          totalItems: 0,
          page: 1,
          pageSize: pageSize,
        })
      )
    );
  }

  getAuditSummary(startDate?: string, endDate?: string): Observable<any> {
    let url = `${environment.api.endpoints.audit}/summary`;
    const params = [];
    if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.makeRequest<any>(url).pipe(
      catchError(
        this.handleErrorInternal('getAuditSummary', {
          totalEvents: 0,
          eventsToday: 0,
          eventsThisWeek: 0,
          eventsThisMonth: 0,
          criticalEvents: 0,
          errorEvents: 0,
          failedEvents: 0,
          uniqueUsers: 0,
          uniqueActions: 0,
          averageRiskScore: 0,
          topActions: {},
          topUsers: {},
          severityBreakdown: {},
          resultBreakdown: {},
          generatedAt: new Date().toISOString(),
        })
      )
    );
  }

  getAuditLogById(id: string): Observable<any> {
    return this.makeRequest<any>(
      `${environment.api.endpoints.audit}/logs/${id}`
    ).pipe(catchError(this.handleErrorInternal('getAuditLogById', null)));
  }

  searchAuditLogs(
    searchTerm: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<any> {
    const url = `${
      environment.api.endpoints.audit
    }/search?searchTerm=${encodeURIComponent(
      searchTerm
    )}&page=${page}&pageSize=${pageSize}`;
    return this.makeRequest<any>(url).pipe(
      catchError(
        this.handleErrorInternal('searchAuditLogs', {
          items: [],
          totalItems: 0,
          page: 1,
          pageSize: pageSize,
        })
      )
    );
  }

  getHighRiskEvents(minRiskScore: number = 70): Observable<any[]> {
    const url = `${environment.api.endpoints.audit}/high-risk?minRiskScore=${minRiskScore}`;
    return this.makeRequest<any[]>(url).pipe(
      catchError(this.handleErrorInternal('getHighRiskEvents', []))
    );
  }

  getRealTimeAuditLogs(count: number = 50): Observable<any[]> {
    const url = `${environment.api.endpoints.audit}/realtime?count=${count}`;
    return this.makeRequest<any[]>(url).pipe(
      catchError(this.handleErrorInternal('getRealTimeAuditLogs', []))
    );
  }

  getAuditStatistics(): Observable<any> {
    const url = `${environment.api.endpoints.audit}/statistics`;
    return this.makeRequest<any>(url).pipe(
      catchError(
        this.handleErrorInternal('getAuditStatistics', {
          totalLogs: 0,
          logsToday: 0,
          logsThisWeek: 0,
          logsThisMonth: 0,
          actionBreakdown: {},
          levelBreakdown: {},
          topUsers: {},
          generatedAt: new Date().toISOString(),
        })
      )
    );
  }

  logAuditEvent(auditEvent: any): Observable<any> {
    return this.makeRequest<any>(`${environment.api.endpoints.audit}/log`, {
      method: 'POST',
      body: auditEvent,
    }).pipe(catchError(this.handleErrorInternal('logAuditEvent', null)));
  }

  exportAuditLogs(format: string = 'csv', filters: any = {}): Observable<Blob> {
    let url = `${environment.api.endpoints.audit}/export?format=${format}`;

    // Add filter parameters to export
    const {
      action,
      userId,
      entityType,
      severity,
      result,
      startDate,
      endDate,
      searchTerm,
    } = filters;

    if (action) url += `&action=${encodeURIComponent(action)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (entityType) url += `&entityType=${encodeURIComponent(entityType)}`;
    if (severity) url += `&severity=${severity}`;
    if (result) url += `&result=${result}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    if (searchTerm) url += `&searchTerm=${encodeURIComponent(searchTerm)}`;

    return this.makeRequest(url, {
      responseType: 'blob',
    }) as Observable<Blob>;
  }

  // Settings
  // getSettings(category?: string): Observable<any[]> {
  //   const url = category ? `${environment.api.endpoints.settings}?category=${encodeURIComponent(category)}` : `${environment.api.endpoints.settings}`;
  //   return this.makeRequest(url);
  // }

  // getSetting(key: string): Observable<any> {
  //   return this.makeRequest(`${environment.api.endpoints.settings}/${key}`);
  // }

  // updateSetting(key: string, value: any): Observable<any> {
  //   return this.makeRequest(`${environment.api.endpoints.settings}/${key}`, {
  //     method: 'PUT',
  //     body: { value }
  //   });
  // }

  // Copilot/AI Assistant
  sendCopilotMessage(message: string, context?: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.copilot}/chat`, {
      method: 'POST',
      body: { message, context },
    });
  }

  getCopilotSuggestions(context: any): Observable<any[]> {
    return this.makeRequest(
      `${environment.api.endpoints.copilot}/suggestions`,
      {
        method: 'POST',
        body: { context },
      }
    );
  }

  // Error handling utility
  handleError(error: any): string {
    console.error('🚨 API Error Details:', error);

    // Try to extract detailed error message from different possible error structures
    let errorMessage = '';

    // Check for detailed error in response body
    if (error?.error) {
      const errorBody = error.error;

      // Check for specific error message
      if (errorBody.error && typeof errorBody.error === 'string') {
        errorMessage = errorBody.error;
      } else if (errorBody.message && typeof errorBody.message === 'string') {
        errorMessage = errorBody.message;
      } else if (errorBody.title && typeof errorBody.title === 'string') {
        errorMessage = errorBody.title;
      } else if (errorBody.errors && Array.isArray(errorBody.errors)) {
        // Handle validation errors array
        errorMessage = errorBody.errors.join(', ');
      } else if (errorBody.errors && typeof errorBody.errors === 'object') {
        // Handle validation errors object (e.g., { "field": ["error1", "error2"] })
        const errorMessages = Object.values(errorBody.errors).flat();
        errorMessage = errorMessages.join(', ');
      }
    }

    // Fallback to direct message
    if (!errorMessage && error?.message) {
      errorMessage = error.message;
    }

    // Handle specific HTTP status codes
    if (!errorMessage && error?.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Bad request. Please check your input data.';
          break;
        case 401:
          errorMessage = 'Authentication required. Please log in.';
          break;
        case 403:
          errorMessage =
            'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Resource not found.';
          break;
        case 409:
          errorMessage =
            'Conflict. The resource already exists or there is a data conflict.';
          break;
        case 422:
          errorMessage = 'Validation failed. Please check your input data.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait before trying again.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        case 502:
          errorMessage = 'Bad gateway. The service is temporarily unavailable.';
          break;
        case 503:
          errorMessage = 'Service unavailable. Please try again later.';
          break;
        case 504:
          errorMessage =
            'Gateway timeout. The request took too long to process.';
          break;
        default:
          errorMessage = `Request failed with status ${error.status}`;
      }
    }

    // Final fallback
    if (!errorMessage) {
      errorMessage = 'An unexpected error occurred. Please try again.';
    }

    console.error('🔍 Extracted error message:', errorMessage);
    return errorMessage;
  }

  // Configuration helpers
  isProductionMode(): boolean {
    return environment.production;
  }

  getApiEndpoint(service: string): string {
    return (environment.api?.endpoints as any)?.[service] || environment.apiUrl;
  }

  getFeatureFlag(feature: string): boolean {
    return (environment.features as any)?.[feature] || false;
  }

  // Tenant Onboarding
  onboardTenant(tenantData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.tenants}/onboard`, {
      method: 'POST',
      body: tenantData,
    });
  }

  // Module Management - NEW for Gateway Integration
  getTenantModules(tenantId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.modules}/${tenantId}/modules`
    );
  }

  updateTenantModules(tenantId: string, modules: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.modules}/${tenantId}/modules`,
      {
        method: 'PATCH',
        body: { modules },
      }
    );
  }

  checkModuleEnabled(tenantId: string, moduleId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.modules}/${tenantId}/modules/${moduleId}/is-enabled`
    );
  }

  getAvailableModules(): Observable<any[]> {
    console.log('ApiService: Making request to get available modules');
    return this.makeRequest<{success: boolean, data: any[]}>(
      `${environment.api.endpoints.tenants}/modules/catalog`
    ).pipe(
      map(response => {
        console.log('ApiService: Raw API response:', response);
        const modules = response.data || [];
        console.log('ApiService: Extracted modules:', modules);
        return modules;
      }),
      catchError(
        this.handleErrorInternal<any[]>('getAvailableModules', [
          {
            id: 'auth',
            name: 'Authentication',
            description: 'User authentication and authorization',
          },
          {
            id: 'rbac',
            name: 'Role-Based Access Control',
            description: 'Role and permission management',
          },
          {
            id: 'analytics',
            name: 'Analytics',
            description: 'Usage analytics and reporting',
          },
          {
            id: 'audit',
            name: 'Audit Logs',
            description: 'Security and compliance auditing',
          },
          {
            id: 'notifications',
            name: 'Notifications',
            description: 'Email and push notifications',
          },
          {
            id: 'copilot',
            name: 'AI Copilot',
            description: 'AI-powered assistance and automation',
          },
        ])
      )
    );
  }

  // Module Integration Links (Success screen)
  getModuleIntegrationLinks(
    tenantId: string,
    moduleId: string
  ): Observable<IntegrationLink[]> {
    // Use relative /api/v2 path for integration links (backward-compat)
    const url = `/api/v2/modules/${moduleId}/tenants/${tenantId}/integration-links`;
    return this.http
      .get<IntegrationLink[]>(url)
      .pipe(
        catchError(
          this.handleErrorInternal<IntegrationLink[]>(
            `getModuleIntegrationLinks(${moduleId})`,
            []
          )
        )
      );
  }

  // Gateway Status and Configuration - NEW
  getGatewayStatus(): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.gateway}/status`).pipe(
      catchError(
        this.handleErrorInternal('getGatewayStatus', {
          status: 'Unknown',
          message: 'Gateway status unavailable',
          uptime: '0s',
          version: 'unknown',
        })
      )
    );
  }

  getGatewayHealth(): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.gateway}/health`).pipe(
      catchError(
        this.handleErrorInternal('getGatewayHealth', {
          status: 'Unhealthy',
          checks: {},
          totalDuration: '0ms',
        })
      )
    );
  }

  getModuleGuardConfig(): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.gateway}/module-guard/config`
    ).pipe(
      catchError(
        this.handleErrorInternal('getModuleGuardConfig', {
          timeoutSeconds: 3,
          enabledTtlSeconds: 30,
          disabledTtlSeconds: 10,
          backoffSeconds: 5,
          failOpenOnError: true,
        })
      )
    );
  }

  getModuleGuardStats(): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.gateway}/module-guard/stats`
    ).pipe(
      catchError(
        this.handleErrorInternal('getModuleGuardStats', {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          failures: 0,
          avgResponseTime: 0,
          cacheHitRate: 0,
        })
      )
    );
  }

  // Orchestrator Workflows - NEW
  getWorkflows(
    page: number = 1,
    pageSize: number = 20,
    status?: string
  ): Observable<any> {
    let params = `?page=${page}&pageSize=${pageSize}`;
    if (status) params += `&status=${encodeURIComponent(status)}`;

    return this.makeRequest(
      `${environment.api.endpoints.orchestrator}/workflows${params}`
    ).pipe(
      catchError(
        this.handleErrorInternal('getWorkflows', {
          items: [],
          totalItems: 0,
          page: 1,
          pageSize: pageSize,
        })
      )
    );
  }

  getWorkflow(workflowId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.orchestrator}/workflows/${workflowId}`
    ).pipe(catchError(this.handleErrorInternal('getWorkflow', null)));
  }

  createWorkflow(workflowData: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.orchestrator}/workflows`,
      {
        method: 'POST',
        body: workflowData,
      }
    );
  }

  getWorkflowTypes(): Observable<any[]> {
    return this.makeRequest<any[]>(
      `${environment.api.endpoints.orchestrator}/workflow-types`
    ).pipe(
      catchError(
        this.handleErrorInternal<any[]>('getWorkflowTypes', [
          {
            id: 'tenant-onboarding',
            name: 'Tenant Onboarding',
            description: 'Complete tenant setup process',
          },
          {
            id: 'user-provisioning',
            name: 'User Provisioning',
            description: 'Create and configure user accounts',
          },
          {
            id: 'data-migration',
            name: 'Data Migration',
            description: 'Migrate tenant data between systems',
          },
          {
            id: 'compliance-check',
            name: 'Compliance Check',
            description: 'Validate tenant compliance status',
          },
        ])
      )
    );
  }

  // Send Welcome Email (can be called independently if onboarding fails)
  sendWelcomeEmail(emailData: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.tenants}/send-welcome-email`,
      {
        method: 'POST',
        body: emailData,
      }
    );
  }

  // Tenant Login (for onboarded tenants) - uses auth endpoint
  tenantLogin(loginData: any): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.auth}/tenant/login`, {
      method: 'POST',
      body: loginData,
    });
  }

  // Get tenant authentication configuration (read-only summary for portal)
  getTenantAuthConfig(tenantId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.auth}/tenant/${encodeURIComponent(
        tenantId
      )}/config`
    );
  }

  // Validate a JWT with the backend (issuer/audience/signature)
  validateToken(payload: {
    token: string;
    tenantId?: string;
  }): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.auth}/validate`, {
      method: 'POST',
      body: payload,
    });
  }

  // Change tenant password - uses auth endpoint
  changePassword(passwordData: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.auth}/tenant/change-password`,
      {
        method: 'POST',
        body: passwordData,
      }
    );
  }

  // Get tenant login URL - uses auth endpoint
  getTenantLoginUrl(tenantId: string, email?: string): Observable<any> {
    let url = `${environment.api.endpoints.auth}/tenant/login-url`;
    if (email) {
      url += `?email=${encodeURIComponent(email)}`;
    }
    return this.makeRequest(url);
  }

  // OAuth Providers API methods
  getAvailableOAuthProviders(): Observable<any> {
    return this.makeRequest(`${environment.api.endpoints.auth}/providers`);
  }

  getConfiguredOAuthProviders(tenantId?: string): Observable<any> {
    let url = `${environment.api.endpoints.auth}/oauth-providers`;
    if (tenantId) {
      url += `?tenantId=${encodeURIComponent(tenantId)}`;
    }
    return this.makeRequest(url);
  }

  configureOAuthProvider(providerConfig: any): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.auth}/oauth-providers`,
      {
        method: 'POST',
        body: providerConfig,
      }
    );
  }

  testOAuthProvider(providerId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.auth}/oauth-providers/${providerId}/test`
    );
  }

  removeOAuthProvider(providerId: string): Observable<any> {
    return this.makeRequest(
      `${environment.api.endpoints.auth}/oauth-providers/${providerId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // AI Copilot API methods
  askCopilot(request: CopilotRequest): Observable<CopilotResponse> {
    return this.makeRequest<CopilotResponse>(
      `${environment.api.endpoints.copilot}/ask`,
      {
        method: 'POST',
        body: request,
      }
    ).pipe(
      catchError(
        this.handleErrorInternal('askCopilot', {
          id: '',
          message:
            'I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
          conversationId: request.conversationId || '',
          confidence: 0,
          toolExecutions: [],
        })
      )
    );
  }

  getCopilotMemory(
    conversationId?: string,
    limit: number = 10
  ): Observable<ConversationMemory[]> {
    let url = `${environment.api.endpoints.copilot}/memory?limit=${limit}`;
    if (conversationId) {
      url += `&conversationId=${encodeURIComponent(conversationId)}`;
    }

    return this.makeRequest<ConversationMemory[]>(url).pipe(
      catchError(this.handleErrorInternal('getCopilotMemory', []))
    );
  }

  // Simple HTTP method wrappers for compatibility
  get<T = any>(url: string): Observable<T> {
    return this.makeRequest<T>(url, { method: 'GET' });
  }

  post<T = any>(url: string, body: any): Observable<T> {
    return this.makeRequest<T>(url, { method: 'POST', body });
  }

  put<T = any>(url: string, body: any): Observable<T> {
    return this.makeRequest<T>(url, { method: 'PUT', body });
  }

  patch<T = any>(url: string, body: any): Observable<T> {
    return this.makeRequest<T>(url, { method: 'PATCH', body });
  }

  delete<T = any>(url: string): Observable<T> {
    return this.makeRequest<T>(url, { method: 'DELETE' });
  }

  // ===== SYSTEM MONITORING & LOGGING METHODS =====

  /**
   * Get system health status for all services
   */
  getSystemHealth(): Observable<any> {
    return this.makeRequest<any>(`/api/v2/monitoring/health`).pipe(
      catchError(this.handleErrorInternal('getSystemHealth', {
        status: 'unknown',
        timestamp: new Date().toISOString(),
        services: {},
        systemInfo: {}
      }))
    );
  }

  /**
   * Get real-time system metrics
   */
  getSystemMetrics(): Observable<any> {
    return this.makeRequest<any>(`/api/v2/monitoring/metrics`).pipe(
      catchError(this.handleErrorInternal('getSystemMetrics', {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
        timestamp: new Date().toISOString()
      }))
    );
  }

  /**
   * Get status of all SaaS Framework services
   */
  getServicesStatus(): Observable<any> {
    return this.makeRequest<any>(`/api/v2/monitoring/services/status`).pipe(
      catchError(this.handleErrorInternal('getServicesStatus', {
        gateway: { status: 'unknown', uptime: '0s', version: 'unknown' },
        authentication: { status: 'unknown', uptime: '0s', version: 'unknown' },
        rbac: { status: 'unknown', uptime: '0s', version: 'unknown' },
        notifications: { status: 'unknown', uptime: '0s', version: 'unknown' }
      }))
    );
  }

  /**
   * Get performance analytics over time
   */
  getPerformanceMetrics(timeRange: string = '24h'): Observable<any> {
    return this.makeRequest<any>(`/api/v2/monitoring/performance?timeRange=${timeRange}`).pipe(
      catchError(this.handleErrorInternal('getPerformanceMetrics', {
        cpu: [],
        memory: [],
        responseTime: [],
        throughput: [],
        errorRate: []
      }))
    );
  }

  /**
   * Export logs to CSV or JSON format
   */
  exportLogs(
    format: 'csv' | 'json' = 'csv',
    logType: 'system' | 'audit' = 'system',
    filters?: any
  ): Observable<Blob> {
    let url = `/api/v2/monitoring/export-logs?format=${format}&type=${logType}`;
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          url += `&${key}=${encodeURIComponent(filters[key])}`;
        }
      });
    }

    return this.http.get(url, { 
      responseType: 'blob',
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleErrorInternal('exportLogs', new Blob()))
    );
  }
}

// Copilot-related interfaces
interface CopilotRequest {
  prompt: string;
  conversationId?: string;
  context?: Record<string, any>;
}

interface CopilotResponse {
  id: string;
  message: string;
  reasoning?: string;
  toolExecutions: ToolExecution[];
  timestamp: string;
  conversationId: string;
  confidence: number;
}

interface ToolExecution {
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  success: boolean;
  errorMessage?: string;
}

interface ConversationMemory {
  id: string;
  userId: string;
  tenantId: string;
  conversationId: string;
  message: string;
  response: string;
  timestamp: string;
}
