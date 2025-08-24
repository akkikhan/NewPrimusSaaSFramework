import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { MockTenantService } from './mock-tenant.service';
import { MockEmailService } from './mock-email.service';
import { ApiService } from './api.service';
import { TenantAdminService } from '../core/services/tenant-admin.service';

export interface DemoConfig {
  useMockServices: boolean;
  showDemoIndicator: boolean;
  enableEmailSimulation: boolean;
  enableConsentFlow: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DemoService {
  private readonly DEMO_CONFIG_KEY = 'saasfactory_demo_config';
  
  private defaultConfig: DemoConfig = {
    useMockServices: false, // Always use real services by default
    showDemoIndicator: false,
    enableEmailSimulation: false, // Disable mock email simulation
    enableConsentFlow: false // Disable mock consent flow
  };

  constructor(
    private mockTenantService: MockTenantService,
    private mockEmailService: MockEmailService,
    private apiService: ApiService,
    private tenantAdminService: TenantAdminService
  ) {
    console.log('🎯 DemoService initialized for realistic tenant onboarding demo');
    this.initializeDemoConfig();
  }

  private initializeDemoConfig(): void {
    const stored = localStorage.getItem(this.DEMO_CONFIG_KEY);
    if (!stored) {
      // Honor environment flag if provided
      const useMock = (window as any)?.environment?.features?.enableMockData ?? false;
      const initial = { ...this.defaultConfig, useMockServices: useMock };
      localStorage.setItem(this.DEMO_CONFIG_KEY, JSON.stringify(initial));
    }
  }

  getDemoConfig(): DemoConfig {
    try {
      const config = JSON.parse(localStorage.getItem(this.DEMO_CONFIG_KEY) || '{}');
      return { ...this.defaultConfig, ...config };
    } catch (error) {
      return this.defaultConfig;
    }
  }

  updateDemoConfig(config: Partial<DemoConfig>): void {
    const currentConfig = this.getDemoConfig();
    const newConfig = { ...currentConfig, ...config };
    localStorage.setItem(this.DEMO_CONFIG_KEY, JSON.stringify(newConfig));
  }

  // Intelligently route to mock or real service based on config
  onboardTenant(tenantData: any): Observable<any> {
    const config = this.getDemoConfig();
    
    let onboardingObservable: Observable<any>;
    
    if (config.useMockServices) {
      console.log('🎯 Using mock services for realistic demo experience');
      onboardingObservable = this.mockTenantService.onboardTenant(tenantData);
    } else {
      console.log('🌐 Using real API services');
      onboardingObservable = this.apiService.onboardTenant(tenantData);
    }
    
    // Intercept the response to store tenant admin credentials and send email
    return onboardingObservable.pipe(
      tap(result => {
        if (result?.adminUser && result.adminUser.TempPassword) {
          // Store the tenant admin credentials
          this.tenantAdminService.addTenantAdmin({
            id: result.adminUser.Id || `admin-${result.tenant.id}`,
            email: result.adminUser.Email,
            tempPassword: result.adminUser.TempPassword,
            tenantId: result.tenant.id,
            tenantName: result.tenant.name,
            role: 'TenantAdmin',
            mustChangePassword: true,
            createdAt: new Date()
          });
          
          console.log('✅ Tenant admin credentials stored for:', {
            email: result.adminUser.Email,
            tenantId: result.tenant.id,
            loginUrl: `${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/login/tenant/${result.tenant.id}`
          });
          
          // Send welcome email with complete tenant information
          const emailData = {
            tenantId: result.tenant.id,
            id: result.tenant.id, // Include both for compatibility
            name: result.tenant.name,
            companyName: result.tenant.name,
            adminEmail: result.adminUser.Email,
            apiKey: result.credentials.apiKey,
            tempPassword: result.adminUser.TempPassword,
            authType: result.tenant.authType,
            domain: result.tenant.domain
          };
          
          console.log('📧 Sending welcome email with complete tenant data');
          this.sendWelcomeEmail(emailData).subscribe(
            emailResult => console.log('✅ Welcome email sent successfully'),
            error => console.error('❌ Failed to send welcome email:', error)
          );
        }
      })
    );
  }

  sendWelcomeEmail(emailData: any): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices && config.enableEmailSimulation) {
      console.log('📧 Using mock email service for realistic email simulation');
      return this.mockEmailService.sendWelcomeEmail(emailData);
    } else {
      console.log('📧 Using real email service');
      return this.apiService.sendWelcomeEmail(emailData);
    }
  }

  getTenants(page: number = 1, pageSize: number = 50, search?: string, status?: string): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      // Client-side filter for mock data
      return this.mockTenantService.getTenants().pipe(
        map(list => {
          let result = list;
          if (search) {
            const q = search.toLowerCase();
            result = result.filter(t => t.name.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q));
          }
          if (status) {
            result = result.filter(t => (t as any).Status === status || (t as any).status === status.toLowerCase());
          }
          
          // Return paginated result to match API format
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const items = result.slice(startIndex, endIndex);
          
          return {
            items: items,
            totalCount: result.length,
            totalPages: Math.ceil(result.length / pageSize),
            currentPage: page,
            pageSize: pageSize,
            hasNextPage: endIndex < result.length,
            hasPreviousPage: page > 1
          };
        })
      );
    } else {
      return this.apiService.getTenants(page, pageSize, search, status).pipe(
        map((resp: any) => {
          // Handle both old format (array) and new format (paginated object)
          if (Array.isArray(resp)) {
            // Old format - convert to new paginated format
            return {
              items: resp,
              totalCount: resp.length,
              totalPages: 1,
              currentPage: 1,
              pageSize: resp.length,
              hasNextPage: false,
              hasPreviousPage: false
            };
          } else {
            // New paginated format
            return resp;
          }
        })
      );
    }
  }

  getTenant(tenantId: string): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      return this.mockTenantService.getTenant(tenantId);
    } else {
      return this.apiService.getTenant(tenantId);
    }
  }

  authenticateAdmin(email: string, password: string): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      return this.mockTenantService.authenticateAdmin(email, password);
    } else {
      // Use real authentication service - ApiService doesn't have a login method
      // This would typically go through a separate auth service
      console.warn('Real admin authentication not implemented - would use auth service');
      return this.mockTenantService.authenticateAdmin(email, password);
    }
  }

  tenantLogin(tenantId: string, email: string, password: string): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      return this.mockTenantService.tenantLogin(tenantId, email, password);
    } else {
      return this.apiService.tenantLogin({ tenantId, email, password });
    }
  }

  simulateConsentClick(tenantId: string): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices && config.enableConsentFlow) {
      return this.mockTenantService.simulateConsentClick(tenantId);
    } else {
      // For real services, this would update tenant status via API
      return this.apiService.updateTenant(tenantId, { consentStatus: 'consented' });
    }
  }

  getDashboardStats(): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      return this.mockTenantService.getDashboardStats();
    } else {
      // Use real dashboard metrics endpoint
      return this.apiService.getDashboardMetrics();
    }
  }

  getEmailLogs(): Observable<any[]> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      return this.mockTenantService.getEmailLogs();
    } else {
      // Real email logs would come from a different endpoint
      console.warn('Real email logs not implemented - would use separate email service');
      return this.mockTenantService.getEmailLogs();
    }
  }

  getEmailStats(): Observable<any> {
    const config = this.getDemoConfig();
    
    if (config.useMockServices) {
      return this.mockEmailService.getEmailStats();
    } else {
      // Real email stats would come from a different endpoint
      console.warn('Real email stats not implemented - would use separate email service');
      return this.mockEmailService.getEmailStats();
    }
  }

  // Demo control methods
  enableDemo(): void {
    this.updateDemoConfig({ useMockServices: true });
    console.log('🎯 Demo mode enabled - using localStorage for realistic simulation');
  }

  disableDemo(): void {
    this.updateDemoConfig({ useMockServices: false });
    console.log('🌐 Demo mode disabled - using real backend services');
  }

  isUsingMockServices(): boolean {
    return this.getDemoConfig().useMockServices;
  }

  shouldShowDemoIndicator(): boolean {
    return this.getDemoConfig().showDemoIndicator;
  }

  // Clear all demo data (useful for resetting demo)
  clearDemoData(): void {
    const keysToRemove = [
      'saasfactory_demo_tenants',
      'saasfactory_demo_emails',
      'saasfactory_demo_admin',
      'saasfactory_email_config',
      'saasfactory_email_history'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 Demo data cleared - demo will reinitialize with fresh data');
  }

  // Export demo data for sharing
  exportDemoData(): any {
    const demoData = {
      tenants: JSON.parse(localStorage.getItem('saasfactory_demo_tenants') || '[]'),
      emails: JSON.parse(localStorage.getItem('saasfactory_demo_emails') || '[]'),
      emailHistory: JSON.parse(localStorage.getItem('saasfactory_email_history') || '[]'),
      admin: JSON.parse(localStorage.getItem('saasfactory_demo_admin') || '{}'),
      config: this.getDemoConfig(),
      exportedAt: new Date().toISOString()
    };
    
    return demoData;
  }

  // Import demo data
  importDemoData(demoData: any): void {
    if (demoData.tenants) {
      localStorage.setItem('saasfactory_demo_tenants', JSON.stringify(demoData.tenants));
    }
    if (demoData.emails) {
      localStorage.setItem('saasfactory_demo_emails', JSON.stringify(demoData.emails));
    }
    if (demoData.emailHistory) {
      localStorage.setItem('saasfactory_email_history', JSON.stringify(demoData.emailHistory));
    }
    if (demoData.admin) {
      localStorage.setItem('saasfactory_demo_admin', JSON.stringify(demoData.admin));
    }
    if (demoData.config) {
      this.updateDemoConfig(demoData.config);
    }
    
    console.log('📥 Demo data imported successfully');
  }
} 