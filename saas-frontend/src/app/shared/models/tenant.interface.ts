export interface Tenant {
  id: string;
  orgId: string;
  name: string;
  adminEmail: string;
  status: number;
  createdAt: string;
  authApiKey?: string;
  rbacApiKey?: string;
  
  // UI-specific properties
  tenantId?: string; // For backward compatibility
  domain?: string;
  idpType?: string;
  adminName?: string;
  plan?: string;
  subscriptionTier?: string;
  lastModified?: string;
  
  // UI state properties
  _showDropdown?: boolean;
}

export interface TenantListResponse {
  items: Tenant[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp?: string;
}

export interface TenantsApiResponse extends ApiResponse<TenantListResponse> {
  data: TenantListResponse;
}

// Status enum for better type safety
export enum TenantStatus {
  Inactive = 0,
  Active = 1,
  Suspended = 2,
  Pending = 3
}

// Helper function to convert status number to display string
export function getTenantStatusDisplay(status: number): string {
  switch (status) {
    case TenantStatus.Active:
      return 'Active';
    case TenantStatus.Inactive:
      return 'Inactive';
    case TenantStatus.Suspended:
      return 'Suspended';
    case TenantStatus.Pending:
      return 'Pending';
    default:
      return 'Unknown';
  }
}

// Helper function to get status CSS class
export function getTenantStatusClass(status: number): string {
  switch (status) {
    case TenantStatus.Active:
      return 'status-active';
    case TenantStatus.Inactive:
      return 'status-inactive';
    case TenantStatus.Suspended:
      return 'status-suspended';
    case TenantStatus.Pending:
      return 'status-pending';
    default:
      return 'status-unknown';
  }
}
