import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../services/tenant.service';
import { TenantConfig } from '../../shared/models/tenant-config.interface';

@Component({
  selector: 'app-tenant-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenant-settings" [attr.data-tenant]="tenantId">
      <header class="page-header">
        <h1>Tenant Settings</h1>
        <p *ngIf="tenantConfig">{{ tenantConfig.companyName }} - Configuration & Settings</p>
      </header>
      
      <div class="settings-content">
        <div class="tenant-info-card" *ngIf="tenantConfig">
          <h3>Tenant Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Tenant ID:</label>
              <span>{{ tenantConfig.tenantId }}</span>
            </div>
            <div class="info-item">
              <label>Company Name:</label>
              <span>{{ tenantConfig.companyName }}</span>
            </div>
            <div class="info-item">
              <label>Domain:</label>
              <span>{{ tenantConfig.domain || 'Not configured' }}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="status" [class]="tenantConfig.status">{{ tenantConfig.status }}</span>
            </div>
            <div class="info-item">
              <label>Azure AD Tenant:</label>
              <span>{{ tenantConfig.azureAd.domain }}</span>
            </div>
            <div class="info-item">
              <label>Client ID:</label>
              <span class="mono">{{ tenantConfig.azureAd.clientId }}</span>
            </div>
          </div>
        </div>
        
        <div class="settings-placeholder">
          <h3>Additional Settings</h3>
          <p>This section will include:</p>
          <ul>
            <li>Tenant branding customization</li>
            <li>Feature toggles and permissions</li>
            <li>Integration settings</li>
            <li>Security and compliance settings</li>
            <li>Notification preferences</li>
          </ul>
          <p><em>Coming soon...</em></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-settings {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 1rem;
    }
    
    .page-header h1 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    
    .page-header p {
      margin: 0;
      color: #666;
    }
    
    .settings-content {
      display: grid;
      gap: 2rem;
    }
    
    .tenant-info-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
    }
    
    .tenant-info-card h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .info-item label {
      font-weight: 600;
      color: #555;
      font-size: 0.9rem;
    }
    
    .info-item span {
      color: #333;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 4px;
      word-break: break-all;
    }
    
    .info-item .mono {
      font-family: monospace;
      font-size: 0.9rem;
    }
    
    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem !important;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status.active {
      background: #d4edda !important;
      color: #155724 !important;
    }
    
    .status.inactive {
      background: #f8d7da !important;
      color: #721c24 !important;
    }
    
    .settings-placeholder {
      background: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
    }
    
    .settings-placeholder h3 {
      color: #495057;
      margin-bottom: 1rem;
    }
    
    .settings-placeholder ul {
      text-align: left;
      display: inline-block;
      margin: 1rem 0;
    }
    
    .settings-placeholder li {
      margin: 0.5rem 0;
      color: #6c757d;
    }
  `]
})
export class TenantSettingsComponent implements OnInit {
  tenantId: string | null = null;
  tenantConfig: TenantConfig | null = null;

  constructor(
    private route: ActivatedRoute,
    private tenantService: TenantService
  ) {}

  async ngOnInit(): Promise<void> {
    this.tenantId = this.route.snapshot.params['tenantId'];
    
    if (this.tenantId) {
      try {
        this.tenantConfig = await this.tenantService.loadTenantConfig(this.tenantId);
      } catch (error) {
        console.error('Failed to load tenant config:', error);
      }
    }
  }
}
