import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { RbacService } from '../../../core/services/rbac.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="role-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Role Management</h1>
          <p>Define and manage roles with permissions across your organization</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" routerLink="/rbac/roles/create">
            ➕ Create Role
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
            placeholder="Search roles by name or description..."
            class="search-input">
          <button class="search-btn" (click)="loadRoles()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select [(ngModel)]="typeFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Types</option>
            <option value="System">System Roles</option>
            <option value="Custom">Custom Roles</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading roles...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Roles</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadRoles()">Try Again</button>
      </div>

      <!-- Roles Grid -->
      <div *ngIf="!loading && !error" class="roles-grid">
        <div *ngFor="let role of roles" class="role-card">
          <div class="role-header">
            <div class="role-info">
              <h3>{{role.name}}</h3>
              <p class="role-description">{{role.description}}</p>
            </div>
            <div class="role-status">
              <span class="status-badge" [class]="'status-' + role.status.toLowerCase()">
                {{role.status}}
              </span>
              <span class="type-badge" [class]="'type-' + (role.type.toLowerCase() || 'custom')">
                {{role.type || 'Custom'}}
              </span>
            </div>
          </div>

          <div class="role-details">
            <div class="detail-row">
              <label>Permissions:</label>
              <span class="permission-count">{{role.permissions.length || 0}} permissions</span>
            </div>
            <div class="detail-row">
              <label>Users:</label>
              <span class="user-count">{{role.userCount || 0}} users assigned</span>
            </div>
            <div class="detail-row">
              <label>Created:</label>
              <span class="date-info">{{formatDate(role.createdAt)}}</span>
            </div>
            <div class="detail-row" *ngIf="role.parentRoleId">
              <label>Parent Role:</label>
              <span class="parent-role">{{getParentRoleName(role.parentRoleId)}}</span>
            </div>
          </div>

          <div class="permissions-preview">
            <h4>Key Permissions</h4>
            <div class="permissions-tags">
              <span *ngFor="let permission of getTopPermissions(role.permissions)" 
                    class="permission-tag">
                {{permission}}
              </span>
              <span *ngIf="(role.permissions.length || 0) > 5" class="more-permissions">
                +{{(role.permissions.length || 0) - 5}} more
              </span>
            </div>
          </div>

          <div class="role-actions">
            <button class="btn-icon" [routerLink]="['/rbac/roles/edit', role.id]" title="Edit Role">
              ✏️ Edit
            </button>
            <button class="btn-icon" (click)="duplicateRole(role)" title="Duplicate Role">
              📋 Duplicate
            </button>
            <button class="btn-icon delete" (click)="confirmDelete(role)" 
                    [disabled]="role?.type === 'System'" title="Delete Role">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="roles.length === 0" class="empty-state">
          <div class="empty-icon">🛡️</div>
          <h3>No Roles Found</h3>
          <p>{{searchTerm ? 'No roles match your search criteria.' : 'Create your first role to get started.'}}</p>
          <button class="btn-primary" routerLink="/rbac/roles/create">Create Role</button>
        </div>
      </div>

      <!-- Action Result Toast -->
      <div *ngIf="actionMessage" class="toast" [class.success]="actionSuccess" [class.error]="!actionSuccess">
        {{actionMessage}}
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div *ngIf="roleToDelete" class="modal-overlay" (click)="cancelDelete()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Confirm Delete</h3>
          <button class="modal-close" (click)="cancelDelete()">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete the role <strong>{{roleToDelete.name}}</strong>?</p>
          <p class="warning-text">This action cannot be undone and will affect {{roleToDelete.userCount || 0}} users.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
          <button class="btn-danger" (click)="deleteRole()" [disabled]="deleting">
            {{deleting ? 'Deleting...' : 'Delete Role'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .role-list-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
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

    .btn-primary {
      background: #2196f3;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-primary:hover {
      background: #1976d2;
      transform: translateY(-2px);
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
      font-size: 1rem;
    }

    .search-input:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
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
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
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

    .error-container {
      color: #e74c3c;
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .role-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .role-card:hover {
      border-color: #2196f3;
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .role-info h3 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.3rem;
    }

    .role-description {
      color: #7f8c8d;
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .role-status {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .status-badge, .type-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-active {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-inactive {
      background: #ffebee;
      color: #c62828;
    }

    .type-system {
      background: #e3f2fd;
      color: #1976d2;
    }

    .type-custom {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .role-details {
      margin-bottom: 1.5rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row label {
      font-weight: 500;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .permission-count, .user-count {
      color: #2196f3;
      font-weight: 500;
    }

    .date-info {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .parent-role {
      background: #f0f0f0;
      color: #2c3e50;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .permissions-preview {
      margin-bottom: 1.5rem;
    }

    .permissions-preview h4 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1rem;
    }

    .permissions-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .permission-tag {
      background: #f8f9fa;
      color: #495057;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      border: 1px solid #e9ecef;
    }

    .more-permissions {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .role-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.3s ease;
    }

    .btn-icon:hover:not(:disabled) {
      background: #e0e0e0;
      transform: translateY(-1px);
    }

    .btn-icon.delete:hover:not(:disabled) {
      background: #ffebee;
      border-color: #e74c3c;
      color: #e74c3c;
    }

    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .toast {
      position: fixed;
      top: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }

    .toast.success {
      background: #27ae60;
    }

    .toast.error {
      background: #e74c3c;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .warning-text {
      color: #e74c3c;
      font-size: 0.9rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .role-list-container {
        padding: 1rem;
      }
      
      .roles-grid {
        grid-template-columns: 1fr;
      }
      
      .role-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .role-status {
        flex-direction: row;
      }
      
      .role-actions {
        flex-direction: column;
      }
    }
  `]
})
export class RoleListComponent implements OnInit {
  loading = true;
  error = '';
  actionLoading = false;
  actionMessage = '';
  actionSuccess = false;
  searchTerm = '';
  statusFilter = '';
  typeFilter = '';
  deleting = false;
  
  roles: any[] = []; // Properly initialize as empty array
  roleToDelete: any = null;

  constructor(
    private apiService: ApiService,
    private rbacService: RbacService
  ) {}

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.loading = true;
    this.error = '';
    
    this.rbacService.getRoles().subscribe({
      next: (response: any) => {
        // Handle both direct array and paginated response
        if (Array.isArray(response)) {
          this.roles = response;
        } else if (response && response.items) {
          this.roles = response.items;
        } else if (response && Array.isArray(response.data)) {
          this.roles = response.data;
        } else {
          this.roles = [];
          console.warn('Unexpected API response format:', response);
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Failed to load roles. Please try again.';
        this.roles = []; // Ensure roles is always an array
        this.loading = false;
        console.error('Error loading roles:', error);
      }
    });
  }

  onSearch() {
    this.loadRoles();
  }

  onFilterChange() {
    this.loadRoles();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  getParentRoleName(parentId: string): string {
    const parent = this.roles.find(r => r.id === parentId);
    return parent?.name || 'Unknown';
  }

  getTopPermissions(permissions: any[]): string[] {
    if (!permissions || !Array.isArray(permissions)) {
      return [];
    }
    
    // Handle both permission objects and string arrays
    return permissions.slice(0, 5).map(permission => {
      if (typeof permission === 'string') {
        return permission;
      } else if (permission && typeof permission === 'object') {
        // Use displayName if available, otherwise fallback to name
        return permission.displayName || permission.name || '[Unknown Permission]';
      }
      return '[Invalid Permission]';
    });
  }

  duplicateRole(role: any) {
    // Simulate duplication
    this.showActionMessage(`Role "${role.name}" duplicated successfully!`, true);
  }

  confirmDelete(role: any) {
    this.roleToDelete = role;
  }

  cancelDelete() {
    this.roleToDelete = null;
    this.deleting = false;
  }

  deleteRole() {
    if (!this.roleToDelete) return;
    
    this.deleting = true;
    
    this.rbacService.deleteRole(this.roleToDelete.id).subscribe({
      next: () => {
        this.roles = this.roles.filter(r => r.id !== this.roleToDelete.id);
        this.deleting = false;
        this.roleToDelete = null;
        this.showActionMessage('Role deleted successfully!', true);
      },
      error: (error) => {
        this.deleting = false;
        this.showActionMessage('Failed to delete role. Please try again.', false);
        console.error('Error deleting role:', error);
      }
    });
  }

  showActionMessage(message: string, success: boolean) {
    this.actionMessage = message;
    this.actionSuccess = success;
    
    setTimeout(() => {
      this.actionMessage = '';
    }, 3000);
  }
} 