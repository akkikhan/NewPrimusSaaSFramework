// Mock user database for development
export interface MockUser {
  email: string;
  password: string;
  role: 'Platform_Admin' | 'Tenant_Admin' | 'Tenant_User';
  tenantId?: string;
  tenantName?: string;
  name: string;
  id: string;
}

export const MOCK_USERS: MockUser[] = [
  // Platform Admin Users
  {
    id: 'platform-admin-1',
    email: 'admin@saasfactory.com',
    password: 'Admin123!',
    role: 'Platform_Admin',
    name: 'Platform Administrator',
    tenantId: undefined,
    tenantName: undefined
  },
  {
    id: 'platform-admin-2', 
    email: 'superadmin@saasfactory.com',
    password: 'SuperAdmin123!',
    role: 'Platform_Admin',
    name: 'Super Administrator',
    tenantId: undefined,
    tenantName: undefined
  },
  
  // Tenant Admin Users
  {
    id: 'tenant-admin-khan',
    email: 'khan.akki.jpr@outlook.com',
    password: 'TenantAdmin123!', // Temporary password for testing
    role: 'Tenant_Admin',
    name: 'Khan Akki',
    tenantId: 'khan-akki-jpr-20250805',
    tenantName: 'Khan Akki JPR'
  },
  {
    id: 'tenant-admin-1',
    email: 'admin@tenant.com',
    password: 'Admin123!',
    role: 'Tenant_Admin',
    name: 'Tenant Administrator',
    tenantId: 'default-tenant',
    tenantName: 'Default Tenant'
  },
  {
    id: 'tenant-admin-contoso',
    email: 'admin@contoso.com',
    password: 'ContosoAdmin123!',
    role: 'Tenant_Admin',
    name: 'Contoso Admin',
    tenantId: 'contoso-enterprises',
    tenantName: 'Contoso Enterprises'
  },
  
  // Tenant Users
  {
    id: 'tenant-user-1',
    email: 'user@contoso.com',
    password: 'User123!',
    role: 'Tenant_User',
    name: 'John User',
    tenantId: 'contoso-enterprises',
    tenantName: 'Contoso Enterprises'
  }
];

// Helper function to validate credentials
export function validateMockCredentials(email: string, password: string): MockUser | null {
  const user = MOCK_USERS.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.password === password
  );
  return user || null;
}

// Helper function to generate mock JWT token
export function generateMockToken(user: MockUser): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000),
    iss: 'saasfactory-mock'
  };
  
  // Simple encoding (not secure, just for mock)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa('mock-signature');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
