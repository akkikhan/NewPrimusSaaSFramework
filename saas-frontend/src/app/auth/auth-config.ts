import { LogLevel, Configuration, BrowserCacheLocation } from '@azure/msal-browser';
import { environment } from '../../environments/environment';

/**
 * Azure AD Authentication Configuration for SPA
 * Uses environment-specific settings
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: environment.msalConfig.auth.clientId, // 🔄 Your SPA Client ID
    authority: environment.msalConfig.auth.authority, // ✅ Your tenant authority
    redirectUri: environment.msalConfig.auth.redirectUri,
    postLogoutRedirectUri: environment.msalConfig.auth.postLogoutRedirectUri,
    navigateToLoginRequestUrl: environment.msalConfig.auth.navigateToLoginRequestUrl
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
    storeAuthStateInCookie: false, // Set to true for IE 11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel: LogLevel, message: string) {
        if (environment.features.enableDebugLogs) {
          console.log(message);
        }
      },
      logLevel: environment.msalConfig.system.loggerOptions.logLevel as LogLevel,
      piiLoggingEnabled: environment.msalConfig.system.loggerOptions.piiLoggingEnabled
    }
  }
};

/**
 * Scopes for API access - Backend-specific scopes for proper token audience
 */
export const apiConfig = {
  scopes: [
    'api://4b179a1d-ae0b-4b55-9c80-212124e6f944/access_as_user', // Backend API scope - CORRECTED
    'profile',                                                     // OpenID Connect - Profile info
    'email',                                                       // OpenID Connect - Email
    'openid'                                                       // OpenID Connect - Basic identity
  ],
  uri: '/api' // ✅ Routed via Angular proxy to YARP Gateway endpoint
};

/**
 * Login request configuration - Using backend API scopes
 */
export const loginRequest = {
  scopes: [
    'api://4b179a1d-ae0b-4b55-9c80-212124e6f944/access_as_user',
    'profile', 
    'email',
    'openid'
  ]
};

/**
 * Silent token request configuration - Using backend API scopes
 */
export const silentRequest = {
  scopes: [
    'api://4b179a1d-ae0b-4b55-9c80-212124e6f944/access_as_user',
    'profile',
    'email',
    'openid'
  ],
  account: null as any
};

/**
 * Graph API configuration
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};

/**
 * User roles configuration
 */
export enum UserRole {
  PLATFORM_ADMIN = 'Platform_Admin',
  TEAM_MEMBER = 'Team_Member'
}

/**
 * Role-based permissions mapping
 */
export const rolePermissions = {
  [UserRole.PLATFORM_ADMIN]: [
    'users.read', 'users.create', 'users.update', 'users.delete',
    'tenants.read', 'tenants.onboard', 'tenants.update', 'tenants.delete',
    'roles.read', 'roles.create', 'roles.update', 'roles.delete',
    'analytics.read', 'system.manage', 'modules.read', 'modules.publish'
  ],
  [UserRole.TEAM_MEMBER]: [
    'users.read', 'users.update', // Within their tenant only
    'tenants.read', 'tenants.update', // Their own tenant only
    'modules.read', 'modules.integrate', 'notifications.read'
  ]
}; 