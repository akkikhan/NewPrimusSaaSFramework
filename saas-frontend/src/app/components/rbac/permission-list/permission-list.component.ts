import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { RbacService } from '../../../core/services/rbac.service';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="permission-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Permission Management</h1>
          <p>View and organize permissions across the system</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/rbac/roles">
            ← Back to Roles
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
            placeholder="Search permissions by name or description..."
            class="search-input">
          <button class="search-btn" (click)="loadPermissions()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="categoryFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Categories</option>
            <option value="User Management">User Management</option>
            <option value="RBAC Management">RBAC Management</option>
            <option value="Tenant Management">Tenant Management</option>
            <option value="Platform Management">Platform Management</option>
            <option value="Audit & Compliance">Audit & Compliance</option>
          </select>
          <select [(ngModel)]="scopeFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Scopes</option>
            <option value="platform">Platform</option>
            <option value="tenant">Tenant</option>
            <option value="self">Self</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading permissions...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Permissions</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadPermissions()">Try Again</button>
      </div>

      <!-- Permissions by Category -->
      <div *ngIf="!loading && !error" class="permissions-container">
        <div *ngFor="let category of filteredCategories" class="permission-category">
          <div class="category-header">
            <h2>{{category.name}}</h2>
            <span class="permission-count">{{category.permissions.length}} permissions</span>
          </div>
          
          <div class="permissions-grid">
            <div *ngFor="let permission of category.permissions" class="permission-card">
              <div class="permission-header">
                <h3>{{permission.displayName || permission.name}}</h3>
                <span class="permission-key">{{permission.name}}</span>
              </div>
              
              <p class="permission-description">{{permission.description || 'No description available'}}</p>
              
              <div class="permission-details">
                <div class="detail-row">
                  <label>Resource:</label>
                  <span class="resource-badge">{{permission.resource}}</span>
                </div>
                <div class="detail-row">
                  <label>Action:</label>
                  <span class="action-badge">{{permission.action}}</span>
                </div>
                <div class="detail-row">
                  <label>Scope:</label>
                  <span class="scope-badge" [class]="'scope-' + permission.scope">{{permission.scope}}</span>
                </div>
                <div class="detail-row">
                  <label>Category:</label>
                  <span class="category-badge">{{permission.category}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredCategories.length === 0" class="empty-state">
          <div class="empty-icon">🔒</div>
          <h3>No Permissions Found</h3>
          <p>{{searchTerm ? 'No permissions match your search criteria.' : 'No permissions are configured for this tenant.'}}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .permission-list-container {
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
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .header-content p {
      color: #7f8c8d;
      margin: 0;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
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
      background: #2196f3;
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .filters {
      display: flex;
      gap: 1rem;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
    }

    .loading-container, .error-container {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .permission-category {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .category-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .permission-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.9rem;
    }

    .permissions-grid {
      padding: 1.5rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .permission-card {
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .permission-card:hover {
      border-color: #2196f3;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .permission-header {
      margin-bottom: 1rem;
    }

    .permission-header h3 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .permission-key {
      background: #f8f9fa;
      color: #495057;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .permission-description {
      color: #7f8c8d;
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .permission-details {
      margin-bottom: 1rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
    }

    .detail-row label {
      font-weight: 500;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .resource-badge, .action-badge, .category-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .scope-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .scope-platform {
      background: #fff3e0;
      color: #f57c00;
    }

    .scope-tenant {
      background: #e8f5e8;
      color: #388e3c;
    }

    .scope-self {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .role-count, .user-count {
      color: #2196f3;
      font-weight: 500;
    }

    .roles-using h4 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }

    .role-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .role-tag {
      background: #f0f0f0;
      color: #2c3e50;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .no-roles {
      color: #7f8c8d;
      font-style: italic;
      font-size: 0.8rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
  `]
})
export class PermissionListComponent implements OnInit {
  loading = true;
  error = '';
  searchTerm = '';
  categoryFilter = '';
  scopeFilter = '';
  
  permissions: any[] = [];
  filteredCategories: any[] = [];

  constructor(
    private apiService: ApiService,
    private rbacService: RbacService
  ) {}

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.loading = true;
    this.error = '';
    
    this.rbacService.getPermissions().subscribe({
      next: (permissions: any[]) => {
        console.log('📋 Loaded permissions from API:', permissions);
        this.permissions = permissions || [];
        this.updateFilteredCategories();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading permissions:', error);
        this.error = 'Failed to load permissions. Please try again.';
        this.permissions = [];
        this.filteredCategories = [];
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.updateFilteredCategories();
  }

  onFilterChange() {
    this.updateFilteredCategories();
  }

  private updateFilteredCategories() {
    let filtered = [...this.permissions];

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(search) ||
        (p.displayName || '').toLowerCase().includes(search) ||
        (p.description || '').toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (this.categoryFilter) {
      filtered = filtered.filter(p => p.category === this.categoryFilter);
    }

    // Apply scope filter
    if (this.scopeFilter) {
      filtered = filtered.filter(p => p.scope === this.scopeFilter);
    }

    // Group by category
    const categories = new Map<string, any[]>();
    filtered.forEach(permission => {
      const category = permission.category || 'Uncategorized';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(permission);
    });

    // Convert to array format for template
    this.filteredCategories = Array.from(categories.entries()).map(([name, permissions]) => ({
      name,
      permissions: permissions.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name))
    })).sort((a, b) => a.name.localeCompare(b.name));

    console.log('🏷️ Filtered categories:', this.filteredCategories);
  }
}