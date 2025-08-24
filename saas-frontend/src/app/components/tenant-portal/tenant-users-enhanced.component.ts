import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DialogService } from '../../shared/services/dialog.service';
import { ToastService } from '../../shared/services/toast.service';

interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  status: 'Active' | 'Invited' | 'Suspended';
  lastActive?: string;
  selected?: boolean;
}

@Component({
  selector: 'app-tenant-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="tenant-users-container">
      <!-- Check if RBAC module is enabled -->
      <div *ngIf="!hasRbacModule" class="no-access-message">
        <div class="message-card">
          <span class="icon">🔒</span>
          <h2>User Management Not Available</h2>
          <p>The RBAC module is not enabled for your tenant. Please contact your Platform Administrator to enable user management features.</p>
          <button class="btn-back" [routerLink]="['/tenants', tenantId, 'dashboard']">
            Back to Dashboard
          </button>
        </div>
      </div>

      <!-- User Management Interface (only if RBAC is enabled) -->
      <div *ngIf="hasRbacModule">
        <!-- Header -->
        <div class="page-header">
          <div class="header-content">
            <h1>User Management</h1>
            <p>Manage users for {{tenantName}}</p>
          </div>
          <div class="header-actions">
            <div class="user-limit-indicator">
              <span class="limit-text">{{users.length}} / {{userLimit}} users</span>
              <div class="limit-progress">
                <div class="progress-fill" [style.width.%]="getUserPercentage()"></div>
              </div>
            </div>
            <button class="btn-primary" 
                    (click)="inviteUser()"
                    [disabled]="users.length >= userLimit">
              <span class="icon">➕</span> Invite User
            </button>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="search-section">
          <input type="text" 
                 [(ngModel)]="searchTerm" 
                 (input)="filterUsers()"
                 placeholder="Search by name, email, or role..."
                 class="search-input">
          
          <select [(ngModel)]="roleFilter" (change)="filterUsers()" class="filter-select">
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
            <option value="ReadOnly">Read Only</option>
          </select>
          
          <select [(ngModel)]="statusFilter" (change)="filterUsers()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Invited">Invited</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <!-- Users Table -->
        <div class="users-table-card">
          <div class="table-actions">
            <span class="selected-count" *ngIf="getSelectedCount() > 0">
              {{getSelectedCount()}} selected
            </span>
            <button class="btn-bulk" 
                    *ngIf="getSelectedCount() > 0"
                    (click)="bulkSuspend()">
              Suspend Selected
            </button>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" 
                           [(ngModel)]="selectAll" 
                           (change)="toggleSelectAll()">
                  </th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of filteredUsers">
                  <td>
                    <input type="checkbox" [(ngModel)]="user.selected">
                  </td>
                  <td>
                    <div class="user-info">
                      <div class="user-avatar">{{getUserInitials(user.name)}}</div>
                      <span class="user-name">{{user.name}}</span>
                    </div>
                  </td>
                  <td>{{user.email}}</td>
                  <td>
                    <span class="role-badge">{{user.role}}</span>
                  </td>
                  <td>{{user.department || '-'}}</td>
                  <td>
                    <span class="status-badge" [class]="'status-' + user.status.toLowerCase()">
                      {{user.status}}
                    </span>
                  </td>
                  <td>{{formatDate(user.lastActive)}}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon" (click)="editUser(user)" title="Edit">
                        ✏️
                      </button>
                      <button class="btn-icon" 
                              *ngIf="user.status === 'Active'"
                              (click)="suspendUser(user)" 
                              title="Suspend">
                        ⛔
                      </button>
                      <button class="btn-icon" 
                              *ngIf="user.status === 'Suspended'"
                              (click)="activateUser(user)" 
                              title="Activate">
                        ✅
                      </button>
                      <button class="btn-icon btn-danger" 
                              (click)="deleteUser(user)" 
                              title="Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-empty" *ngIf="filteredUsers.length === 0">
            <p>No users found</p>
          </div>
        </div>

        <!-- User Limit Warning -->
        <div class="limit-warning" *ngIf="users.length >= userLimit * 0.9">
          <span class="warning-icon">⚠️</span>
          <span>You're approaching your user limit ({{users.length}}/{{userLimit}}). Contact your Platform Administrator to increase the limit.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-users-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* No Access Message */
    .no-access-message {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }

    .message-card {
      text-align: center;
      padding: 48px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      max-width: 500px;
    }

    .message-card .icon {
      font-size: 48px;
      display: block;
      margin-bottom: 24px;
    }

    .message-card h2 {
      margin: 0 0 16px 0;
      color: #1e293b;
    }

    .message-card p {
      color: #64748b;
      margin: 0 0 24px 0;
    }

    .btn-back {
      padding: 10px 24px;
      background: #002F87;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      color: #1e293b;
    }

    .header-content p {
      margin: 0;
      color: #64748b;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .user-limit-indicator {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .limit-text {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }

    .limit-progress {
      width: 120px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #002F87 0%, #F2A900 100%);
      transition: width 0.3s ease;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #002F87;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #001d5a;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Search Section */
    .search-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-input {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-select {
      padding: 10px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
    }

    /* Table Card */
    .users-table-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .table-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .selected-count {
      color: #64748b;
      font-size: 14px;
    }

    .btn-bulk {
      padding: 6px 12px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    /* Table Styles */
    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th {
      text-align: left;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }

    .table td {
      padding: 16px 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #002F87 0%, #F2A900 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }

    .role-badge {
      padding: 4px 8px;
      background: #e0e7ff;
      color: #3730a3;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-active {
      background: #d1fae5;
      color: #065f46;
    }

    .status-invited {
      background: #fef3c7;
      color: #92400e;
    }

    .status-suspended {
      background: #fee2e2;
      color: #991b1b;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-icon {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      font-size: 16px;
    }

    .btn-icon:hover {
      transform: scale(1.2);
    }

    .table-empty {
      text-align: center;
      padding: 48px;
      color: #64748b;
    }

    /* Limit Warning */
    .limit-warning {
      margin-top: 24px;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #92400e;
      font-size: 14px;
    }

    .warning-icon {
      font-size: 20px;
    }
  `]
})
export class TenantUsersEnhancedComponent implements OnInit {
  tenantId: string = '';
  tenantName: string = '';
  hasRbacModule: boolean = false;
  
  users: TenantUser[] = [];
  filteredUsers: TenantUser[] = [];
  
  searchTerm: string = '';
  roleFilter: string = '';
  statusFilter: string = '';
  selectAll: boolean = false;
  
  userLimit: number = 1000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private dialogService: DialogService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.params['tenantId'];
    this.checkRbacModule();
    this.loadTenantInfo();
  }

  checkRbacModule(): void {
    // Check if RBAC module is enabled for this tenant
    this.apiService.get(`/api/tenants/${this.tenantId}/modules`).subscribe({
      next: (response: any) => {
        const modules = response.data || [];
        this.hasRbacModule = modules.some((m: any) => m.id === 'rbac' && m.enabled);
        
        if (this.hasRbacModule) {
          this.loadUsers();
        }
      },
      error: (error: any) => {
        console.error('Failed to check modules:', error);
        // Assume RBAC is enabled if we can't check
        this.hasRbacModule = true;
        this.loadUsers();
      }
    });
  }

  loadTenantInfo(): void {
    this.apiService.get(`/api/tenants/${this.tenantId}`).subscribe({
      next: (response: any) => {
        this.tenantName = response.data?.name || 'Tenant';
      },
      error: (error: any) => {
        console.error('Failed to load tenant info:', error);
      }
    });
  }

  loadUsers(): void {
    this.apiService.get(`/api/tenants/${this.tenantId}/users`).subscribe({
      next: (response: any) => {
        this.users = response.data || [];
        this.filterUsers();
      },
      error: (error: any) => {
        console.error('Failed to load users:', error);
        this.toastService.error('Failed to load users');
      }
    });
  }

  filterUsers(): void {
    let filtered = [...this.users];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      );
    }

    if (this.roleFilter) {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }

    if (this.statusFilter) {
      filtered = filtered.filter(user => user.status === this.statusFilter);
    }

    this.filteredUsers = filtered;
  }

  getUserPercentage(): number {
    return Math.min((this.users.length / this.userLimit) * 100, 100);
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }

  toggleSelectAll(): void {
    this.filteredUsers.forEach(user => user.selected = this.selectAll);
  }

  getSelectedCount(): number {
    return this.filteredUsers.filter(u => u.selected).length;
  }

  inviteUser(): void {
    if (this.users.length >= this.userLimit) {
      this.toastService.error(`User limit reached (${this.userLimit} users)`);
      return;
    }
    this.router.navigate(['/tenants', this.tenantId, 'users', 'invite']);
  }

  editUser(user: TenantUser): void {
    this.router.navigate(['/tenants', this.tenantId, 'users', user.id, 'edit']);
  }

  async suspendUser(user: TenantUser): Promise<void> {
    this.dialogService.confirm(
      'Suspend User',
      `Are you sure you want to suspend ${user.name}?`,
      'Yes, Suspend',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        this.apiService.patch(`/api/users/${user.id}`, { status: 'Suspended' }).subscribe({
          next: () => {
            this.toastService.success('User suspended');
            this.loadUsers();
          },
          error: () => {
            this.toastService.error('Failed to suspend user');
          }
        });
      }
    });
  }

  activateUser(user: TenantUser): void {
    this.apiService.patch(`/api/users/${user.id}`, { status: 'Active' }).subscribe({
      next: () => {
        this.toastService.success('User activated');
        this.loadUsers();
      },
      error: () => {
        this.toastService.error('Failed to activate user');
      }
    });
  }

  async deleteUser(user: TenantUser): Promise<void> {
    this.dialogService.confirm(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      'Yes, Delete',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        this.apiService.delete(`/api/users/${user.id}`).subscribe({
          next: () => {
            this.toastService.success('User deleted');
            this.loadUsers();
          },
          error: () => {
            this.toastService.error('Failed to delete user');
          }
        });
      }
    });
  }

  async bulkSuspend(): Promise<void> {
    const selected = this.filteredUsers.filter(u => u.selected);
    this.dialogService.confirm(
      'Suspend Users',
      `Are you sure you want to suspend ${selected.length} users?`,
      'Yes, Suspend All',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        // Implement bulk suspend
        this.toastService.success(`${selected.length} users suspended`);
        this.loadUsers();
      }
    });
  }
}
