export const environment = {
  production: true,
  apiUrl: 'https://saas-config-api-dev.azurewebsites.net/api',
  configurationApiUrl: 'https://saas-config-api-dev.azurewebsites.net',
  authority:
    'https://login.microsoftonline.com/a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e',
  clientId: '4c024768-9d55-4193-9956-ac3a9686cdd0',
  redirectUri: window.location.origin,
  postLogoutRedirectUri: window.location.origin,
  apiScopes: ['api://4c024768-9d55-4193-9956-ac3a9686cdd0/access_as_user'],

  // Multi-Service Configuration for Production
  services: {
    configurationApi: {
      url: 'https://saas-config-api-dev.azurewebsites.net',
      name: 'Configuration API',
      endpoints: {
        health: '/health',
        swagger: '/swagger',
        api: '/api',
      },
    },
    authenticationApi: {
      url: 'https://saas-auth-api-dev.azurewebsites.net',
      name: 'Authentication API',
      endpoints: {
        health: '/health',
        swagger: '/swagger',
        auth: '/auth',
      },
    },
    gatewayApi: {
      url: 'https://saas-gateway-api-dev.azurewebsites.net',
      name: 'Gateway API',
      endpoints: {
        health: '/health',
        swagger: '/swagger',
        gateway: '/api',
      },
    },
    inventoryDemo: {
      url: 'https://demo-inventory.khan.akibandari.com',
      name: 'Demo Inventory Management',
      endpoints: {
        home: '/',
        api: '/api',
        swagger: '/swagger',
      },
    },
    productCatalog: {
      url: 'https://demo-products.khan.akibandari.com',
      name: 'AkkiTech Product Catalog',
      endpoints: {
        home: '/',
        products: '/api/products',
        swagger: '/swagger',
      },
    },
    expenseTracker: {
      url: 'https://demo-expenses.khan.akibandari.com',
      name: 'Contoso Expense Tracker',
      endpoints: {
        home: '/',
        expenses: '/api/expenses',
        swagger: '/swagger',
      },
    },
  },

  msalConfig: {
    auth: {
      clientId: '4c024768-9d55-4193-9956-ac3a9686cdd0',
      authority:
        'https://login.microsoftonline.com/a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: true,
      validateAuthority: true,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        logLevel: 1,
        piiLoggingEnabled: false,
      },
      windowHashTimeout: 60000,
      iframeHashTimeout: 6000,
      loadFrameTimeout: 0,
    },
  },

  features: {
    enableDebugLogs: false,
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
      tenants: '/tenants',
      rbac: '/rbac',
      notifications: '/notifications',
      analytics: '/analytics',
      audit: '/audit',
      copilot: '/copilot',
      auth: '/auth',
      // Align with ApiService references used by the app
      gateway: '/api/v2/gateway',
      orchestrator: '/api/v2/orchestrator',
      // Module management via tenant endpoints
      modules: '/api/v2/tenants',
    },
  },
};
