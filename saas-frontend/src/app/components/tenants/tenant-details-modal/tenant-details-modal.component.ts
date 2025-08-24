import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tenant-details-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="closeModal()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Tenant Details</h2>
          <button class="close-btn" (click)="closeModal()">×</button>
        </div>
        
        <div class="modal-content" *ngIf="tenant">
          <!-- Basic Information -->
          <div class="details-section">
            <h3>Basic Information</h3>
            <div class="details-grid">
              <div class="detail-item">
                <label>Name:</label>
                <span>{{tenant.name || tenant.companyName || 'Not specified'}}</span>
              </div>
              <div class="detail-item">
                <label>Tenant ID:</label>
                <span class="tenant-id">{{tenant.tenantId || tenant.id}}</span>
              </div>
              <div class="detail-item">
                <label>Domain:</label>
                <span>{{tenant.domain || 'Not configured'}}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge" [class]="'status-' + (tenant.status || 'active').toLowerCase()">
                  {{tenant.status || 'Active'}}
                </span>
              </div>
              <div class="detail-item">
                <label>Plan:</label>
                <span class="subscription-badge">{{tenant.plan || tenant.subscriptionTier || 'Basic'}}</span>
              </div>
              <div class="detail-item">
                <label>Environment:</label>
                <span>{{tenant.environment || 'production'}}</span>
              </div>
            </div>
          </div>

          <!-- Admin Information -->
          <div class="details-section">
            <h3>Administrator</h3>
            <div class="details-grid">
              <div class="detail-item">
                <label>Admin Name:</label>
                <span>{{getAdminName(tenant) || 'Not specified'}}</span>
              </div>
              <div class="detail-item">
                <label>Admin Email:</label>
                <span>{{tenant.adminEmail || 'Not specified'}}</span>
              </div>
              <div class="detail-item" *ngIf="tenant.adminFirstName">
                <label>First Name:</label>
                <span>{{tenant.adminFirstName}}</span>
              </div>
              <div class="detail-item" *ngIf="tenant.adminLastName">
                <label>Last Name:</label>
                <span>{{tenant.adminLastName}}</span>
              </div>
            </div>
          </div>

          <!-- Technical Information -->
          <div class="details-section">
            <h3>Technical Configuration</h3>
            <div class="details-grid">
              <div class="detail-item" *ngIf="tenant.azureAdTenantId">
                <label>Azure AD Tenant ID:</label>
                <span class="azure-id">{{tenant.azureAdTenantId}}</span>
              </div>
              <div class="detail-item">
                <label>IdP Type:</label>
                <span class="idp-badge">{{tenant.idpType || 'Not configured'}}</span>
              </div>
              <div class="detail-item" *ngIf="tenant.clientId">
                <label>Client ID:</label>
                <span class="client-id">{{tenant.clientId}}</span>
              </div>
              <div class="detail-item" *ngIf="tenant.authority">
                <label>Authority:</label>
                <span class="authority">{{tenant.authority}}</span>
              </div>
            </div>
          </div>

          <!-- Configuration Details -->
          <div class="details-section" *ngIf="tenant.configuration">
            <h3>Configuration Settings</h3>
            <div class="config-items">
              <div class="config-item" *ngIf="tenant.configuration.idpEnabled">
                <span class="config-label">IdP Enabled:</span>
                <span class="config-value enabled">✅ Yes</span>
              </div>
              <div class="config-item" *ngIf="tenant.configuration.directAuthentication">
                <span class="config-label">Direct Authentication:</span>
                <span class="config-value enabled">✅ Yes</span>
              </div>
              <div class="config-item" *ngIf="tenant.configuration.provider">
                <span class="config-label">Provider:</span>
                <span class="config-value">{{tenant.configuration.provider}}</span>
              </div>
              <div class="config-item" *ngIf="tenant.configuration.ssoEnabled">
                <span class="config-label">SSO Enabled:</span>
                <span class="config-value enabled">✅ Yes</span>
              </div>
            </div>
          </div>

          <!-- Timestamps -->
          <div class="details-section">
            <h3>Timeline</h3>
            <div class="details-grid">
              <div class="detail-item">
                <label>Created:</label>
                <span>{{formatDate(tenant.createdAt)}}</span>
              </div>
              <div class="detail-item" *ngIf="tenant.lastModified">
                <label>Last Modified:</label>
                <span>{{formatDate(tenant.lastModified)}}</span>
              </div>
              <div class="detail-item" *ngIf="tenant.lastLogin">
                <label>Last Login:</label>
                <span>{{formatDate(tenant.lastLogin)}}</span>
              </div>
            </div>
          </div>

          <!-- Raw Data (Debug) -->
          <div class="details-section" *ngIf="showRawData">
            <h3>Raw Data <button class="toggle-btn" (click)="showRawData = false">Hide</button></h3>
            <pre class="raw-data">{{tenant | json}}</pre>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" (click)="showRawData = !showRawData">
            {{showRawData ? 'Hide' : 'Show'}} Raw Data
          </button>
          <button class="btn-primary" (click)="closeModal()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      background: white;
      border-radius: 12px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    }

    .modal-header h2 {
      color: #002F87;
      margin: 0;
      font-size: 1.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 2rem;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #e9ecef;
      color: #333;
    }

    .modal-content {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .details-section {
      margin-bottom: 2rem;
    }

    .details-section:last-child {
      margin-bottom: 0;
    }

    .details-section h3 {
      color: #002F87;
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item label {
      font-weight: 600;
      color: #333;
      font-size: 0.9rem;
    }

    .detail-item span {
      color: #666;
      word-break: break-word;
    }

    .tenant-id {
      font-family: monospace;
      background: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      display: inline-block;
    }

    .azure-id,
    .client-id {
      font-family: monospace;
      font-size: 0.85rem;
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }

    .authority {
      font-family: monospace;
      font-size: 0.85rem;
      word-break: break-all;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      display: inline-block;
      width: fit-content;
    }

    .status-active {
      background: #e8f5e8;
      color: #007935;
    }

    .status-inactive {
      background: #ffebee;
      color: #c62828;
    }

    .status-suspended {
      background: #fff3e0;
      color: #F2A900;
    }

    .subscription-badge {
      background: #f3e5f5;
      color: #7b1fa2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      display: inline-block;
      width: fit-content;
    }

    .idp-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      display: inline-block;
      width: fit-content;
    }

    .config-items {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 0.75rem;
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }

    .config-label {
      font-weight: 500;
      color: #333;
    }

    .config-value {
      color: #666;
    }

    .config-value.enabled {
      color: #28a745;
      font-weight: 500;
    }

    .raw-data {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 1rem;
      font-size: 0.8rem;
      overflow-x: auto;
      max-height: 300px;
      white-space: pre-wrap;
    }

    .modal-footer {
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      background: #f8f9fa;
    }

    .btn-primary {
      background: #002F87;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }

    .btn-primary:hover {
      background: #001d5a;
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #002F87;
      border: 1px solid #002F87;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .toggle-btn {
      background: none;
      border: none;
      color: #007bff;
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: underline;
    }

    .toggle-btn:hover {
      color: #0056b3;
    }

    @media (max-width: 768px) {
      .modal-container {
        width: 95%;
        margin: 1rem;
      }
      
      .details-grid {
        grid-template-columns: 1fr;
      }
      
      .config-items {
        grid-template-columns: 1fr;
      }
      
      .modal-footer {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class TenantDetailsModalComponent implements OnInit {
  @Input() tenant: any = null;
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();

  showRawData = false;

  ngOnInit() {
    // Handle escape key
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  private handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isVisible) {
      this.closeModal();
    }
  }

  closeModal() {
    this.isVisible = false;
    this.showRawData = false;
    this.close.emit();
  }

  getAdminName(tenant: any): string {
    if (tenant.adminName) return tenant.adminName;
    
    const firstName = tenant.adminFirstName || '';
    const lastName = tenant.adminLastName || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }
}
