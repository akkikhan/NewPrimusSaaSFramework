import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../services/tenant.service';
import { TenantConfig } from '../../shared/models/tenant-config.interface';

@Component({
  selector: 'app-tenant-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenant-analytics" [attr.data-tenant]="tenantId">
      <header class="page-header">
        <h1>Analytics & Insights</h1>
        <p *ngIf="tenantConfig">{{ tenantConfig.companyName }} - Usage Analytics & Reports</p>
      </header>
      
      <div class="analytics-content">
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Users</h3>
            <div class="metric-value">--</div>
            <div class="metric-label">Total Active Users</div>
          </div>
          
          <div class="metric-card">
            <h3>Sessions</h3>
            <div class="metric-value">--</div>
            <div class="metric-label">This Month</div>
          </div>
          
          <div class="metric-card">
            <h3>API Calls</h3>
            <div class="metric-value">--</div>
            <div class="metric-label">Last 30 Days</div>
          </div>
          
          <div class="metric-card">
            <h3>Storage</h3>
            <div class="metric-value">--</div>
            <div class="metric-label">MB Used</div>
          </div>
        </div>
        
        <div class="analytics-placeholder">
          <h3>Advanced Analytics</h3>
          <p>This section will include:</p>
          <ul>
            <li>User activity and engagement metrics</li>
            <li>API usage and performance analytics</li>
            <li>Feature adoption and usage patterns</li>
            <li>Security and audit analytics</li>
            <li>Custom dashboards and reports</li>
            <li>Data export and visualization tools</li>
          </ul>
          <p><em>Analytics dashboard coming soon...</em></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-analytics {
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
    
    .analytics-content {
      display: grid;
      gap: 2rem;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .metric-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      transition: box-shadow 0.2s ease;
    }
    
    .metric-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .metric-card h3 {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 0.5rem;
    }
    
    .metric-label {
      color: #666;
      font-size: 0.9rem;
    }
    
    .analytics-placeholder {
      background: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
    }
    
    .analytics-placeholder h3 {
      color: #495057;
      margin-bottom: 1rem;
    }
    
    .analytics-placeholder ul {
      text-align: left;
      display: inline-block;
      margin: 1rem 0;
    }
    
    .analytics-placeholder li {
      margin: 0.5rem 0;
      color: #6c757d;
    }
  `]
})
export class TenantAnalyticsComponent implements OnInit {
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
