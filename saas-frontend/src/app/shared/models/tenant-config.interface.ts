export interface TenantConfig {
  tenantId: string;
  companyName: string;
  domain: string;
  status: string;
  azureAd: {
    tenantId: string;
    clientId: string;
    domain: string;
    authority?: string;
  };
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
    companyLogo?: string;
  };
  features?: {
    [key: string]: boolean;
  };
  settings?: {
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantAuthConfig {
  tenantId: string;
  clientId: string;
  authority: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  apiScopes?: string[];
}

export interface TenantContextState {
  isLoaded: boolean;
  isAuthenticated: boolean;
  tenantConfig: TenantConfig | null;
  authConfig: TenantAuthConfig | null;
  error: string | null;
}
