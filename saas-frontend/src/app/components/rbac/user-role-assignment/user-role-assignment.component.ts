import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RbacService } from '../../../core/services/rbac.service';
import { ApiService } from '../../../services/api.service';

interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  roles: string[];
  lastLoginAt?: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string; // Make optional to match RoleDto
  type?: string; // Make optional since it's optional in RoleDto
  tenantId: string;
  displayName: string; // Required in RoleDto
}

@Component({
  selector: 'app-user-role-assignment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="user-role-assignment-container">
      <div class="page-header">
        <div class="header-content">
          <h1>User Role Assignment</h1>
          <p>Manage role assignments for users across your organization</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/rbac/roles">
            ← Back to RBAC
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
            placeholder="Search users by name or email..."
            class="search-input">
          <button class="search-btn" (click)="loadUsers()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="roleFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Roles</option>
            <option *ngFor="let role of availableRoles" [value]="role.name">{{role.name}}</option>
          </select>
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="active">Active Users</option>
            <option value="inactive">Inactive Users</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading users...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Users</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadUsers()">Try Again</button>
      </div>

      <!-- Users List -->
      <div *ngIf="!loading && !error" class="users-grid">
        <div *ngFor="let user of filteredUsers" class="user-card">
          <div class="user-header">
            <div class="user-info">
              <h3>{{user.name}}</h3>
              <p class="user-email">{{user.email}}</p>
              <span class="status-badge" [class]="'status-' + (user.isActive ? 'active' : 'inactive')">
                {{user.isActive ? 'Active' : 'Inactive'}}
              </span>
            </div>
            <div class="user-actions">
              <button class="btn-icon" (click)="openRoleAssignment(user)" title="Manage Roles">
                🛡️ Manage Roles
              </button>
            </div>
          </div>

          <div class="user-details">
            <div class="detail-row">
              <label>Current Roles:</label>
              <span class="role-count">{{user.roles.length || 0}} roles</span>
            </div>
            <div class="detail-row" *ngIf="user.lastLoginAt">
              <label>Last Login:</label>
              <span class="date-info">{{formatDate(user.lastLoginAt)}}</span>
            </div>
          </div>

          <div class="current-roles">
            <h4>Current Roles</h4>
            <div class="role-tags">
              <span *ngFor="let roleName of user.roles" class="role-tag">
                {{roleName}}
                <button class="remove-role" (click)="removeRoleFromUser(user.id, roleName)" 
                        title="Remove Role" *ngIf="canRemoveRole(roleName)">×</button>
              </span>
              <span *ngIf="(user.roles?.length || 0) === 0" class="no-roles">
                No roles assigned
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredUsers.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No Users Found</h3>
          <p>{{searchTerm ? 'No users match your search criteria.' : 'No users available.'}}</p>
        </div>
      </div>

      <!-- Success/Error Toast -->
      <div *ngIf="actionMessage" class="toast" [class.success]="actionSuccess" [class.error]="!actionSuccess">
        {{actionMessage}}
      </div>
    </div>

    <!-- Role Assignment Modal -->
    <div *ngIf="selectedUser" class="modal-overlay" (click)="closeRoleAssignment()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Manage Roles for {{selectedUser.name}}</h3>
          <button class="modal-close" (click)="closeRoleAssignment()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="user-current-roles">
            <h4>Current Roles</h4>
            <div class="current-role-list">
              <div *ngFor="let roleName of selectedUser.roles" class="current-role-item">
                <span class="role-name">{{roleName}}</span>
                <button class="btn-remove" (click)="removeRoleFromUser(selectedUser.id, roleName)" 
                        [disabled]="actionLoading" *ngIf="canRemoveRole(roleName)">
                  Remove
                </button>
              </div>
              <div *ngIf="(selectedUser.roles?.length || 0) === 0" class="no-current-roles">
                No roles assigned
              </div>
            </div>
          </div>

          <div class="assign-new-role">
            <h4>Assign New Role</h4>
            <div class="role-assignment-form">
              <select [(ngModel)]="selectedRoleToAssign" class="role-select">
                <option value="">Select a role to assign...</option>
                <option *ngFor="let role of getAvailableRolesForUser(selectedUser)" [value]="role.id">
                  {{role.name}} - {{role.description}}
                </option>
              </select>
              <button class="btn-primary" (click)="assignRoleToUser()" 
                      [disabled]="!selectedRoleToAssign || actionLoading">
                {{actionLoading ? 'Assigning...' : 'Assign Role'}}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeRoleAssignment()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-role-assignment-container {
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

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .user-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .user-card:hover {
      border-color: #2196f3;
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .user-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .user-info h3 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.3rem;
    }

    .user-email {
      color: #7f8c8d;
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }

    .status-badge {
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

    .user-details {
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

    .role-count {
      color: #2196f3;
      font-weight: 500;
    }

    .date-info {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .current-roles h4 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 1rem;
    }

    .role-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .role-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .remove-role {
      background: #f44336;
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
    }

    .no-roles {
      color: #7f8c8d;
      font-style: italic;
      font-size: 0.9rem;
    }

    .btn-icon {
      background: #2196f3;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.3s ease;
    }

    .btn-icon:hover {
      background: #1976d2;
      transform: translateY(-1px);
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      border: none;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: #bbb;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
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
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
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

    .user-current-roles {
      margin-bottom: 2rem;
    }

    .user-current-roles h4 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
    }

    .current-role-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .current-role-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .role-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .btn-remove {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-remove:disabled {
      background: #bbb;
      cursor: not-allowed;
    }

    .no-current-roles {
      color: #7f8c8d;
      font-style: italic;
      padding: 1rem;
      text-align: center;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .assign-new-role h4 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
    }

    .role-assignment-form {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .role-select {
      flex: 1;
      min-width: 250px;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .user-role-assignment-container {
        padding: 1rem;
      }
      
      .users-grid {
        grid-template-columns: 1fr;
      }
      
      .user-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .role-assignment-form {
        flex-direction: column;
      }
      
      .role-select {
        min-width: auto;
      }
    }
  `]
})
export class UserRoleAssignmentComponent implements OnInit {
  loading = true;
  actionLoading = false;
  error = '';
  actionMessage = '';
  actionSuccess = false;
  searchTerm = '';
  roleFilter = '';
  statusFilter = '';

  users: User[] = [];
  filteredUsers: User[] = [];
  availableRoles: Role[] = [];
  selectedUser: User | null = null;
  selectedRoleToAssign = '';

  constructor(
    private rbacService: RbacService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  async loadUsers() {
    this.loading = true;
    this.error = '';

    try {
      // Use API service to get users
      this.apiService.getUsers().subscribe({
        next: (response: any) => {
          this.users = Array.isArray(response) ? response : (response?.data || []);
          this.filterUsers();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load users';
          this.loading = false;
          console.error('Error loading users:', error);
        }
      });
    } catch (error) {
      this.error = 'Failed to load users';
      this.loading = false;
      console.error('Error loading users:', error);
    }
  }

  async loadRoles() {
    try {
      const roles = await this.rbacService.getRoles().toPromise();
      this.availableRoles = roles || [];
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  onSearch() {
    this.filterUsers();
  }

  onFilterChange() {
    this.filterUsers();
  }

  filterUsers() {
    let filtered = [...this.users];

    // Filter by search term
    if (this.searchTerm) {
      const searchTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by role
    if (this.roleFilter) {
      filtered = filtered.filter(user =>
        user.roles?.includes(this.roleFilter)
      );
    }

    // Filter by status
    if (this.statusFilter) {
      filtered = filtered.filter(user =>
        this.statusFilter === 'active' ? user.isActive : !user.isActive
      );
    }

    this.filteredUsers = filtered;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  openRoleAssignment(user: User) {
    this.selectedUser = { ...user };
    this.selectedRoleToAssign = '';
  }

  closeRoleAssignment() {
    this.selectedUser = null;
    this.selectedRoleToAssign = '';
    this.actionLoading = false;
  }

  canRemoveRole(roleName: string): boolean {
    // Prevent removing system roles like PLATFORM_ADMIN
    return !['PLATFORM_ADMIN'].includes(roleName);
  }

  getAvailableRolesForUser(user: User): Role[] {
    return this.availableRoles.filter(role => 
      !user.roles?.includes(role.name)
    );
  }

  async assignRoleToUser() {
    if (!this.selectedUser || !this.selectedRoleToAssign) return;

    this.actionLoading = true;

    try {
      const selectedRole = this.availableRoles.find(r => r.id === this.selectedRoleToAssign);
      if (!selectedRole) return;

      const assignRoleDto = {
        roleId: this.selectedRoleToAssign
      };
      
      await this.rbacService.assignRoleToUser(this.selectedUser.id, assignRoleDto).toPromise();
      
      // Update local data
      if (!this.selectedUser.roles) {
        this.selectedUser.roles = [];
      }
      this.selectedUser.roles.push(selectedRole.name);
      
      // Update the original user in the list
      const userIndex = this.users.findIndex(u => u.id === this.selectedUser?.id);
      if (userIndex !== -1) {
        this.users[userIndex] = { ...this.selectedUser };
      }

      this.filterUsers();
      this.selectedRoleToAssign = '';
      this.showActionMessage(`Role "${selectedRole.name}" assigned successfully!`, true);
    } catch (error) {
      this.showActionMessage('Failed to assign role', false);
      console.error('Error assigning role:', error);
    } finally {
      this.actionLoading = false;
    }
  }

  async removeRoleFromUser(userId: string, roleName: string) {
    if (!this.canRemoveRole(roleName)) {
      this.showActionMessage('Cannot remove system roles', false);
      return;
    }

    this.actionLoading = true;

    try {
      const role = this.availableRoles.find(r => r.name === roleName);
      if (!role) return;

      await this.rbacService.removeRoleFromUser(userId, role.id).toPromise();
      
      // Update local data
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.users[userIndex].roles = this.users[userIndex].roles?.filter(r => r !== roleName) || [];
      }

      // Update selected user if it's the same
      if (this.selectedUser && this.selectedUser.id === userId) {
        this.selectedUser.roles = this.selectedUser.roles?.filter(r => r !== roleName) || [];
      }

      this.filterUsers();
      this.showActionMessage(`Role "${roleName}" removed successfully!`, true);
    } catch (error) {
      this.showActionMessage('Failed to remove role', false);
      console.error('Error removing role:', error);
    } finally {
      this.actionLoading = false;
    }
  }

  showActionMessage(message: string, success: boolean) {
    this.actionMessage = message;
    this.actionSuccess = success;
    
    setTimeout(() => {
      this.actionMessage = '';
    }, 3000);
  }
} 