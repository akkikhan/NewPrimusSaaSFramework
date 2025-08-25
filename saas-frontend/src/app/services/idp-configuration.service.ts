import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface IdPConfiguration {
  idPType: 'AzureAD' | 'Auth0';
  tenantId: string;
  clientId: string;
  domain: string;
  isConfigured: boolean;
  lastUpdated?: Date;
  validationStatus?: 'Valid' | 'Invalid' | 'NotValidated';
}

export interface OnboardingRequest {
  Name: string;
  AdminEmail: string;
  AdminFirstName?: string;
  AdminLastName?: string;
  Domain?: string;
  CompanySize?: string;
  Industry?: string;
}

export interface OnboardingResponse {
  success: boolean;
  tenantId: string;
  message: string;
  configurationStatus: string;
  integrationGuide: {
    guideId: string;
    title: string;
    totalSections: number;
    estimatedImplementationTime: string;
    directLink: string;
  };
  nextSteps: string[];
}

export interface ValidationResult {
  isValid: boolean;
  validationTime: Date;
  errors: string[];
  warnings: string[];
  metadata?: any;
}

@Injectable({
  providedIn: 'root',
})
export class IdPConfigurationService {
  // Use relative paths so Angular proxy handles routing in dev (avoids CORS)
  private baseV1 = '/api/v2';
  private baseV2 = '/api/v2';

  constructor(private http: HttpClient) {}

  // Onboard a new tenant with IdP configuration
  onboardTenant(request: OnboardingRequest): Observable<OnboardingResponse> {
    // Use the correct Gateway endpoint for tenant onboarding
    return this.http
      .post<OnboardingResponse>(
        `${this.baseV2}/tenants/onboard`,
        request
      )
      .pipe(
        catchError((error) => {
          console.error('Onboarding error:', error);
          return throwError(
            () => new Error(error.error?.message || 'Failed to onboard tenant')
          );
        })
      );
  }

  // Get IdP configuration for a tenant
  getConfiguration(tenantId: string): Observable<IdPConfiguration> {
    return this.http
      .get<IdPConfiguration>(`${this.baseV1}/tenants/${tenantId}/idp`)
      .pipe(
        catchError((error) => {
          if (error.status === 404) {
            return of({
              idPType: 'AzureAD',
              tenantId: '',
              clientId: '',
              domain: '',
              isConfigured: false,
            } as IdPConfiguration);
          }
          return throwError(() => new Error('Failed to fetch configuration'));
        })
      );
  }

  // Create or update IdP configuration
  saveConfiguration(
    tenantId: string,
    config: IdPConfiguration
  ): Observable<any> {
    return this.http
      .post(`${this.baseV1}/tenants/${tenantId}/idp`, config)
      .pipe(
        catchError((error) => {
          console.error('Save configuration error:', error);
          return throwError(
            () =>
              new Error(error.error?.message || 'Failed to save configuration')
          );
        })
      );
  }

  // Validate IdP configuration
  validateConfiguration(tenantId: string): Observable<ValidationResult> {
    return this.http
      .post<ValidationResult>(
        `${this.baseV1}/tenants/${tenantId}/idp/validate`,
        {}
      )
      .pipe(
        catchError((error) => {
          console.error('Validation error:', error);
          return throwError(
            () => new Error('Failed to validate configuration')
          );
        })
      );
  }

  // Get integration guide
  getIntegrationGuide(tenantId: string): Observable<string> {
    return this.http
      .get(`${this.baseV1}/tenants/${tenantId}/idp/guide/html`, {
        responseType: 'text',
      })
      .pipe(
        catchError((error) => {
          console.error('Guide fetch error:', error);
          return throwError(
            () => new Error('Failed to fetch integration guide')
          );
        })
      );
  }

  // Get available IdP providers
  getAvailableProviders(): Observable<any[]> {
    // This could be from an API endpoint in the future
    return of([
      {
        type: 'AzureAD',
        name: 'Azure Active Directory',
        icon: '🔐',
        description:
          'Enterprise-grade authentication with Microsoft Azure AD. Ideal for organizations already using Microsoft 365.',
        status: 'enabled',
        features: [
          'Single Sign-On',
          'Multi-Factor Authentication',
          'Conditional Access',
          'Directory Integration',
        ],
        setupComplexity: 'Medium',
        estimatedSetupTime: '2-4 hours',
      },
      {
        type: 'Auth0',
        name: 'Auth0',
        icon: '🔓',
        description:
          'Flexible authentication platform with support for social logins and custom databases.',
        status: 'enabled',
        features: [
          'Social Login',
          'Custom Databases',
          'Passwordless',
          'Universal Login',
        ],
        setupComplexity: 'Easy',
        estimatedSetupTime: '1-2 hours',
      },
    ]);
  }

  // Check if tenant has IdP configured
  checkIdPStatus(tenantId: string): Observable<boolean> {
    return this.getConfiguration(tenantId).pipe(
      map((config) => config.isConfigured)
    );
  }

  // Get sample configuration for provider
  getSampleConfiguration(provider: 'AzureAD' | 'Auth0'): any {
    if (provider === 'AzureAD') {
      return {
        tenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        clientId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        domain: 'yourdomain.onmicrosoft.com',
      };
    } else {
      return {
        domain: 'your-tenant.auth0.com',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
      };
    }
  }
}
