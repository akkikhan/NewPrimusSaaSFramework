import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TenantAdmin {
  id: string;
  email: string;
  tempPassword: string;
  tenantId: string;
  tenantName: string;
  role: 'TenantAdmin';
  mustChangePassword: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TenantAdminService {
  private tenantAdminsSubject = new BehaviorSubject<TenantAdmin[]>([
    // Pre-populated test tenant admins
    {
      id: 'admin-khan-akki',
      email: 'admin@khan-akki-jpr.com',
      tempPassword: 'TempKhan2024!',
      tenantId: 'khan-akki-jpr-20250805',
      tenantName: 'Khan Akki JPR',
      role: 'TenantAdmin',
      mustChangePassword: true,
      createdAt: new Date('2024-01-05')
    },
    {
      id: 'admin-contoso',
      email: 'admin@contoso.com',
      tempPassword: 'TempContoso2024!',
      tenantId: 'contoso-enterprises',
      tenantName: 'Contoso Enterprises',
      role: 'TenantAdmin',
      mustChangePassword: true,
      createdAt: new Date('2024-01-04')
    },
    {
      id: 'admin-fabrikam',
      email: 'admin@fabrikam.com',
      tempPassword: 'TempFabrikam2024!',
      tenantId: 'fabrikam-inc',
      tenantName: 'Fabrikam Inc',
      role: 'TenantAdmin',
      mustChangePassword: true,
      createdAt: new Date('2024-01-03')
    }
  ]);

  tenantAdmins$ = this.tenantAdminsSubject.asObservable();

  constructor() {
    // Load any stored tenant admins from session storage
    const stored = sessionStorage.getItem('tenantAdmins');
    if (stored) {
      try {
        const admins = JSON.parse(stored);
        this.tenantAdminsSubject.next([...this.tenantAdminsSubject.value, ...admins]);
      } catch (error) {
        console.error('Error loading stored tenant admins:', error);
      }
    }
  }

  /**
   * Add a new tenant admin (called during tenant onboarding)
   */
  addTenantAdmin(admin: TenantAdmin): void {
    const currentAdmins = this.tenantAdminsSubject.value;
    
    // Check if admin already exists
    const existingIndex = currentAdmins.findIndex(a => a.tenantId === admin.tenantId);
    
    if (existingIndex >= 0) {
      // Update existing
      currentAdmins[existingIndex] = admin;
    } else {
      // Add new
      currentAdmins.push(admin);
    }
    
    this.tenantAdminsSubject.next(currentAdmins);
    
    // Persist to session storage
    sessionStorage.setItem('tenantAdmins', JSON.stringify(currentAdmins));
    
    console.log('✅ [TenantAdminService] Tenant admin stored:', {
      email: admin.email,
      tenantId: admin.tenantId,
      tempPassword: admin.tempPassword
    });
  }

  /**
   * Get tenant admin by tenant ID
   */
  getTenantAdmin(tenantId: string): TenantAdmin | undefined {
    return this.tenantAdminsSubject.value.find(admin => admin.tenantId === tenantId);
  }

  /**
   * Validate tenant admin credentials
   */
  validateCredentials(email: string, password: string, tenantId: string): TenantAdmin | null {
    const admin = this.tenantAdminsSubject.value.find(a => 
      a.email === email && 
      a.tempPassword === password && 
      a.tenantId === tenantId
    );
    
    return admin || null;
  }

  /**
   * Update password (after first login)
   */
  updatePassword(tenantId: string, newPassword: string): void {
    const admins = this.tenantAdminsSubject.value;
    const admin = admins.find(a => a.tenantId === tenantId);
    
    if (admin) {
      admin.tempPassword = newPassword;
      admin.mustChangePassword = false;
      this.tenantAdminsSubject.next(admins);
      sessionStorage.setItem('tenantAdmins', JSON.stringify(admins));
    }
  }
}
