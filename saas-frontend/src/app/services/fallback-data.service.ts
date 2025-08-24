import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FallbackDataService {

  constructor() { }

  /**
   * Get fallback dashboard stats when APIs fail
   */
  getFallbackDashboardStats() {
    return {
      totalUsers: 127,
      totalTenants: 23,
      totalRoles: 8,
      totalNotifications: 1847,
      lastUpdated: new Date()
    };
  }

  /**
   * Get fallback recent activity data
   */
  getFallbackRecentActivity() {
    return [
      {
        icon: '👥',
        description: 'New user registered: john.doe@acmecorp.com',
        timestamp: '2 minutes ago',
        type: 'success',
        userId: 'user-001',
        tenantId: 'tenant-acme'
      },
      {
        icon: '🔐',
        description: 'Role assigned: Tenant Admin to user sarah.smith@techstart.io',
        timestamp: '5 minutes ago',
        type: 'info',
        userId: 'user-002',
        tenantId: 'tenant-techstart'
      },
      {
        icon: '🏢',
        description: 'New tenant onboarded: RetailCorp Solutions',
        timestamp: '12 minutes ago',
        type: 'success',
        tenantId: 'tenant-retail'
      },
      {
        icon: '📧',
        description: 'Bulk notification sent to 150 users',
        timestamp: '18 minutes ago',
        type: 'info'
      },
      {
        icon: '🔧',
        description: 'System maintenance completed successfully',
        timestamp: '1 hour ago',
        type: 'success'
      },
      {
        icon: '⚠️',
        description: 'API rate limit warning for tenant-manufacturing',
        timestamp: '2 hours ago',
        type: 'warning',
        tenantId: 'tenant-manufacturing'
      }
    ];
  }

  /**
   * Get fallback tenant list data
   */
  getFallbackTenants() {
    return [
      {
        Id: 'tenant-acme-corp',
        Name: 'ACME Corporation',
        Domain: 'acme.example.com',
        Status: 'Active',
        CreatedAt: new Date(Date.now() - (45 * 24 * 60 * 60 * 1000)).toISOString(),
        Settings: { 
          userCount: 87,
          enableAnalytics: true,
          enableNotifications: true,
          enableAuditLogs: true,
          enableAI: true
        }
      },
      {
        Id: 'tenant-techstart-io',
        Name: 'TechStart Solutions',
        Domain: 'techstart.io',
        Status: 'Active',
        CreatedAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(),
        Settings: { 
          userCount: 34,
          enableAnalytics: true,
          enableNotifications: true,
          enableAuditLogs: false,
          enableAI: true
        }
      },
      {
        Id: 'tenant-retail-corp',
        Name: 'RetailCorp Solutions',
        Domain: 'retailcorp.com',
        Status: 'Active',
        CreatedAt: new Date(Date.now() - (20 * 24 * 60 * 60 * 1000)).toISOString(),
        Settings: { 
          userCount: 156,
          enableAnalytics: true,
          enableNotifications: true,
          enableAuditLogs: true,
          enableAI: false
        }
      },
      {
        Id: 'tenant-manufacturing',
        Name: 'Manufacturing Plus',
        Domain: 'mfgplus.example.com',
        Status: 'Inactive',
        CreatedAt: new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString(),
        Settings: { 
          userCount: 23,
          enableAnalytics: false,
          enableNotifications: true,
          enableAuditLogs: true,
          enableAI: false
        }
      }
    ];
  }

  /**
   * Get fallback OAuth providers data
   */
  getFallbackOAuthProviders() {
    return [
      {
        id: 'azure-ad-fallback',
        type: 'azuread',
        name: 'Azure Active Directory',
        description: 'Microsoft Azure AD OAuth provider (Fallback Data)',
        icon: '🔵',
        status: 'enabled',
        clientId: '3a55b8fa-715b-499f-b88e-910766d635d5',
  redirectUri: `${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/auth/azure/callback`,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        isConfigured: true,
        lastTested: new Date().toISOString(),
        testStatus: 'success'
      },
      {
        id: 'google-oauth-fallback',
        type: 'google',
        name: 'Google OAuth',
        description: 'Google OAuth 2.0 provider (Fallback Data)',
        icon: '🔴',
        status: 'disabled',
        clientId: 'your-google-client-id.apps.googleusercontent.com',
  redirectUri: `${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/auth/google/callback`,
        scopes: ['openid', 'profile', 'email'],
        isConfigured: false,
        lastTested: null,
        testStatus: 'not_tested'
      },
      {
        id: 'github-oauth-fallback',
        type: 'github',
        name: 'GitHub OAuth',
        description: 'GitHub OAuth App provider (Fallback Data)',
        icon: '⚫',
        status: 'disabled',
        clientId: 'your-github-client-id',
  redirectUri: `${(typeof window !== 'undefined' && window.location ? window.location.origin : '')}/auth/github/callback`,
        scopes: ['user:email', 'read:user'],
        isConfigured: false,
        lastTested: null,
        testStatus: 'not_tested'
      }
    ];
  }

  /**
   * Get fallback system stats
   */
  getFallbackSystemStats() {
    return {
      apiRequests: 15847,
      activeSessions: 42,
      uptime: '7d 14h 23m'
    };
  }

  /**
   * Get fallback user list data
   */
  getFallbackUsers() {
    return [
      {
        id: 'user-001',
        name: 'John Doe',
        email: 'john.doe@acmecorp.com',
        role: 'Tenant Admin',
        status: 'Active',
        tenantId: 'tenant-acme-corp',
        tenantName: 'ACME Corporation',
        lastLogin: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(),
        createdAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString()
      },
      {
        id: 'user-002',
        name: 'Sarah Smith',
        email: 'sarah.smith@techstart.io',
        role: 'User',
        status: 'Active',
        tenantId: 'tenant-techstart-io',
        tenantName: 'TechStart Solutions',
        lastLogin: new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString(),
        createdAt: new Date(Date.now() - (25 * 24 * 60 * 60 * 1000)).toISOString()
      },
      {
        id: 'user-003',
        name: 'Mike Johnson',
        email: 'mike.johnson@retailcorp.com',
        role: 'Tenant Admin',
        status: 'Active',
        tenantId: 'tenant-retail-corp',
        tenantName: 'RetailCorp Solutions',
        lastLogin: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(),
        createdAt: new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)).toISOString()
      }
    ];
  }

  /**
   * Get fallback roles data
   */
  getFallbackRoles() {
    return [
      {
        id: 'role-platform-admin',
        name: 'Platform Admin',
        description: 'Full platform access and management capabilities',
        permissions: ['*'],
        type: 'platform',
        isBuiltIn: true,
        userCount: 3
      },
      {
        id: 'role-tenant-admin',
        name: 'Tenant Admin',
        description: 'Administrative access within tenant scope',
        permissions: ['users.*', 'tenants.read', 'tenants.update', 'analytics.*'],
        type: 'tenant',
        isBuiltIn: true,
        userCount: 12
      },
      {
        id: 'role-user',
        name: 'User',
        description: 'Standard user access with limited permissions',
        permissions: ['users.read', 'users.update'],
        type: 'tenant',
        isBuiltIn: true,
        userCount: 98
      }
    ];
  }

  /**
   * Get fallback notifications data
   */
  getFallbackNotifications() {
    return [
      {
        id: 'notif-001',
        title: 'Welcome to SaaS Factory',
        message: 'Your tenant has been successfully onboarded.',
        type: 'info',
        status: 'sent',
        recipientCount: 1,
        createdAt: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString()
      },
      {
        id: 'notif-002',
        title: 'System Maintenance Notice',
        message: 'Scheduled maintenance will occur tonight from 2-4 AM EST.',
        type: 'warning',
        status: 'sent',
        recipientCount: 150,
        createdAt: new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString()
      },
      {
        id: 'notif-003',
        title: 'New Feature: AI Copilot',
        message: 'Introducing our new AI-powered assistant feature.',
        type: 'success',
        status: 'pending',
        recipientCount: 75,
        createdAt: new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString()
      }
    ];
  }

  /**
   * Log that fallback data is being used
   */
  logFallbackUsage(component: string, apiEndpoint: string, error?: any) {
    console.warn(`🔄 [${component}] API failure for ${apiEndpoint}, using fallback data`, error);
    
    // In production, you might want to send this to analytics/monitoring
    // this.analyticsService.trackEvent('api_fallback_used', {
    //   component,
    //   endpoint: apiEndpoint,
    //   error: error?.message
    // });
  }
} 