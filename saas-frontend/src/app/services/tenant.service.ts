import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TenantConfig, TenantContextState, TenantAuthConfig } from '../shared/models/tenant-config.interface';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private readonly tenantContextSubject = new BehaviorSubject<TenantContextState>({
    isLoaded: false,
    isAuthenticated: false,
    tenantConfig: null,
    authConfig: null,
    error: null
  });

  private readonly tenantCache = new Map<string, TenantConfig>();

  constructor(private http: HttpClient) {
    if (environment.features?.enableDebugLogs) {
      console.log('🏢 [TenantService] Initialized');
    }
  }

  /**
   * Get the current tenant context state
   */
  getTenantContext(): Observable<TenantContextState> {
    return this.tenantContextSubject.asObservable();
  }

  /**
   * Get the current tenant configuration
   */
  getCurrentTenant(): Observable<TenantConfig | null> {
    return this.tenantContextSubject.pipe(
      map(state => state.tenantConfig)
    );
  }

  /**
   * Load tenant configuration from Configuration API
   */
  async loadTenantConfig(tenantId: string): Promise<TenantConfig> {
    try {
      if (environment.features?.enableDebugLogs) {
        console.log(`🏢 [TenantService] Loading tenant config for: ${tenantId}`);
      }

      // Check cache first
      if (this.tenantCache.has(tenantId)) {
        const cachedConfig = this.tenantCache.get(tenantId)!;
        this.updateTenantContext(cachedConfig);
        return cachedConfig;
      }

      // Fetch from Configuration API
      const tenantConfig = await this.fetchTenantFromApi(tenantId);
      
      // Cache the result
      this.tenantCache.set(tenantId, tenantConfig);
      
      // Update context
      this.updateTenantContext(tenantConfig);
      
      return tenantConfig;
    } catch (error) {
      console.error(`❌ [TenantService] Failed to load tenant ${tenantId}:`, error);
      this.updateTenantContext(null, error as Error);
      throw error;
    }
  }

  /**
   * Fetch tenant configuration from the Configuration API
   */
  private fetchTenantFromApi(tenantId: string): Promise<TenantConfig> {
  const url = `/api/v2/tenants/${tenantId}`;
    
  return this.http.get<any>(url).pipe(
      map(response => {
        // Handle different response formats from the API
        const tenantData = response.data || response;

        // Ensure required fields are present
        if (!tenantData.tenantId) {
          throw new Error(`Invalid tenant configuration for ${tenantId}`);
        }

        // Some backends return flat fields; synthesize minimal azureAd block if missing
        const rawTenantId = (tenantData.azureAd?.tenantId || tenantData.azureAdTenantId || tenantData.azureTenantId || '').toString();
        const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const validAzureTenantId = guidRegex.test(rawTenantId) ? rawTenantId : null;

        const azureAd = tenantData.azureAd || {
          tenantId: validAzureTenantId,
          clientId: tenantData.clientId || environment.msalConfig?.auth?.clientId,
          domain: tenantData.domain || null,
          authority: validAzureTenantId
            ? `https://login.microsoftonline.com/${validAzureTenantId}`
            : 'https://login.microsoftonline.com/organizations'
        };

        // Map to our interface
    const tenantConfig: TenantConfig = {
          tenantId: tenantData.tenantId,
          companyName: tenantData.companyName || tenantData.name || 'Unknown Company',
          domain: tenantData.domain || '',
          status: tenantData.status || 'active',
          azureAd: {
      tenantId: azureAd.tenantId,
      clientId: azureAd.clientId,
      domain: azureAd.domain,
      authority: azureAd.authority
          },
          branding: tenantData.branding || {},
          features: tenantData.features || {},
          settings: tenantData.settings || {},
          createdAt: tenantData.createdAt,
          updatedAt: tenantData.updatedAt
        };

        if (environment.features?.enableDebugLogs) {
          console.log(`✅ [TenantService] Successfully loaded tenant config:`, tenantConfig);
        }

        return tenantConfig;
      }),
      catchError(error => {
        console.error(`❌ [TenantService] API request failed for tenant ${tenantId}:`, error);
        
        // Graceful fallback: if tenant record doesn't exist yet, synthesize minimal config
        if (error.status === 404) {
          if (environment.features?.enableDebugLogs) {
            console.warn(`⚠️ [TenantService] Tenant ${tenantId} not found in API. Using fallback configuration with organizations authority.`);
          }
          const fallback: TenantConfig = {
            tenantId,
            companyName: 'Unknown Company',
            domain: '',
            status: 'active',
            azureAd: {
              tenantId: null as any,
              clientId: environment.msalConfig?.auth?.clientId,
              domain: null as any,
              authority: 'https://login.microsoftonline.com/organizations'
            },
            branding: {},
            features: {},
            settings: {},
            createdAt: undefined as any,
            updatedAt: undefined as any
          };
          return of(fallback);
        } else if (error.status === 0) {
          return throwError(() => new Error('Unable to connect to the Configuration API. Please ensure the service is running.'));
        } else if (error.status >= 500) {
          return throwError(() => new Error('Configuration API is experiencing issues. Please try again later.'));
        } else {
          return throwError(() => new Error(`Failed to load tenant configuration: ${error.message || 'Unknown error'}`));
        }
      })
    ).toPromise() as Promise<TenantConfig>;
  }

  /**
   * Create Azure AD authentication configuration for a tenant
   */
  createTenantAuthConfig(tenantConfig: TenantConfig): TenantAuthConfig {
  const baseRedirect = environment.msalConfig?.auth?.redirectUri || (typeof window !== 'undefined' && (window as any).location ? (window as any).location.origin : '/');
    const postLogout = environment.msalConfig?.auth?.postLogoutRedirectUri || baseRedirect;

    return {
      tenantId: tenantConfig.tenantId,
      clientId: tenantConfig.azureAd.clientId,
      authority: tenantConfig.azureAd.authority!,
      redirectUri: baseRedirect,
      postLogoutRedirectUri: postLogout,
      apiScopes: [] // Add tenant-specific scopes if needed
    };
  }

  /**
   * Check if a tenant exists (lightweight check)
   */
  tenantExists(tenantId: string): Observable<boolean> {
    // Check cache first
    if (this.tenantCache.has(tenantId)) {
      return of(true);
    }

    // Quick validation check
  const url = `/api/v2/tenants/${tenantId}`;
    return this.http.head(url).pipe(
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        // For other errors, assume tenant might exist but service is down
        console.warn(`🔍 [TenantService] Cannot verify tenant existence for ${tenantId}:`, error);
        return of(true);
      })
    );
  }

  /**
   * Set tenant authentication status
   */
  setTenantAuthenticated(tenantId: string, isAuthenticated: boolean): void {
    const currentState = this.tenantContextSubject.value;
    if (currentState.tenantConfig?.tenantId === tenantId) {
      this.tenantContextSubject.next({
        ...currentState,
        isAuthenticated
      });
      
      if (environment.features?.enableDebugLogs) {
        console.log(`🔐 [TenantService] Set tenant ${tenantId} authentication status: ${isAuthenticated}`);
      }
    }
  }

  /**
   * Clear tenant context (logout)
   */
  clearTenantContext(): void {
    this.tenantContextSubject.next({
      isLoaded: false,
      isAuthenticated: false,
      tenantConfig: null,
      authConfig: null,
      error: null
    });
    
    if (environment.features?.enableDebugLogs) {
      console.log('🚪 [TenantService] Cleared tenant context');
    }
  }

  /**
   * Get all tenants for tenant selection (if needed)
   */
  getAvailableTenants(): Observable<TenantConfig[]> {
  const url = `/api/v2/tenants`;
    return this.http.get<any>(url).pipe(
      map(response => {
        const tenantsData = response.data?.items || response.items || response;
        return tenantsData.map((tenant: any) => ({
          tenantId: tenant.tenantId,
          companyName: tenant.companyName || tenant.name,
          domain: tenant.domain,
          status: tenant.status
        } as TenantConfig));
      }),
      catchError(error => {
        console.error('❌ [TenantService] Failed to fetch available tenants:', error);
        return of([]);
      })
    );
  }

  /**
   * Extract tenant ID from current URL
   */
  extractTenantIdFromUrl(): string | null {
    const pathSegments = window.location.pathname.split('/');
    const tenantsIndex = pathSegments.indexOf('tenants');
    
    if (tenantsIndex !== -1 && pathSegments.length > tenantsIndex + 1) {
      return pathSegments[tenantsIndex + 1];
    }
    
    return null;
  }

  /**
   * Update tenant context state
   */
  private updateTenantContext(tenantConfig: TenantConfig | null, error: Error | null = null): void {
    const authConfig = tenantConfig ? this.createTenantAuthConfig(tenantConfig) : null;
    
    this.tenantContextSubject.next({
      isLoaded: true,
      isAuthenticated: false, // Will be updated by auth service
      tenantConfig,
      authConfig,
      error: error?.message || null
    });
    
    if (environment.features?.enableDebugLogs) {
      console.log(`🔄 [TenantService] Updated tenant context:`, {
        tenantId: tenantConfig?.tenantId,
        companyName: tenantConfig?.companyName,
        hasError: !!error
      });
    }
  }

  /**
   * Clear tenant cache (for development/testing)
   */
  clearCache(): void {
    this.tenantCache.clear();
    if (environment.features?.enableDebugLogs) {
      console.log('🗑️ [TenantService] Cleared tenant cache');
    }
  }
}
