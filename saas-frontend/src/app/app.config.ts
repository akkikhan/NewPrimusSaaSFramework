import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { routes } from './app.routes';

import { 
  MsalService, 
  MsalGuard, 
  MsalBroadcastService, 
  MsalInterceptor, 
  MSAL_INSTANCE, 
  MSAL_GUARD_CONFIG, 
  MSAL_INTERCEPTOR_CONFIG 
} from '@azure/msal-angular';
import { 
  PublicClientApplication, 
  InteractionType
} from '@azure/msal-browser';
import { msalConfig, loginRequest, backendApiScopes } from './auth/msal-complete-config';
import { DualAuthService } from './core/services/dual-auth.service';
import { TokenExpirationService } from './core/services/token-expiration.service';
import { FixedAuthService } from './core/services/fixed-auth.service';

// Note: TenantAuthService is imported where needed, not globally

// ✅ MSAL instance singleton for platform authentication
let msalInstance: PublicClientApplication | null = null;

// ✅ Create MSAL instance with proper initialization
export function MSALInstanceFactory(): PublicClientApplication {
  if (!msalInstance) {
    // Platform Admin configuration (khan.aakib@outlook.com)
  const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '/';
    const config = {
      auth: {
        clientId: '5e65bf41-d3de-4a1b-9311-46b292b88c94', // Platform Admin app registration
        authority: 'https://login.microsoftonline.com/a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e', // Platform Admin tenant
        redirectUri: origin, // Use current origin to avoid port mismatches
        postLogoutRedirectUri: origin,
        navigateToLoginRequestUrl: true
      },
      cache: {
        cacheLocation: 'localStorage' as const,
        storeAuthStateInCookie: false
      },
      system: {
        loggerOptions: {
          loggerCallback: (level: any, message: string, containsPii: boolean) => {
            if (!containsPii) {
              console.log(`[MSAL] ${message}`);
            }
          },
          logLevel: 3,
          piiLoggingEnabled: false
        }
      }
    };
    
    msalInstance = new PublicClientApplication(config);
    console.log('✅ MSAL Instance created with Client ID:', config.auth.clientId);
  }
  return msalInstance;
}

// ✅ Initialize MSAL before app starts
export function initializeMsal(msalService: MsalService): () => Promise<void> {
  return async () => {
    console.log('🔄 [App Initializer] Starting MSAL initialization...');
    try {
      const instance = msalService.instance;
      
      // ✅ Initialize MSAL instance
      await instance.initialize();
      console.log('✅ [App Initializer] MSAL instance initialized');
      
      // DON'T handle redirect here - let app.component.ts do it
      console.log('ℹ️ [App Initializer] Redirect handling will be done by AppComponent');
      
      // ✅ Check for existing accounts and set the first one as active
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        // Set the first cached account as active to maintain authentication state
        instance.setActiveAccount(accounts[0]);
        console.log('✅ [App Initializer] Set active account from cache:', accounts[0].username);
      } else {
        console.log('ℹ️ [App Initializer] No cached accounts found');
      }
      
      console.log('✅ [App Initializer] MSAL initialization complete');
    } catch (error) {
      console.error('❌ [App Initializer] MSAL initialization failed:', error);
      // Don't throw - allow app to continue but auth won't work
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ MSAL Configuration for Platform Authentication
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        authRequest: loginRequest
      }
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        protectedResourceMap: new Map([
          // ✅ Microsoft Graph API
          ['https://graph.microsoft.com/v1.0/me', ['User.Read']],
          // ✅ All backend API calls go through the Angular proxy at current origin
          [((typeof window !== 'undefined' && window.location) ? window.location.origin : '/') + '/api', backendApiScopes]
        ])
      }
    },
    // ✅ MSAL Services for Platform Authentication
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    // ✅ Dual Authentication Service (Azure AD + Tenant Auth)
    DualAuthService,
    // ✅ Fixed Authentication Service (Improved Azure AD flow)
    FixedAuthService,
    // ✅ Token Expiration Service
    TokenExpirationService,
    // ✅ HTTP Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    // ✅ App Initializer - MSAL must be initialized before app starts
    {
      provide: APP_INITIALIZER,
      useFactory: initializeMsal,
      deps: [MsalService],
      multi: true
    },
    // ✅ Core App Configuration
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi())
  ]
};
