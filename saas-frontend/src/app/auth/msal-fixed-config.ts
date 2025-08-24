import { LogLevel, Configuration, BrowserCacheLocation } from '@azure/msal-browser';

/**
 * FIXED MSAL Configuration - Using new Azure AD app
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: '5e65bf41-d3de-4a1b-9311-46b292b88c94', // Platform Admin app registration
    authority: 'https://login.microsoftonline.com/khanaakiboutlook.onmicrosoft.com', // NEW TENANT
  redirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '/'),
  postLogoutRedirectUri: (typeof window !== 'undefined' && window.location ? window.location.origin : '/'),
    navigateToLoginRequestUrl: false,
    knownAuthorities: ['login.microsoftonline.com']
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
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
      logLevel: LogLevel.Verbose,
      piiLoggingEnabled: false
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0
  }
};

/**
 * Standard API Scopes for Microsoft Graph
 */
export const apiScopes = [
  'openid',
  'profile', 
  'email',
  'User.Read'
];

/**
 * Backend API Scopes - REMOVED to prevent invalid_resource error
 */
export const backendApiScopes: string[] = [];

/**
 * Login Request Configuration
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'], // Only Graph API scopes
  prompt: 'select_account'
};

/**
 * Silent Token Request Configuration
 */
export const silentRequest = {
  scopes: apiScopes,
  account: null as any
};

/**
 * Backend Token Request Configuration
 */
export const backendTokenRequest = {
  scopes: backendApiScopes,
  account: null as any
};

/**
 * Graph API Configuration
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me'
};
