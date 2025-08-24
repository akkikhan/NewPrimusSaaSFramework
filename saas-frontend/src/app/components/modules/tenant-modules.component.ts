import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DialogService } from '../../shared/services/dialog.service';

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: 'active' | 'disabled' | 'error' | 'loading';
}

interface TenantInfo {
  id: string;
  name: string;
  tenantId: string;
}

@Component({
  selector: 'app-tenant-modules',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="tenant-modules-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Module Management</h1>
          <p>Configure which modules are enabled for each tenant</p>
        </div>
      </div>

      <!-- Tenant Selection -->
      <div class="tenant-selector-section">
        <div class="selector-card">
          <h3>Select Tenant</h3>
          <select [(ngModel)]="selectedTenantId" 
                  (change)="onTenantChange()" 
                  class="tenant-select"
                  [disabled]="loading">
            <option value="">Choose a tenant...</option>
            <option *ngFor="let tenant of tenants" [value]="tenant.tenantId">
              {{tenant.name}} ({{tenant.tenantId}})
            </option>
          </select>
          
          <div *ngIf="selectedTenant" class="selected-tenant-info">
            <h4>{{selectedTenant.name}}</h4>
            <p>Tenant ID: {{selectedTenant.tenantId}}</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading module configuration...</p>
      </div>

      <!-- Module Configuration -->
      <div *ngIf="!loading && selectedTenantId && modules.length > 0" class="modules-section">
        <div class="section-header">
          <h3>Available Modules</h3>
          <div class="module-summary">
            <span class="enabled-count">{{getEnabledModulesCount()}} enabled</span>
            <span class="total-count">{{modules.length}} total</span>
          </div>
        </div>

        <div class="modules-grid">
          <div *ngFor="let module of modules" class="module-card" [class]="'status-' + module.status">
            <div class="module-header">
              <div class="module-info">
                <h4>{{module.name}}</h4>
                <p>{{module.description}}</p>
              </div>
              
              <div class="module-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" 
                         [checked]="module.enabled"
                         [disabled]="module.status === 'loading'"
                         (change)="toggleModule(module.id, $event)">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="module-status">
              <span class="status-indicator" [class]="'status-' + module.status">
                <span *ngIf="module.status === 'active'">✅ Active</span>
                <span *ngIf="module.status === 'disabled'">🔴 Disabled</span>
                <span *ngIf="module.status === 'error'">❌ Error</span>
                <span *ngIf="module.status === 'loading'">⏳ Loading...</span>
              </span>
            </div>

            <div class="module-actions" *ngIf="module.enabled">
              <button class="btn-secondary btn-sm" (click)="testModule(module.id)">
                🧪 Test Access
              </button>
            </div>
          </div>
        </div>

        <!-- Save Changes -->
        <div class="save-section" *ngIf="hasChanges">
          <div class="changes-summary">
            <h4>Pending Changes</h4>
            <ul>
              <li *ngFor="let change of pendingChanges">
                {{change.moduleName}}: {{change.action}}
              </li>
            </ul>
          </div>
          
          <div class="save-actions">
            <button class="btn-secondary" (click)="resetChanges()">
              Cancel Changes
            </button>
            <button class="btn-primary" (click)="saveChanges()" [disabled]="saving">
              {{saving ? 'Saving...' : 'Apply Changes'}}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && selectedTenantId && modules.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No Modules Available</h3>
        <p>No modules are configured for this tenant.</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">❌</div>
        <h3>Error Loading Module Configuration</h3>
        <p>{{error}}</p>
        <button class="btn-primary" (click)="loadTenantModules()">🔄 Retry</button>
      </div>
    </div>
  `,
  styles: [`
    .tenant-modules-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      color: #002F87;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .page-header p {
      color: #666;
      margin: 0;
    }

    .tenant-selector-section {
      margin-bottom: 2rem;
    }

    .selector-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .selector-card h3 {
      color: #002F87;
      margin: 0 0 1rem 0;
    }

    .tenant-select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 1rem;
    }

    .selected-tenant-info {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #002F87;
    }

    .selected-tenant-info h4 {
      color: #002F87;
      margin: 0 0 0.5rem 0;
    }

    .selected-tenant-info p {
      color: #666;
      margin: 0;
      font-family: monospace;
    }

    .loading-container {
      text-align: center;
      padding: 3rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #002F87;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .modules-section {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .section-header h3 {
      color: #002F87;
      margin: 0;
    }

    .module-summary {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
    }

    .enabled-count {
      color: #28a745;
      font-weight: 500;
    }

    .total-count {
      color: #666;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .module-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .module-card.status-active {
      border-color: #28a745;
      background: linear-gradient(135deg, #ffffff 0%, #f8fff9 100%);
    }

    .module-card.status-disabled {
      border-color: #dc3545;
      background: linear-gradient(135deg, #ffffff 0%, #fff8f8 100%);
    }

    .module-card.status-loading {
      border-color: #007bff;
      background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .module-info h4 {
      color: #002F87;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .module-info p {
      color: #666;
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.4s;
      border-radius: 34px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background-color: #002F87;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(26px);
    }

    input:disabled + .toggle-slider {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .module-status {
      margin-bottom: 1rem;
    }

    .status-indicator {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-indicator.status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-indicator.status-disabled {
      background: #f8d7da;
      color: #721c24;
    }

    .status-indicator.status-error {
      background: #f8d7da;
      color: #721c24;
    }

    .status-indicator.status-loading {
      background: #d1ecf1;
      color: #0c5460;
    }

    .module-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }

    .btn-primary {
      background: #002F87;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-primary:hover:not(:disabled) {
      background: #001d5a;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #002F87;
      border: 1px solid #002F87;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .save-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #fff3cd;
      border-radius: 8px;
      border: 1px solid #ffeaa7;
    }

    .changes-summary h4 {
      color: #856404;
      margin: 0 0 1rem 0;
    }

    .changes-summary ul {
      margin: 0 0 1rem 0;
      padding-left: 1.5rem;
    }

    .changes-summary li {
      color: #856404;
      margin-bottom: 0.5rem;
    }

    .save-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .empty-state,
    .error-container {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .empty-icon,
    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .error-container {
      background: #fff5f5;
      border-color: #fed7d7;
    }

    .error-container h3 {
      color: #c53030;
      margin-bottom: 1rem;
    }

    .error-container p {
      color: #e53e3e;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 768px) {
      .modules-grid {
        grid-template-columns: 1fr;
      }
      
      .save-actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .module-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class TenantModulesComponent implements OnInit {
  loading = true;
  saving = false;
  error = '';
  selectedTenantId = '';
  tenants: TenantInfo[] = [];
  modules: ModuleInfo[] = [];
  originalModules: ModuleInfo[] = [];
  hasChanges = false;
  pendingChanges: Array<{moduleName: string, action: string}> = [];

  constructor(
    private apiService: ApiService,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    console.log('🔧 TenantModulesComponent initialized');
    this.loadTenants();
  }

  get selectedTenant(): TenantInfo | undefined {
    return this.tenants.find(t => t.tenantId === this.selectedTenantId);
  }

  loadTenants() {
    this.loading = true;
    this.error = '';
    
    console.log('🏢 Loading tenants for module management...');
    
    this.apiService.getTenants().subscribe({
      next: (response) => {
        console.log('📄 Received tenants:', response);
        
        // Handle different response formats
        let tenantsData = response;
        if (response && response.tenants) {
          // Our backend format: { tenants: [...], totalCount: X }
          tenantsData = response.tenants;
        } else if (response && response.items) {
          // Alternative format: { items: [...] }
          tenantsData = response.items;
        } else if (!Array.isArray(response)) {
          // If not an array and no recognized format, default to empty
          tenantsData = [];
        }
        
        this.tenants = tenantsData.map((tenant: any) => ({
          id: tenant.id || tenant.tenantId,
          name: tenant.name || tenant.companyName || tenant.tenantName || 'Unnamed Tenant',
          tenantId: tenant.id || tenant.tenantId  // Use id as tenantId for our backend
        }));
        
        console.log('🔧 Processed tenants for module management:', this.tenants);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading tenants:', error);
        this.error = this.apiService.handleError(error);
        this.loading = false;
      }
    });
  }

  onTenantChange() {
    if (this.selectedTenantId) {
      console.log('🔄 Tenant changed to:', this.selectedTenantId);
      this.loadTenantModules();
    } else {
      this.modules = [];
      this.originalModules = [];
      this.hasChanges = false;
      this.pendingChanges = [];
    }
  }

  loadTenantModules() {
    if (!this.selectedTenantId) return;
    
    this.loading = true;
    this.error = '';
    
    console.log('🔧 Loading modules for tenant:', this.selectedTenantId);
    
    // Load available modules and tenant configuration
    Promise.all([
      this.apiService.getAvailableModules().toPromise(),
      this.apiService.getTenantModules(this.selectedTenantId).toPromise()
    ]).then(([availableModules, tenantConfig]) => {
      console.log('📦 Available modules:', availableModules);
      console.log('⚙️ Tenant configuration:', tenantConfig);
      
      // Combine available modules with tenant configuration
      this.modules = (availableModules || []).map((module: any) => ({
        id: module.id,
        name: module.name,
        description: module.description,
        enabled: tenantConfig?.modules?.[module.id] === true,
        status: tenantConfig?.modules?.[module.id] === true ? 'active' : 'disabled'
      }));
      
      // Keep original state for change tracking
      this.originalModules = JSON.parse(JSON.stringify(this.modules));
      this.hasChanges = false;
      this.pendingChanges = [];
      
      console.log('🔧 Processed modules:', this.modules);
      this.loading = false;
    }).catch((error) => {
      console.error('❌ Error loading tenant modules:', error);
      this.error = this.apiService.handleError(error);
      this.loading = false;
    });
  }

  toggleModule(moduleId: string, event: any) {
    const module = this.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    const wasEnabled = module.enabled;
    module.enabled = event.target.checked;
    module.status = module.enabled ? 'active' : 'disabled';
    
    console.log(`🔄 Module ${moduleId} toggled: ${wasEnabled} -> ${module.enabled}`);
    
    this.updateChanges();
  }

  updateChanges() {
    this.pendingChanges = [];
    this.hasChanges = false;
    
    for (const module of this.modules) {
      const original = this.originalModules.find(m => m.id === module.id);
      if (original && original.enabled !== module.enabled) {
        this.hasChanges = true;
        this.pendingChanges.push({
          moduleName: module.name,
          action: module.enabled ? 'Enable' : 'Disable'
        });
      }
    }
    
    console.log('📝 Pending changes:', this.pendingChanges);
  }

  resetChanges() {
    console.log('🔄 Resetting changes...');
    this.modules = JSON.parse(JSON.stringify(this.originalModules));
    this.hasChanges = false;
    this.pendingChanges = [];
  }

  saveChanges() {
    if (!this.selectedTenantId || !this.hasChanges) return;
    
    this.saving = true;
    console.log('💾 Saving module changes for tenant:', this.selectedTenantId);
    
    // Build modules configuration object
    const modulesConfig: {[key: string]: boolean} = {};
    for (const module of this.modules) {
      modulesConfig[module.id] = module.enabled;
    }
    
    console.log('⚙️ New modules configuration:', modulesConfig);
    
    this.apiService.updateTenantModules(this.selectedTenantId, modulesConfig).subscribe({
      next: (response) => {
        console.log('✅ Modules updated successfully:', response);
        
        // Update original state
        this.originalModules = JSON.parse(JSON.stringify(this.modules));
        this.hasChanges = false;
        this.pendingChanges = [];
        this.saving = false;
        
        this.dialogService.success(
          'Module Configuration Updated',
          `Module configuration has been successfully updated for ${this.selectedTenant?.name}.`
        ).subscribe();
      },
      error: (error: any) => {
        console.error('❌ Error updating modules:', error);
        this.saving = false;
        
        this.dialogService.error(
          'Update Failed',
          `Failed to update module configuration: ${this.apiService.handleError(error)}`
        ).subscribe();
      }
    });
  }

  testModule(moduleId: string) {
    if (!this.selectedTenantId) return;
    
    console.log(`🧪 Testing module access: ${moduleId} for tenant ${this.selectedTenantId}`);
    
    this.apiService.checkModuleEnabled(this.selectedTenantId, moduleId).subscribe({
      next: (response) => {
        console.log('✅ Module test result:', response);
        
        const module = this.modules.find(m => m.id === moduleId);
        const moduleName = module?.name || moduleId;
        
        if (response.enabled) {
          this.dialogService.success(
            'Module Access Test',
            `✅ Module "${moduleName}" is accessible for this tenant.`
          ).subscribe();
        } else {
          this.dialogService.info(
            'Module Access Test',
            `⚠️ Module "${moduleName}" is currently disabled for this tenant.`
          ).subscribe();
        }
      },
      error: (error: any) => {
        console.error('❌ Error testing module:', error);
        this.dialogService.error(
          'Module Test Failed',
          `Failed to test module access: ${this.apiService.handleError(error)}`
        ).subscribe();
      }
    });
  }

  getEnabledModulesCount(): number {
    return this.modules.filter(m => m.enabled).length;
  }
}
