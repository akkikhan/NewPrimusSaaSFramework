import {
  BrowserCacheLocation,
  Configuration,
  LogLevel,
} from '@azure/msal-browser';
import { environment } from '../../environments/environment';

/**
 * Multi-Tenant MSAL Configuration for Azure AD Authentication
 * Updated to support multiple organizations/tenants
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.clientId || '5e65bf41-d3de-4a1b-9311-46b292b88c94', // Platform Admin app registration
    authority:
      environment.authority ||
      'https://login.microsoftonline.com/khanaakiboutlook.onmicrosoft.com', // Use environment authority
    redirectUri: environment.redirectUri || window.location.origin,
    postLogoutRedirectUri:
      environment.postLogoutRedirectUri || window.location.origin,
    navigateToLoginRequestUrl: false, // Prevent navigation loops
    knownAuthorities: ['login.microsoftonline.com'], // Support for common and organizations
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage, // ✅ Use localStorage to persist across page refreshes
    storeAuthStateInCookie: false, // ✅ Don't store in cookies
  },
  system: {
    loggerOptions: {
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean
      ) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(`[MSAL Error] ${message}`);
            break;
          case LogLevel.Warning:
            console.warn(`[MSAL Warning] ${message}`);
            break;
          case LogLevel.Info:
            console.log(`[MSAL Info] ${message}`);
            break;
          case LogLevel.Verbose:
            console.debug(`[MSAL Verbose] ${message}`);
            break;
        }
      },
      logLevel: LogLevel.Verbose, // Set to Verbose for debugging
      piiLoggingEnabled: false,
    },
    windowHashTimeout: 60000, // Increase timeout for slow networks
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  },
};

/**
 * Standard API Scopes for Microsoft Graph
 */
export const apiScopes = ['openid', 'profile', 'email', 'User.Read'];

/**
 * Backend API Scopes (for your SaaS Factory API)
 * Updated to match the backend gateway configuration
 */
export const backendApiScopes = environment.apiScopes || [];

/**
 * Login Request Configuration
 * Include both Graph API and backend API scopes
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'], // Only request Graph API scopes initially
  prompt: 'select_account', // Always show account picker
  // Removed extraScopesToConsent to prevent "invalid_resource" error
};

/**
 * Silent Token Request Configuration
 */
export const silentRequest = {
  scopes: apiScopes,
  account: null as any,
};

/**
 * Backend Token Request Configuration
 */
export const backendTokenRequest = {
  scopes: backendApiScopes,
  account: null as any,
};

/**
 * Redirect Configuration
 */
export const redirectConfig = {
  redirectUri: window.location.origin,
  postLogoutRedirectUri: window.location.origin,
  loginRoute: '/login',
};

/**
 * Default Role Assignment Configuration
 */
export const defaultRoleAssignment = {
  defaultRole: 'User',
  adminRole: 'Platform_Admin',
  adminDomains: ['yourdomain.com', 'admin.com'], // Add your admin domains here
};

/**
 * Token Cache Configuration
 */
export const tokenCacheConfig = {
  cacheLocation: BrowserCacheLocation.LocalStorage,
  storeAuthStateInCookie: false,
  secureCookies: false,
};

/**
 * Graph API Configuration
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

/**
 * API Configuration for Gateway Service
 */
export const apiConfig = {
  uri: '/api/v2', // Route via current origin/proxy to YARP Gateway API
  version: 'v1',
  timeout: 30000,
};
