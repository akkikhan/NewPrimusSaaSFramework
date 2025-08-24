export const environment = {
  production: false,
  // Use relative base in dev; proxy.conf.json will route to appropriate services
  // Use API Gateway v2 for platform APIs
  apiUrl: '/api/v2',
  // Use Configuration API for onboarding and tenant core ops (v2)
  configurationApiUrl: '/api/v2', // Route via proxy; direct localhost URLs removed

  // Azure AD Configuration - Platform Admin (khan.aakib@outlook.com)
  authority:
    'https://login.microsoftonline.com/a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e',
  clientId: '5e65bf41-d3de-4a1b-9311-46b292b88c94', // Platform Admin app registration
  redirectUri:
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '/',
  postLogoutRedirectUri:
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '/',
  apiScopes: [], // No custom API scopes for now

  // Multi-Service Configuration for UI Integration
  services: {
    configurationApi: {
      url: '/api/v2',
      name: 'Configuration API',
      endpoints: {
        health: '/health',
        swagger: '/swagger',
        api: '/api',
      },
    },
    authenticationApi: {
      url: '/api/v2',
      name: 'Authentication API',
      endpoints: {
        health: '/health',
        swagger: '/swagger',
        auth: '/auth',
      },
    },
    gatewayApi: {
      url: '/api/v2',
      name: 'Gateway API',
      endpoints: {
        health: '/health',
        swagger: '/swagger',
        gateway: '/api',
      },
    },
    productCatalog: {
      url: '/api/v2',
      name: 'AkkiTech Product Catalog',
      endpoints: {
        home: '/',
        products: '/api/products',
        swagger: '/swagger',
      },
    },
    expenseTracker: {
      url: '/api/v2',
      name: 'Contoso Expense Tracker',
      endpoints: {
        home: '/',
        expenses: '/api/expenses',
        swagger: '/swagger',
      },
    },
    inventoryDemo: {
      url: '/api/v2',
      name: 'Demo Inventory Management',
      endpoints: {
        home: '/',
        api: '/api',
        swagger: '/swagger',
      },
    },
  },

  msalConfig: {
    auth: {
      clientId: '5e65bf41-d3de-4a1b-9311-46b292b88c94', // Platform Admin app registration
      authority:
        'https://login.microsoftonline.com/a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e',
      redirectUri:
        typeof window !== 'undefined' && window.location
          ? window.location.origin
          : '/',
      postLogoutRedirectUri:
        typeof window !== 'undefined' && window.location
          ? window.location.origin
          : '/',
      navigateToLoginRequestUrl: true,
    },
    system: {
      loggerOptions: {
        logLevel: 3,
        piiLoggingEnabled: false,
      },
    },
  },

  features: {
    enableDebugLogs: true,
    enableMockData: false,
  },

  tenant: {
    defaultTenantId: 'primussoft-20250801',
  },

  api: {
    timeout: 30000,
    endpoints: {
      health: '/health',
      users: '/users',
      settings: '/settings',
      // Tenants live on Configuration API v2
      tenants: '/api/v2/tenants',
      rbac: '/rbac',
      notifications: '/notifications',
      analytics: '/analytics',
      audit: '/audit',
      copilot: '/copilot',
      auth: '/auth',
      // Gateway and Platform Management endpoints should use v2 where applicable
      gateway: '/api/v2/gateway',
      orchestrator: '/api/v2/orchestrator',
      // Module management via Orchestrator/tenant endpoints proxy
      modules: '/api/v2/tenants',
    },
  },
};
