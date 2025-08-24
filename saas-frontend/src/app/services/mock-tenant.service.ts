import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { delay, tap, switchMap } from 'rxjs/operators';

export interface MockTenant {
  id: string;
  name: string;
  domain: string;
  adminEmail: string;
  authType: string;
  azureAdTenantId?: string;
  azureAdDomain?: string;
  selectedModules: string[];
  estimatedUsers: number;
  status: 'active' | 'pending' | 'registering' | 'azure_registered';
  consentStatus: 'pending' | 'consented';
  createdAt: string;
  lastLoginAt?: string;
  credentials?: {
    tenantId: string;
    apiKey: string;
    clientId: string;
    clientSecret?: string;
  };
  adminUser?: {
    email: string;
    tempPassword?: string;
    mustChangePassword: boolean;
    lastPasswordChange?: string;
  };
  emailSent?: {
    timestamp: string;
    subject: string;
    recipient: string;
    status: 'sent' | 'delivered' | 'read';
  };
}

export interface MockOnboardingResult {
  tenant: MockTenant;
  credentials: {
    tenantId: string;
    apiKey: string;
    clientId: string;
    clientSecret: string;
  };
  adminUser: {
    email: string;
    tempPassword: string;
    mustChangePassword: boolean;
  };
  emailResult: {
    sent: boolean;
    timestamp: string;
    subject: string;
    recipient: string;
  };
  progress: Array<{
    step: string;
    title: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    message: string;
    timestamp: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class MockTenantService {
  private readonly STORAGE_KEY = 'saasfactory_demo_tenants';
  private readonly EMAIL_STORAGE_KEY = 'saasfactory_demo_emails';
  private readonly ADMIN_LOGIN_KEY = 'saasfactory_demo_admin';
  
  private tenantsSubject = new BehaviorSubject<MockTenant[]>(this.loadTenantsFromStorage());
  public tenants$ = this.tenantsSubject.asObservable();

  constructor() {
    console.log('📦 MockTenantService initialized for realistic demo');
    this.initializeDemoData();
  }

  private initializeDemoData(): void {
    // Initialize with some realistic demo data if storage is empty
    const existingTenants = this.loadTenantsFromStorage();
    if (existingTenants.length === 0) {
      const sampleTenants: MockTenant[] = [
        {
          id: 'acme-corp-20241201',
          name: 'Acme Corporation',
          domain: 'acme.myapp.com',
          adminEmail: 'admin@acme.com',
          authType: 'azuread',
          selectedModules: ['userManagement', 'analytics', 'rbac'],
          estimatedUsers: 50,
          status: 'azure_registered',
          consentStatus: 'consented',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
          lastLoginAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
          credentials: {
            tenantId: 'acme-corp-20241201',
            apiKey: 'demo_key_acme_corp_placeholder',
            clientId: 'client_AcmeCorp123',
            clientSecret: 'secret_AcmeCorp456'
          },
          adminUser: {
            email: 'admin@acme.com',
            tempPassword: 'AcmeDemo2024!',
            mustChangePassword: false,
            lastPasswordChange: new Date(Date.now() - 86400000 * 5).toISOString()
          },
          emailSent: {
            timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
            subject: 'Welcome to SaaS Factory - Acme Corporation Tenant Ready!',
            recipient: 'admin@acme.com',
            status: 'read'
          }
        },
        {
          id: 'tech-solutions-20241125',
          name: 'Tech Solutions Inc',
          domain: 'techsolutions.platform.com',
          adminEmail: 'it@techsolutions.com',
          authType: 'jwt',
          selectedModules: ['userManagement', 'analytics', 'notifications'],
          estimatedUsers: 25,
          status: 'active',
          consentStatus: 'consented',
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), // 14 days ago
          lastLoginAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
          credentials: {
            tenantId: 'tech-solutions-20241125',
            apiKey: 'demo_key_tech_solutions_placeholder',
            clientId: 'client_TechSol123',
            clientSecret: 'secret_TechSol789'
          },
          adminUser: {
            email: 'it@techsolutions.com',
            tempPassword: 'TechDemo2024!',
            mustChangePassword: false
          }
        },
        {
          id: 'primussoftdemo-20250727',
          name: 'PrimusSoft Demo',
          domain: 'demo.primussoft.com',
          adminEmail: 'akki@primussoft.com',
          authType: 'jwt',
          selectedModules: ['userManagement', 'analytics', 'rbac'],
          estimatedUsers: 30,
          status: 'active',
          consentStatus: 'consented',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          lastLoginAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
          credentials: {
            tenantId: 'primussoftdemo-20250727',
            apiKey: 'sk_live_PrimusSoftDemo2024789',
            clientId: 'client_PrimusSoft123',
            clientSecret: 'secret_PrimusSoft456'
          },
          adminUser: {
            email: 'akki@primussoft.com',
            tempPassword: 'PrimusDemo2024!',
            mustChangePassword: false
          }
        }
      ];
      this.saveTenantsToStorage(sampleTenants);
      this.tenantsSubject.next(sampleTenants);
    }

    // Store admin login for demo
    if (!localStorage.getItem(this.ADMIN_LOGIN_KEY)) {
      localStorage.setItem(this.ADMIN_LOGIN_KEY, JSON.stringify({
        email: 'admin@saasfactory.com',
        password: 'SaaSFactory2024!',
        role: 'platform_admin',
        lastLogin: new Date().toISOString()
      }));
    }
  }

  private loadTenantsFromStorage(): MockTenant[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading tenants from storage:', error);
      return [];
    }
  }

  private saveTenantsToStorage(tenants: MockTenant[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tenants));
    } catch (error) {
      console.error('Error saving tenants to storage:', error);
    }
  }

  private generateTenantId(companyName: string): string {
    const cleanName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${cleanName}-${timestamp}`;
  }

  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTempPassword(): string {
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    
    let password = '';
    password += upperCase.charAt(Math.floor(Math.random() * upperCase.length));
    password += lowerCase.charAt(Math.floor(Math.random() * lowerCase.length));
    password += digits.charAt(Math.floor(Math.random() * digits.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    for (let i = 4; i < 12; i++) {
      const allChars = upperCase + lowerCase + digits + special;
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password;
  }

  // Public API methods that simulate real backend calls
  onboardTenant(tenantData: any): Observable<MockOnboardingResult> {
    console.log('🎯 MockTenantService: Starting realistic tenant onboarding simulation');
    
    return of(null).pipe(
      delay(2000), // Simulate processing time
      tap(() => {
        console.log('⏳ Processing tenant onboarding...');
      }),
      delay(1000),
      tap(() => {
        console.log('📧 Sending welcome email...');
      }),
      delay(1500),
      tap(() => {
        const tenantId = this.generateTenantId(tenantData.name);
        const apiKey = `sk_live_${this.generateSecureToken(24)}`;
        const clientId = `client_${this.generateSecureToken(12)}`;
        const clientSecret = `secret_${this.generateSecureToken(32)}`;
        const tempPassword = tenantData.authType === 'jwt' ? this.generateTempPassword() : undefined;

        const newTenant: MockTenant = {
          id: tenantId,
          name: tenantData.name,
          domain: tenantData.domain,
          adminEmail: tenantData.adminEmail,
          authType: tenantData.authType,
          azureAdTenantId: tenantData.azureAdTenantId,
          azureAdDomain: tenantData.azureAdDomain,
          selectedModules: tenantData.selectedModules || [],
          estimatedUsers: tenantData.estimatedUsers || 10,
          status: tenantData.authType === 'azuread' ? 'registering' : 'active',
          consentStatus: 'pending',
          createdAt: new Date().toISOString(),
          credentials: {
            tenantId,
            apiKey,
            clientId,
            clientSecret
          },
          adminUser: {
            email: tenantData.adminEmail,
            tempPassword,
            mustChangePassword: true
          },
          emailSent: {
            timestamp: new Date().toISOString(),
            subject: `Welcome to SaaS Factory - ${tenantData.name} Tenant Ready!`,
            recipient: tenantData.adminEmail,
            status: 'sent'
          }
        };

        // Store the new tenant
        const currentTenants = this.loadTenantsFromStorage();
        currentTenants.push(newTenant);
        this.saveTenantsToStorage(currentTenants);
        this.tenantsSubject.next(currentTenants);

        console.log('✅ Tenant onboarding completed successfully');
        console.log('📧 Welcome email sent to:', tenantData.adminEmail);
      }),
      tap(() => {
        // Store email log for realistic email tracking
        this.logEmailForDemo(tenantData);
      }),
      delay(500),
      switchMap(() => {
        const tenantId = this.generateTenantId(tenantData.name);
        const result: MockOnboardingResult = {
          tenant: {
            id: tenantId,
            name: tenantData.name,
            domain: tenantData.domain,
            adminEmail: tenantData.adminEmail,
            authType: tenantData.authType,
            selectedModules: tenantData.selectedModules || [],
            estimatedUsers: tenantData.estimatedUsers || 10,
            status: tenantData.authType === 'azuread' ? 'registering' : 'active',
            consentStatus: 'pending',
            createdAt: new Date().toISOString()
          },
          credentials: {
            tenantId,
            apiKey: `sk_live_${this.generateSecureToken(24)}`,
            clientId: `client_${this.generateSecureToken(12)}`,
            clientSecret: `secret_${this.generateSecureToken(32)}`
          },
          adminUser: {
            email: tenantData.adminEmail,
            tempPassword: this.generateTempPassword(), // Always generate password for portal access
            mustChangePassword: true
          },
          emailResult: {
            sent: true,
            timestamp: new Date().toISOString(),
            subject: `Welcome to SaaS Factory - ${tenantData.name} Tenant Ready!`,
            recipient: tenantData.adminEmail
          },
          progress: [
            {
              step: 'tenant_creation',
              title: 'Tenant Creation',
              status: 'completed',
              message: 'Tenant infrastructure created successfully',
              timestamp: new Date(Date.now() - 4000).toISOString()
            },
            {
              step: 'credentials_generation',
              title: 'Credentials Generation',
              status: 'completed',
              message: 'API keys and credentials generated',
              timestamp: new Date(Date.now() - 3000).toISOString()
            },
            {
              step: 'module_configuration',
              title: 'Module Configuration',
              status: 'completed',
              message: `Configured ${tenantData.selectedModules?.length || 0} modules`,
              timestamp: new Date(Date.now() - 2000).toISOString()
            },
            {
              step: 'auth_setup',
              title: 'Authentication Setup',
              status: 'completed',
              message: `${tenantData.authType} authentication configured`,
              timestamp: new Date(Date.now() - 1500).toISOString()
            },
            {
              step: 'email_notification',
              title: 'Email Notification',
              status: 'completed',
              message: `Welcome email sent to ${tenantData.adminEmail}`,
              timestamp: new Date().toISOString()
            }
          ]
        };
        return of(result);
      })
    );
  }

  private logEmailForDemo(tenantData: any): void {
    const emailLog = {
      timestamp: new Date().toISOString(),
      to: tenantData.adminEmail,
      subject: `Welcome to SaaS Factory - ${tenantData.name} Tenant Ready!`,
      status: 'sent',
      tenantId: this.generateTenantId(tenantData.name),
      type: 'welcome_email',
      content: {
        companyName: tenantData.name,
        adminEmail: tenantData.adminEmail,
        authType: tenantData.authType,
        modules: tenantData.selectedModules
      }
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem(this.EMAIL_STORAGE_KEY) || '[]');
      existingLogs.push(emailLog);
      localStorage.setItem(this.EMAIL_STORAGE_KEY, JSON.stringify(existingLogs));
      console.log('📧 Email logged for demo tracking:', emailLog);
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  // Simulate consent flow
  simulateConsentClick(tenantId: string): Observable<any> {
    console.log('🔗 Simulating consent link click for tenant:', tenantId);
    
    return of(null).pipe(
      delay(1000),
      tap(() => {
        const tenants = this.loadTenantsFromStorage();
        const tenant = tenants.find(t => t.id === tenantId);
        if (tenant) {
          tenant.consentStatus = 'consented';
          if (tenant.authType === 'azuread') {
            tenant.status = 'azure_registered';
          }
          this.saveTenantsToStorage(tenants);
          this.tenantsSubject.next(tenants);
          console.log('✅ Tenant consent processed and Azure AD registration simulated');
        }
      })
    );
  }

  // Get all tenants for admin dashboard
  getTenants(): Observable<MockTenant[]> {
    return this.tenants$;
  }

  // Get specific tenant
  getTenant(tenantId: string): Observable<MockTenant | null> {
    const tenants = this.loadTenantsFromStorage();
    const tenant = tenants.find(t => t.id === tenantId);
    return of(tenant || null).pipe(delay(300));
  }

  // Simulate tenant login
  tenantLogin(tenantId: string, email: string, password: string): Observable<any> {
    console.log('🔐 MockTenantService: Simulating tenant login');
    console.log('🔍 Login attempt:', { tenantId, email, password });
    
    return of(null).pipe(
      delay(1500),
      tap(() => {
        const tenants = this.loadTenantsFromStorage();
        const tenant = tenants.find(t => t.id === tenantId && t.adminEmail === email);
        
        console.log('🔍 Found tenant:', tenant);
        console.log('🔍 Expected password:', tenant?.adminUser?.tempPassword);
        console.log('🔍 Provided password:', password);
        
        if (!tenant) {
          throw new Error('Tenant not found or email mismatch');
        }

        if (tenant.adminUser?.tempPassword && tenant.adminUser.tempPassword !== password) {
          throw new Error(`Invalid password. Expected: ${tenant.adminUser.tempPassword}, Got: ${password}`);
        }

        // Update last login
        tenant.lastLoginAt = new Date().toISOString();
        this.saveTenantsToStorage(tenants);
        this.tenantsSubject.next(tenants);
        
        console.log('✅ Tenant login successful');
      })
    );
  }

  // Get email logs for demo
  getEmailLogs(): Observable<any[]> {
    try {
      const logs = JSON.parse(localStorage.getItem(this.EMAIL_STORAGE_KEY) || '[]');
      return of(logs).pipe(delay(200));
    } catch (error) {
      return of([]);
    }
  }

  // Admin authentication for demo
  authenticateAdmin(email: string, password: string): Observable<any> {
    return of(null).pipe(
      delay(1000),
      tap(() => {
        const adminData = JSON.parse(localStorage.getItem(this.ADMIN_LOGIN_KEY) || '{}');
        if (adminData.email === email && adminData.password === password) {
          adminData.lastLogin = new Date().toISOString();
          localStorage.setItem(this.ADMIN_LOGIN_KEY, JSON.stringify(adminData));
          console.log('✅ Admin authentication successful');
        } else {
          throw new Error('Invalid admin credentials');
        }
      })
    );
  }

  // Generate realistic dashboard statistics
  getDashboardStats(): Observable<any> {
    const tenants = this.loadTenantsFromStorage();
    const emailLogs = JSON.parse(localStorage.getItem(this.EMAIL_STORAGE_KEY) || '[]');
    
    const stats = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === 'active' || t.status === 'azure_registered').length,
      pendingTenants: tenants.filter(t => t.status === 'pending' || t.status === 'registering').length,
      totalUsers: tenants.reduce((sum, t) => sum + (t.estimatedUsers || 0), 0),
      emailsSent: emailLogs.length,
      authMethods: {
        azuread: tenants.filter(t => t.authType === 'azuread').length,
        jwt: tenants.filter(t => t.authType === 'jwt').length,
        auth0: tenants.filter(t => t.authType === 'auth0').length
      },
      recentActivity: tenants
        .filter(t => t.lastLoginAt)
        .sort((a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime())
        .slice(0, 5)
        .map(t => ({
          tenantName: t.name,
          lastLogin: t.lastLoginAt,
          authType: t.authType
        }))
    };

    return of(stats).pipe(delay(500));
  }
} 