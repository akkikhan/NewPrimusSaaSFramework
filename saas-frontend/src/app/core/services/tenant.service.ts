import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = `${environment.apiUrl}/api/tenants`;

  constructor(private http: HttpClient) {}

  getTenantById(tenantId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${tenantId}`);
  }

  getTenantStats(tenantId: string): Observable<any> {
    // Mock stats for now
    return of({
      totalUsers: 25,
      activeUsers: 18,
      totalIntegrations: 3,
      activeIntegrations: 2,
      lastSync: new Date().toISOString(),
      storageUsed: '2.5 GB',
      apiCalls: 1500,
      errorRate: 0.02
    });
  }

  updateTenant(tenantId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${tenantId}`, data);
  }

  getTenantConfiguration(tenantId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${tenantId}/configuration`);
  }
}
