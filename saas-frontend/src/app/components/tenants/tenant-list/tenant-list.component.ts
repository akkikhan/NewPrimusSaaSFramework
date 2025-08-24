import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { SharedEventsService } from '../../../shared/services/events.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { TenantDetailsModalComponent } from '../tenant-details-modal/tenant-details-modal.component';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TenantDetailsModalComponent],
  template: `
    <div class="tenant-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Tenant Management</h1>
          <p>Manage multi-tenant organizations and their settings</p>
        </div>
        <div class="header-actions">
          <!-- Admin-only CTA; route guard enforces platformAdmin -->
          <button class="btn-primary" routerLink="/tenants/onboard">
            🚀 Onboard Tenant via IdP
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-bar">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="onSearch()"
            placeholder="Search tenants by name, domain, or email..."
            class="search-input">
          <button class="search-btn" (click)="loadTenants()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading tenants...</p>
      </div>

      <!-- Tenants Table -->
      <div *ngIf="!loading && !error" class="tenants-table-container">
        <table class="tenants-table">
          <thead>
            <tr>
              <th class="sortable" (click)="sortBy('name')">
                Tenant Name 
                <span class="sort-icon" [class]="getSortClass('name')">⇅</span>
              </th>
              <th>Domain</th>
              <th>Admin</th>
              <th class="sortable" (click)="sortBy('status')">
                Status
                <span class="sort-icon" [class]="getSortClass('status')">⇅</span>
              </th>
              <th>Plan</th>
              <th class="sortable" (click)="sortBy('createdAt')">
                Created
                <span class="sort-icon" [class]="getSortClass('createdAt')">⇅</span>
              </th>
              <th class="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tenant of tenants" class="tenant-row">
              <td class="tenant-name-cell">
                <div class="tenant-name-info">
                  <h4>{{getTenantName(tenant)}}</h4>
                  <span class="tenant-id">{{tenant.tenantId || tenant.id}}</span>
                </div>
              </td>
              <td class="domain-cell">
                <span class="domain-text">{{tenant.domain || 'Not configured'}}</span>
                <span *ngIf="tenant.idpType" class="idp-badge">{{tenant.idpType}}</span>
              </td>
              <td class="admin-cell">
                <div class="admin-info">
                  <div class="admin-name">{{tenant.adminName || getAdminName(tenant) || 'Not specified'}}</div>
                  <div class="admin-email">{{tenant.adminEmail || 'No email'}}</div>
                </div>
              </td>
              <td class="status-cell">
                <span class="status-badge" [class]="'status-' + (tenant.status || 'active').toLowerCase()">
                  {{tenant.status || 'Active'}}
                </span>
              </td>
              <td class="plan-cell">
                <span class="subscription-badge">{{tenant.plan || tenant.subscriptionTier || 'Basic'}}</span>
              </td>
              <td class="date-cell">
                <div class="date-info">
                  <div class="created-date">{{formatDate(tenant.createdAt)}}</div>
                  <div *ngIf="tenant.lastModified" class="modified-date">
                    Updated: {{formatDateShort(tenant.lastModified)}}
                  </div>
                </div>
              </td>
              <td class="actions-cell">
                <div class="tenant-actions">
                  <button class="action-btn btn-view" (click)="viewTenant(tenant)" title="View Details">
                    <span class="btn-icon">👁️</span>
                    <span class="btn-text">View</span>
                  </button>
                  <button class="action-btn btn-modules" (click)="manageModules(tenant)" title="Manage Modules">
                    <span class="btn-icon">⚙️</span>
                    <span class="btn-text">Modules</span>
                  </button>
                  <button class="action-btn btn-edit" (click)="editTenant(tenant)" title="Edit Tenant">
                    <span class="btn-icon">✏️</span>
                    <span class="btn-text">Edit</span>
                  </button>
                  <div class="action-dropdown">
                    <button class="action-btn btn-more" (click)="toggleDropdown(tenant)" title="More Actions">
                      <span class="btn-icon">⋯</span>
                    </button>
                    <div class="dropdown-menu" [class.show]="tenant._showDropdown">
                      <button class="dropdown-item" (click)="duplicateTenant(tenant)">
                        📋 Duplicate
                      </button>
                      <button class="dropdown-item" (click)="downloadConfig(tenant)">
                        📥 Export Config
                      </button>
                      <button class="dropdown-item" (click)="viewAuditLog(tenant)">
                        📊 Audit Log
                      </button>
                      <hr class="dropdown-divider">
                      <button class="dropdown-item btn-danger" (click)="deleteTenant(tenant)">
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div *ngIf="tenants.length === 0" class="empty-state">
          <div class="empty-icon">🏢</div>
          <h3>No Tenants Found</h3>
          <p>{{searchTerm ? 'No tenants match your search criteria.' : 'Onboard your first tenant to get started.'}}</p>
          <!-- Admin-only CTA; route guard enforces platformAdmin -->
          <button class="btn-primary" routerLink="/tenants/onboard">🎉 Onboard Tenant</button>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div *ngIf="!loading && !error && totalPages > 1" class="pagination-container">
        <div class="pagination-info">
          <span>Showing {{((currentPage - 1) * pageSize) + 1}} to {{Math.min(currentPage * pageSize, totalCount)}} of {{totalCount}} tenants</span>
        </div>
        <div class="pagination-controls">
          <button 
            class="pagination-btn" 
            [disabled]="!hasPreviousPage" 
            (click)="goToFirstPage()">
            ⏮️ First
          </button>
          <button 
            class="pagination-btn" 
            [disabled]="!hasPreviousPage" 
            (click)="goToPreviousPage()">
            ◀️ Previous
          </button>
          
          <div class="page-numbers">
            <span *ngFor="let page of getPageNumbers()" 
                  class="page-number" 
                  [class.active]="page === currentPage"
                  [class.ellipsis]="page === '...'"
                  (click)="onPageClick(page)">
              {{page}}
            </span>
          </div>
          
          <button 
            class="pagination-btn" 
            [disabled]="!hasNextPage" 
            (click)="goToNextPage()">
            Next ▶️
          </button>
          <button 
            class="pagination-btn" 
            [disabled]="!hasNextPage" 
            (click)="goToLastPage()">
            Last ⏭️
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">❌</div>
        <h3>Error Loading Tenants</h3>
        <p>{{error}}</p>
        <button class="btn-primary" (click)="loadTenants()">🔄 Retry</button>
      </div>
      
      <!-- Tenant Details Modal -->
      <app-tenant-details-modal 
        [tenant]="selectedTenant" 
        [isVisible]="showDetailsModal"
        (close)="closeDetailsModal()">
      </app-tenant-details-modal>
    </div>
  `,
  styles: [`
    .tenant-list-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header-content h1 {
      color: #002F87;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .header-content p {
      color: #333333;
      margin: 0;
    }

    .btn-primary {
      background: #002F87;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary:hover {
      background: #001d5a;
    }

    .search-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      margin-bottom: 2rem;
    }

    .search-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .search-btn {
      background: #002F87;
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .search-btn:hover {
      background: #001d5a;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
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

    .tenants-table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .tenants-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .tenants-table thead {
      background: #f8f9fa;
      border-bottom: 2px solid #e0e0e0;
    }

    .tenants-table th {
      padding: 1rem 0.75rem;
      text-align: left;
      font-weight: 600;
      color: #002F87;
      border-right: 1px solid #e0e0e0;
      position: relative;
    }

    .tenants-table th:last-child {
      border-right: none;
    }

    .tenants-table th.sortable {
      cursor: pointer;
      user-select: none;
    }

    .tenants-table th.sortable:hover {
      background: #e9ecef;
    }

    .sort-icon {
      margin-left: 0.5rem;
      opacity: 0.5;
      font-size: 0.8rem;
    }

    .sort-icon.sort-asc {
      opacity: 1;
      color: #002F87;
    }

    .sort-icon.sort-desc {
      opacity: 1;
      color: #002F87;
      transform: rotate(180deg);
    }

    .tenant-row {
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s ease;
    }

    .tenant-row:hover {
      background: #f8f9fa;
    }

    .tenant-row:last-child {
      border-bottom: none;
    }

    .tenants-table td {
      padding: 1rem 0.75rem;
      border-right: 1px solid #f0f0f0;
      vertical-align: top;
    }

    .tenants-table td:last-child {
      border-right: none;
    }

    .tenant-name-cell {
      min-width: 200px;
    }

    .tenant-name-info h4 {
      color: #002F87;
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .tenant-id {
      color: #666;
      font-size: 0.8rem;
      font-family: monospace;
      background: #f8f9fa;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      display: inline-block;
    }

    .domain-cell {
      min-width: 180px;
    }

    .domain-text {
      display: block;
      color: #333;
      margin-bottom: 0.25rem;
      word-break: break-word;
    }

    .admin-cell {
      min-width: 160px;
    }

    .admin-info {
      line-height: 1.4;
    }

    .admin-name {
      color: #333;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .admin-email {
      color: #666;
      font-size: 0.85rem;
      word-break: break-word;
    }

    .status-cell {
      text-align: center;
      min-width: 100px;
    }

    .plan-cell {
      text-align: center;
      min-width: 100px;
    }

    .date-cell {
      min-width: 120px;
    }

    .date-info {
      line-height: 1.4;
    }

    .created-date {
      color: #333;
      font-size: 0.9rem;
    }

    .modified-date {
      color: #666;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    .actions-cell {
      min-width: 200px;
      text-align: center;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
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

    .tenant-details {
      margin-bottom: 1rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      font-size: 0.9rem;
    }

    .detail-row label {
      color: #666;
      font-weight: 500;
    }

    .detail-row span {
      color: #333;
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }

    .idp-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .subscription-badge {
      background: #f3e5f5;
      color: #7b1fa2;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .azure-id {
      font-family: monospace;
      font-size: 0.8rem;
      color: #1976d2;
    }

    .config-section {
      margin: 1rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .config-section h4 {
      margin: 0 0 0.5rem 0;
      color: #002F87;
      font-size: 0.95rem;
    }

    .config-items {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .config-item {
      background: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      border: 1px solid #e0e0e0;
    }

    .tenant-actions {
      display: flex;
      gap: 0.375rem;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      color: #333;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .action-btn .btn-icon {
      font-size: 0.9rem;
    }

    .action-btn .btn-text {
      font-weight: 500;
    }

    .btn-view {
      border-color: #007bff;
      color: #007bff;
    }

    .btn-view:hover {
      background: #007bff;
      color: white;
    }

    .btn-modules {
      border-color: #28a745;
      color: #28a745;
    }

    .btn-modules:hover {
      background: #28a745;
      color: white;
    }

    .btn-edit {
      border-color: #ffc107;
      color: #856404;
    }

    .btn-edit:hover {
      background: #ffc107;
      color: #212529;
    }

    .btn-more {
      border-color: #6c757d;
      color: #6c757d;
      padding: 0.5rem;
      min-width: 36px;
      justify-content: center;
    }

    .btn-more:hover {
      background: #6c757d;
      color: white;
    }

    .action-dropdown {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
    }

    .dropdown-menu.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-item {
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      background: none;
      text-align: left;
      color: #333;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dropdown-item:hover {
      background: #f8f9fa;
    }

    .dropdown-item.btn-danger {
      color: #dc3545;
    }

    .dropdown-item.btn-danger:hover {
      background: #dc3545;
      color: white;
    }

    .dropdown-divider {
      margin: 0.5rem 0;
      border: none;
      border-top: 1px solid #e9ecef;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .error-container {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem;
      background: #ffebee;
      border-radius: 12px;
      border: 1px solid #ffcdd2;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-container h3 {
      color: #c62828;
      margin-bottom: 1rem;
    }

    .error-container p {
      color: #d32f2f;
      margin-bottom: 1.5rem;
    }

    .pagination-container {
      margin-top: 2rem;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pagination-info {
      color: #666;
      font-size: 0.9rem;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pagination-btn {
      background: white;
      border: 1px solid #ddd;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s ease;
    }

    .pagination-btn:hover:not(:disabled) {
      background: #f5f5f5;
      border-color: #002F87;
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-numbers {
      display: flex;
      gap: 0.25rem;
      margin: 0 0.5rem;
    }

    .page-number {
      padding: 0.5rem 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      background: white;
      transition: all 0.2s ease;
    }

    .page-number:hover:not(.ellipsis) {
      background: #f5f5f5;
      border-color: #002F87;
    }

    .page-number.active {
      background: #002F87;
      color: white;
      border-color: #002F87;
    }

    .page-number.ellipsis {
      cursor: default;
      border: none;
      background: transparent;
    }

    @media (max-width: 768px) {
      .tenants-grid {
        grid-template-columns: 1fr;
      }
      
      .pagination-container {
        flex-direction: column;
        align-items: stretch;
      }
      
      .pagination-controls {
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .page-numbers {
        order: -1;
        justify-content: center;
        margin: 0.5rem 0;
      }
    }
  `]
})
export class TenantListComponent implements OnInit {
  loading = true;
  error = '';
  searchTerm = '';
  statusFilter = '';
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  totalCount = 0;
  hasNextPage = false;
  hasPreviousPage = false;
  
  // Expose Math for template
  Math = Math;

  tenants: any[] = [];
  
  // Sorting state
  sortField = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Modal state
  showDetailsModal = false;
  selectedTenant: any = null;

  constructor(
    private apiService: ApiService,
    private dialogService: DialogService,
    private router: Router,
    private events: SharedEventsService
  ) {
    // Initialize tenants as empty array
    this.tenants = [];
  }

  ngOnInit() {
    this.loadTenants();
    
    // Refresh when a new tenant is onboarded
    this.events.onboardingComplete$().subscribe({
      next: () => this.loadTenants()
    });
  }



  loadTenants() {
    this.loading = true;
    this.error = '';
    
    // Call the API to get tenants
    this.apiService.getTenants(this.currentPage, this.pageSize, this.searchTerm, this.statusFilter).subscribe({
      next: (response) => {
        console.log('📄 Received tenant data:', response);
        console.log('📄 Response type:', typeof response);
        console.log('📄 Response keys:', response ? Object.keys(response) : 'null');
        console.log('📄 Is Array:', Array.isArray(response));
        
        // Handle the API response - check if it's wrapped in an object or direct array
        if (Array.isArray(response)) {
          // Direct array format - this is what our API returns
          console.log('✅ Processing direct array response with', response.length, 'tenants');
          this.tenants = [...response]; // Create new array reference for change detection
          this.totalCount = response.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          
          // Note: Our API already handles pagination server-side, so we don't slice here
          this.hasNextPage = response.length === this.pageSize; // Assume more if we got a full page
          this.hasPreviousPage = this.currentPage > 1;
          
          console.log('✅ Tenants array set with', this.tenants.length, 'items');
        } else if (response && response.items && Array.isArray(response.items)) {
          // New paginated format with items property
          console.log('✅ Processing items format with', response.items.length, 'tenants');
          this.tenants = [...response.items];
          this.totalCount = response.totalItems || response.totalCount || response.items.length;
          this.totalPages = response.totalPages || Math.ceil(this.totalCount / this.pageSize);
          this.hasNextPage = response.hasNextPage || false;
          this.hasPreviousPage = response.hasPreviousPage || false;
        } else if (response && response.tenants && Array.isArray(response.tenants)) {
          // AgentOrchestrator format with tenants property
          console.log('✅ Processing tenants format with', response.tenants.length, 'tenants');
          this.tenants = [...response.tenants];
          this.totalCount = response.totalCount || response.tenants.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          this.hasNextPage = response.tenants.length === this.pageSize;
          this.hasPreviousPage = this.currentPage > 1;
        } else {
          console.warn('⚠️ Unexpected response format:', response);
          console.log('⚠️ Response structure:', JSON.stringify(response, null, 2));
          this.tenants = [];
          this.totalCount = 0;
        }
        
        // Ensure tenants is always an array
        if (!Array.isArray(this.tenants)) {
          console.error('❌ tenants is not an array!', this.tenants);
          this.tenants = [];
        }
        
        console.log('📊 Processed tenant data:', {
          tenantsCount: this.tenants.length,
          totalCount: this.totalCount,
          currentPage: this.currentPage,
          totalPages: this.totalPages,
          firstTenant: this.tenants[0],
          allTenants: this.tenants
        });
        
        // Force change detection to ensure UI updates
        this.loading = false;
        
        // Additional debugging
        setTimeout(() => {
          console.log('🔍 Final state check:', {
            loading: this.loading,
            error: this.error,
            tenantsLength: this.tenants.length,
            isTenantsArray: Array.isArray(this.tenants)
          });
        }, 100);
      },
      error: (error: any) => {
        console.error('❌ Error loading tenants:', error);
        this.error = error?.message || 'Failed to load tenants';
        this.loading = false;
      }
    });
  }

  getTenantName(tenant: any): string {
    // Try different property names for tenant name
    return tenant.companyName || 
           tenant.tenantName || 
           tenant.name || 
           tenant.tenantId || 
           tenant.id || 
           'Unnamed Tenant';
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  onSearch() {
    this.currentPage = 1;
    this.loadTenants();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadTenants();
  }

  // Pagination methods
  goToFirstPage() {
    if (this.hasPreviousPage) {
      this.currentPage = 1;
      this.loadTenants();
    }
  }

  goToPreviousPage() {
    if (this.hasPreviousPage) {
      this.currentPage--;
      this.loadTenants();
    }
  }

  goToNextPage() {
    if (this.hasNextPage) {
      this.currentPage++;
      this.loadTenants();
    }
  }

  goToLastPage() {
    if (this.hasNextPage) {
      this.currentPage = this.totalPages;
      this.loadTenants();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTenants();
    }
  }

  onPageClick(page: number | string) {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  viewTenant(tenant: any) {
    console.log('👁️ Viewing tenant details:', tenant);
    this.selectedTenant = tenant;
    this.showDetailsModal = true;
  }
  
  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedTenant = null;
  }

  private formatConfiguration(config: any): string {
    if (!config) return '• No configuration available';
    
    const items: string[] = [];
    if (config.idpEnabled) items.push('• ✅ IdP Enabled');
    if (config.directAuthentication) items.push('• ✅ Direct Authentication');
    if (config.provider) items.push(`• Provider: ${config.provider}`);
    
    return items.length > 0 ? items.join('\n') : '• No configuration available';
  }

  editTenant(tenant: any) {
    console.log('✏️ Editing tenant:', tenant);
    const tenantId = tenant.tenantId || tenant.id;
    
    // Navigate to edit page (create this component if needed)
    this.router.navigate(['/tenants/edit', tenantId]);
    
    // For now, show a dialog
    this.dialogService.info(
      'Edit Tenant', 
      `Edit functionality for tenant "${this.getTenantName(tenant)}" will be available soon.\n\nTenant ID: ${tenantId}`
    ).subscribe();
  }

  deleteTenant(tenant: any) {
    console.log('🗑️ Deleting tenant:', tenant);
    
    const tenantId = tenant.tenantId || tenant.id;
    const tenantName = this.getTenantName(tenant);
    
    // Show confirmation dialog
    this.dialogService.confirm(
      `Delete Tenant "${tenantName}"?`, 
      `⚠️ WARNING: This action cannot be undone!\n\nThis will permanently delete:\n• All tenant configuration\n• IdP settings\n• User associations\n• Access permissions\n\nTenant ID: ${tenantId}`, 
      'Delete Permanently'
    ).subscribe(result => {
      if (!result.confirmed) {
        console.log('🗑️ User cancelled deletion');
        return;
      }

      if (result.dialog) {
        result.dialog.disableButtons();
      }

      console.log('🗑️ User confirmed deletion, calling API...');
      this.loading = true;

      // Call the delete API
      this.apiService.deleteTenant(tenantId).subscribe({
        next: () => {
          console.log(`✅ Tenant ${tenantName} deleted successfully`);
          
          // Remove from the list
          this.tenants = this.tenants.filter(t => (t.tenantId || t.id) !== tenantId);
          this.totalCount--;
          
          // Show success message
          this.dialogService.success(
            'Tenant Deleted',
            `Tenant "${tenantName}" has been permanently deleted.`
          ).subscribe();
          
          this.loading = false;
          result.dialog?.close();
          
          // Reload the list to ensure consistency
          this.loadTenants();
        },
        error: (error: any) => {
          console.error('❌ Error deleting tenant:', error);
          this.loading = false;
          result.dialog?.close();
          
          this.dialogService.error(
            'Deletion Failed',
            `Failed to delete tenant "${tenantName}".\n\nError: ${error.message || 'Unknown error occurred'}`
          ).subscribe();
        }
      });
    });
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, this.currentPage - 1);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      if (startPage > 2) {
        pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      
      if (this.totalPages > 1) {
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }
  
  // Sorting methods
  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.sortTenants();
  }
  
  getSortClass(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
  }
  
  private sortTenants() {
    this.tenants.sort((a, b) => {
      let aValue = this.getFieldValue(a, this.sortField);
      let bValue = this.getFieldValue(b, this.sortField);
      
      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return this.sortDirection === 'desc' ? -comparison : comparison;
    });
  }
  
  private getFieldValue(obj: any, field: string): any {
    switch (field) {
      case 'name':
        return this.getTenantName(obj);
      case 'status':
        return obj.status || 'active';
      case 'createdAt':
        return obj.createdAt ? new Date(obj.createdAt) : new Date(0);
      default:
        return obj[field] || '';
    }
  }
  
  // Action methods
  manageModules(tenant: any) {
    console.log('🛠️ Managing modules for tenant:', tenant);
    // Navigate to module management for this tenant
    this.router.navigate(['/tenants/modules'], { 
      queryParams: { tenantId: tenant.tenantId || tenant.id } 
    });
  }
  
  toggleDropdown(tenant: any) {
    // Close all other dropdowns first
    this.tenants.forEach(t => {
      if (t !== tenant) {
        t._showDropdown = false;
      }
    });
    
    // Toggle this tenant's dropdown
    tenant._showDropdown = !tenant._showDropdown;
  }
  
  duplicateTenant(tenant: any) {
    console.log('📋 Duplicating tenant:', tenant);
    this.dialogService.confirm(
      'Duplicate Tenant',
      `Create a copy of "${this.getTenantName(tenant)}"?\n\nThis will create a new tenant with the same configuration but a different ID.`,
      'Duplicate'
    ).subscribe(result => {
      if (result.confirmed) {
        // Call API to duplicate tenant
        this.apiService.duplicateTenant(tenant.tenantId || tenant.id).subscribe({
          next: (newTenant: any) => {
            console.log('✅ Tenant duplicated successfully:', newTenant);
            this.dialogService.success(
              'Tenant Duplicated',
              `New tenant "${newTenant.name}" has been created successfully.`
            ).subscribe();
            this.loadTenants(); // Refresh the list
          },
          error: (error: any) => {
            console.error('❌ Error duplicating tenant:', error);
            this.dialogService.error(
              'Duplication Failed',
              `Failed to duplicate tenant.\n\nError: ${error.message || 'Unknown error'}`
            ).subscribe();
          }
        });
      }
    });
    tenant._showDropdown = false;
  }
  
  downloadConfig(tenant: any) {
    console.log('📥 Downloading config for tenant:', tenant);
    try {
      const config = {
        tenantId: tenant.tenantId || tenant.id,
        name: this.getTenantName(tenant),
        domain: tenant.domain,
        adminEmail: tenant.adminEmail,
        status: tenant.status,
        configuration: tenant.configuration || {},
        createdAt: tenant.createdAt,
        lastModified: tenant.lastModified
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tenant-${tenant.tenantId || tenant.id}-config.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Config downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading config:', error);
      this.dialogService.error(
        'Download Failed',
        'Failed to download tenant configuration.'
      ).subscribe();
    }
    tenant._showDropdown = false;
  }
  
  viewAuditLog(tenant: any) {
    console.log('📊 Viewing audit log for tenant:', tenant);
    // Navigate to audit log page
    this.router.navigate(['/audit'], { 
      queryParams: { tenantId: tenant.tenantId || tenant.id } 
    });
    tenant._showDropdown = false;
  }
  
  // Utility methods
  getAdminName(tenant: any): string {
    if (tenant.adminName) return tenant.adminName;
    
    const firstName = tenant.adminFirstName || '';
    const lastName = tenant.adminLastName || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return '';
  }
  
  formatDateShort(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return '';
    }
  }
}
