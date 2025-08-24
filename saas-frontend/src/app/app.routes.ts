import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, platformAdminGuard, tenantAdminGuard, roleGuard } from './core/guards/dual-auth.guard';
import { tenantAuthGuard, tenantGuestGuard, tenantExistsGuard } from './core/guards/tenant-auth.guard';

export const routes: Routes = [
  // Default redirect to startup component
  {
    path: '',
    loadComponent: () => import('./components/startup/startup.component').then(m => m.StartupComponent),
    pathMatch: 'full'
  },
  
  // Redirect handler for Azure AD callbacks
  {
    path: 'auth/callback',
    loadComponent: () => import('./components/auth/redirect-handler/redirect-handler.component').then(m => m.RedirectHandlerComponent)
  },

  // Welcome/Landing page showing all login options
  {
    path: 'welcome',
    loadComponent: () => import('./components/welcome/welcome.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'service-discovery',
    loadComponent: () => import('./components/service-discovery/service-discovery.component').then(m => m.ServiceDiscoveryComponent)
  },
  
  // Authentication Routes (no layout)
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/platform-admin-login.component').then(m => m.PlatformAdminLoginComponent)
  },
  {
    path: 'logout',
    loadComponent: () => import('./components/auth/logout/logout.component').then(m => m.LogoutComponent)
  },
  {
    path: 'login/tenant/:tenantId',
    loadComponent: () => import('./components/auth/login/tenant-admin-login.component').then(m => m.TenantAdminLoginComponent)
  },
  // Keep other login options for development/testing
  {
    path: 'login-dual',
    loadComponent: () => import('./components/auth/login/dual-auth-login.component').then(m => m.DualAuthLoginComponent)
  },
  {
    path: 'login-bypass',
    loadComponent: () => import('./components/auth/login/working-login.component').then(m => m.WorkingLoginComponent)
  },
  {
    path: 'login-original',
    loadComponent: () => import('./components/auth/login/enhanced-login.component').then(m => m.EnhancedLoginComponent)
  },
  {
    path: 'login-fixed',
    loadComponent: () => import('./components/auth/login/fixed-login.component').then(m => m.FixedLoginComponent)
  },
  {
    path: 'login-simple',
    loadComponent: () => import('./components/auth/login/simple-login.component').then(m => m.SimpleLoginComponent)
  },
  {
    path: 'auth-debug',
    loadComponent: () => import('./components/auth/auth-debug/auth-debug.component').then(m => m.AuthDebugComponent)
  },
  {
    path: 'auth-fix',
    loadComponent: () => import('./components/auth/auth-fix/auth-fix.component').then(m => m.AuthFixComponent)
  },
  {
    path: 'tenant-selection',
    loadComponent: () => import('./components/auth/tenant-login-selection/tenant-login-selection.component').then(m => m.TenantLoginSelectionComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./components/auth/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  // =================================================================
  // ADMIN PORTAL - SaaS Factory Platform Administration
  // Only Tenant Management, Authentication, and RBAC modules active
  // =================================================================
  // Admin redirect route - redirects /admin to /dashboard
  {
    path: 'admin',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  // Main Application Layout - All authenticated admin routes use this layout
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    canActivate: [authGuard],
    children: [
      // Dashboard - Protected route
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      
      // Tenant Management Module - ACTIVE (Platform Admin Only)
      {
        path: 'tenants',
  canActivate: [platformAdminGuard],
        children: [
          {
            path: '',
            redirectTo: 'list',
            pathMatch: 'full'
          },
          {
            path: 'list',
            loadComponent: () => import('./components/tenants/tenant-list/tenant-list.component').then(m => m.TenantListComponent)
          },
          {
            path: 'onboard',
            canActivate: [platformAdminGuard],
            loadComponent: () => import('./components/tenants/tenant-idp-onboarding/tenant-idp-onboarding.component').then(m => m.TenantIdpOnboardingComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./components/tenants/tenant-form/tenant-form.component').then(m => m.TenantFormComponent)
          },
          {
            path: 'view/:id',
            loadComponent: () => import('./components/tenants/tenant-detail/tenant-detail.component').then(m => m.TenantDetailComponent)
          },
          {
            path: ':tenantId/auth-config',
            loadComponent: () => import('./components/tenants/tenant-auth-config/tenant-auth-config.component').then(m => m.TenantAuthConfigComponent)
          }
        ]
      },

      // Authentication Module - ACTIVE
      {
        path: 'authentication',
        children: [
          {
            path: '',
            redirectTo: 'users',
            pathMatch: 'full'
          },
          {
            path: 'users',
            loadComponent: () => import('./components/authentication/user-list/user-list.component').then(m => m.UserListComponent)
          },
          {
            path: 'users/create',
            loadComponent: () => import('./components/authentication/user-form/user-form.component').then(m => m.UserFormComponent)
          },
          {
            path: 'users/edit/:id',
            loadComponent: () => import('./components/authentication/user-form/user-form.component').then(m => m.UserFormComponent)
          },
          {
            path: 'users/:id',
            loadComponent: () => import('./components/authentication/user-detail/user-detail.component').then(m => m.UserDetailComponent)
          },
          {
            path: 'sessions',
            loadComponent: () => import('./components/authentication/session-list/session-list.component').then(m => m.SessionListComponent)
          },
          {
            path: 'security-policies',
            loadComponent: () => import('./components/authentication/security-policies/security-policies.component').then(m => m.SecurityPoliciesComponent)
          },
          {
            path: 'password-policies',
            loadComponent: () => import('./components/authentication/password-policies/password-policies.component').then(m => m.PasswordPoliciesComponent)
          },
          {
            path: 'oauth-providers',
            loadComponent: () => import('./components/authentication/oauth-providers/oauth-providers.component').then(m => m.OAuthProvidersComponent)
          },
          {
            path: 'mfa-settings',
            loadComponent: () => import('./components/authentication/mfa-settings/mfa-settings.component').then(m => m.MfaSettingsComponent)
          }
          // Commented out missing components
          // {
          //   path: 'tenant-config',
          //   loadComponent: () => import('./components/authentication/tenant-config/tenant-config.component').then(m => m.TenantConfigComponent)
          // },
          // {
          //   path: 'user-invitations',
          //   loadComponent: () => import('./components/authentication/user-invitations/user-invitations.component').then(m => m.UserInvitationsComponent)
          // },
          // {
          //   path: 'azure-ad-consent',
          //   loadComponent: () => import('./components/authentication/azure-ad-consent/azure-ad-consent.component').then(m => m.AzureAdConsentComponent)
          // }
        ]
      },
      
      // User Management Module - REMOVED from Platform Admin
      // User management is now only available in Tenant Portal if RBAC module is enabled
      
      // RBAC Module - ACTIVE (Platform Admin configures roles/permissions)
      {
        path: 'rbac',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            redirectTo: 'roles',
            pathMatch: 'full'
          },
          {
            path: 'roles',
            loadComponent: () => import('./components/rbac/role-list/role-list.component').then(m => m.RoleListComponent)
          },
          {
            path: 'roles/create',
            loadComponent: () => import('./components/rbac/role-form/role-form.component').then(m => m.RoleFormComponent)
          },
          {
            path: 'roles/edit/:id',
            loadComponent: () => import('./components/rbac/role-form/role-form.component').then(m => m.RoleFormComponent)
          },
          {
            path: 'permissions',
            loadComponent: () => import('./components/rbac/permission-list/permission-list.component').then(m => m.PermissionListComponent)
          },
          {
            path: 'user-assignments',
            loadComponent: () => import('./components/rbac/user-role-assignment/user-role-assignment.component').then(m => m.UserRoleAssignmentComponent)
          }
        ]
      },

      // Module Management - NEW - Gateway Integration
      {
        path: 'modules',
        canActivate: [platformAdminGuard],
        children: [
          {
            path: '',
            redirectTo: 'tenant-modules',
            pathMatch: 'full'
          },
          {
            path: 'tenant-modules',
            loadComponent: () => import('./components/modules/tenant-modules.component').then(m => m.TenantModulesComponent)
          }
        ]
      },

      // System Monitoring & Logging Module - NEW
      {
        path: 'monitoring',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full'
          },
          {
            path: 'dashboard',
            loadComponent: () => import('./components/monitoring/system-monitoring/system-monitoring.component').then(m => m.SystemMonitoringComponent)
          },
          {
            path: 'logs',
            children: [
              {
                path: '',
                redirectTo: 'system',
                pathMatch: 'full'
              },
              {
                path: 'system',
                loadComponent: () => import('./components/logs/system-logs/system-logs.component').then(m => m.SystemLogsComponent)
              },
              {
                path: 'audit',
                loadComponent: () => import('./components/logs/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent)
              }
            ]
          },
          {
            path: 'performance',
            loadComponent: () => import('./components/monitoring/performance-metrics/performance-metrics.component').then(m => m.PerformanceMetricsComponent)
          }
        ]
      },

      // Gateway Monitoring - NEW - Gateway Integration
      {
        path: 'monitoring',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            redirectTo: 'gateway-status',
            pathMatch: 'full'
          },
          {
            path: 'gateway-status',
            loadComponent: () => import('./components/monitoring/gateway-status.component').then(m => m.GatewayStatusComponent)
          }
        ]
      },

      // Analytics Module - ENABLED
      {
        path: 'analytics',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },

      // Audit Module - ENABLED
      {
        path: 'audit',
        children: [
          {
            path: '',
            redirectTo: 'logs',
            pathMatch: 'full'
          },
          {
            path: 'logs',
            loadComponent: () => import('./components/audit/audit-list/audit-list.component').then(m => m.AuditListComponent)
          },
          {
            path: 'reports',
            loadComponent: () => import('./components/audit/audit-reports/audit-reports.component').then(m => m.AuditReportsComponent)
          }
        ]
      },

      // AI Copilot - ENABLED
      {
        path: 'copilot',
        loadComponent: () => import('./components/copilot/copilot.component').then(m => m.CopilotComponent)
      },

      // Basic Settings - Keep minimal settings
      {
        path: 'settings',
        loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },

  // =================================================================
  // UNIFIED TENANT PORTAL ROUTING - /tenants/{tenant_id}
  // Implements unified routing for tenant-specific portals with Azure AD authentication
  // =================================================================
  
  // Tenant Portal Base Route - Redirects to dashboard or login based on auth status
  {
    path: 'tenants/:tenantId',
    canActivate: [tenantExistsGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./components/tenant-portal/tenant-portal-redirect.component').then(m => m.TenantPortalRedirectComponent)
      },
      
      // Azure AD Authentication Callback
      {
        path: 'auth/callback',
        loadComponent: () => import('./components/tenant-portal/auth-callback.component').then(m => m.AuthCallbackComponent)
      },
      
      // Tenant Login Page (fallback if Azure AD fails)
      {
        path: 'login',
        canActivate: [tenantGuestGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-login.component').then(m => m.TenantLoginComponent)
      },
      
      // Protected Tenant Routes (require authentication)
      {
        path: 'dashboard',
        canActivate: [tenantAuthGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-dashboard-enhanced.component').then(m => m.TenantDashboardEnhancedComponent)
      },
      {
        path: 'users',
        canActivate: [tenantAuthGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-users-enhanced.component').then(m => m.TenantUsersEnhancedComponent)
      },
      {
        path: 'settings',
        canActivate: [tenantAuthGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-settings.component').then(m => m.TenantSettingsComponent)
      },
      {
        path: 'analytics',
        canActivate: [tenantAuthGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-analytics.component').then(m => m.TenantAnalyticsComponent)
      },
      {
        path: 'copilot',
        canActivate: [tenantAuthGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-copilot.component').then(m => m.TenantCopilotComponent)
      }
      ,
      {
        path: 'claims',
        canActivate: [tenantAuthGuard],
        loadComponent: () => import('./components/tenant-portal/tenant-claims.component').then(m => m.TenantClaimsComponent)
      }
    ]
  },

  // Legacy tenant routes (redirect to new structure)
  {
    path: 'tenant/:tenantId/login',
    redirectTo: '/tenants/:tenantId/login',
    pathMatch: 'full'
  },
  {
    path: 'tenant/:tenantId/dashboard',
    redirectTo: '/tenants/:tenantId/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'tenant/:tenantId/auth/callback',
    redirectTo: '/tenants/:tenantId/auth/callback',
    pathMatch: 'full'
  },

  // =================================================================
  // PUBLIC ROUTES - Minimal Documentation
  // =================================================================
  
  // Documentation Routes (accessible to everyone)
  {
    path: 'docs',
    loadComponent: () => import('./components/docs/docs.component').then(m => m.DocsComponent)
  },

  // Integration Guide Route (accessible with tenant ID)
  {
    path: 'integration-guide/:tenantId',
    loadComponent: () => import('./components/integration-guide/integration-guide.component').then(m => m.IntegrationGuideComponent)
  },

  // Catch-all redirect
  {
    path: '**',
    redirectTo: '/login'
  }
];
