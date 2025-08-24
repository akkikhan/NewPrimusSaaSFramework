import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DialogService } from '../../shared/services/dialog.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="user-management-container">
      <div class="page-header">
        <div class="header-content">
          <h1>User Management</h1>
          <p>Manage users, roles, and permissions</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" routerLink="/users/invite">
            <span class="icon">➕</span> Invite User
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
            placeholder="Search users by name, email, or role..."
            class="search-input">
        </div>
        <div class="filters">
          <select [(ngModel)]="roleFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
            <option value="ReadOnly">Read Only</option>
          </select>
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Invited">Invited</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <!-- Users Table -->
      <div class="users-table-card">
        <div class="table-header">
          <h2>Users ({{filteredUsers.length}})</h2>
          <div class="table-actions">
            <button class="btn-sm btn-outline" (click)="exportUsers()">
              Export CSV
            </button>
          </div>
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
                  <input type="checkbox" 
                         [(ngModel)]="user.selected">
                </td>
                <td>
                  <div class="user-info">
                    <div class="user-avatar">{{getUserInitials(user.name)}}</div>
                    <span class="user-name">{{user.name}}</span>
                  </div>
                </td>
                <td>{{user.email}}</td>
                <td>
                  <span class="role-badge" [class]="'role-' + user.role.toLowerCase()">
                    {{user.role}}
                  </span>
                </td>
                <td>{{user.department || '-'}}</td>
                <td>
                  <span class="status-badge" 
                        [class.status-active]="user.status === 'Active'"
                        [class.status-invited]="user.status === 'Invited'"
                        [class.status-suspended]="user.status === 'Suspended'">
                    {{user.status}}
                  </span>
                </td>
                <td>{{formatDate(user.lastActive)}}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" 
                            (click)="editUser(user)"
                            title="Edit User">
                      ✏️
                    </button>
                    <button class="btn-icon" 
                            (click)="resetPassword(user)"
                            title="Reset Password">
                      🔐
                    </button>
                    <button class="btn-icon" 
                            *ngIf="user.status === 'Active'"
                            (click)="suspendUser(user)"
                            title="Suspend User">
                      ⛔
                    </button>
                    <button class="btn-icon" 
                            *ngIf="user.status === 'Suspended'"
                            (click)="activateUser(user)"
                            title="Activate User">
                      ✅
                    </button>
                    <button class="btn-icon btn-danger" 
                            (click)="deleteUser(user)"
                            title="Delete User">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages > 1">
          <button class="page-btn" 
                  (click)="changePage(currentPage - 1)"
                  [disabled]="currentPage === 1">
            Previous
          </button>
          <span class="page-info">Page {{currentPage}} of {{totalPages}}</span>
          <button class="page-btn" 
                  (click)="changePage(currentPage + 1)"
                  [disabled]="currentPage === totalPages">
            Next
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-management-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header-content h1 {
      font-size: 28px;
      font-weight: 600;
      color: #002F87;
      margin: 0 0 8px 0;
    }

    .header-content p {
      color: #64748b;
      margin: 0;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #002F87 0%, #001d5a 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 47, 135, 0.3);
    }

    .search-section {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      align-items: center;
    }

    .search-bar {
      flex: 1;
      display: flex;
      gap: 8px;
    }

    .search-input {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
    }

    .search-input:focus {
      outline: none;
      border-color: #002F87;
      box-shadow: 0 0 0 3px rgba(0, 47, 135, 0.1);
    }

    .filters {
      display: flex;
      gap: 12px;
    }

    .filter-select {
      padding: 10px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .users-table-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .table-header h2 {
      margin: 0;
      font-size: 20px;
      color: #1e293b;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 13px;
      border-radius: 6px;
      border: 1px solid;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-outline {
      border-color: #002F87;
      color: #002F87;
    }

    .btn-outline:hover {
      background: #002F87;
      color: white;
    }

    .table-responsive {
      overflow-x: auto;
    }

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
      text-transform: uppercase;
    }

    .table td {
      padding: 16px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
      color: #1e293b;
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

    .user-name {
      font-weight: 500;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .role-admin {
      background: #fee2e2;
      color: #991b1b;
    }

    .role-manager {
      background: #e0e7ff;
      color: #3730a3;
    }

    .role-user {
      background: #dbeafe;
      color: #1e40af;
    }

    .role-readonly {
      background: #f3f4f6;
      color: #4b5563;
    }

    .status-badge {
      display: inline-block;
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
      transition: all 0.2s;
    }

    .btn-icon:hover {
      transform: scale(1.2);
    }

    .btn-danger:hover {
      filter: saturate(2);
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .page-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .page-btn:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #002F87;
      color: #002F87;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 14px;
      color: #64748b;
    }

    @media (max-width: 768px) {
      .search-section {
        flex-direction: column;
      }

      .filters {
        width: 100%;
        justify-content: space-between;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .table-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm: string = '';
  roleFilter: string = '';
  statusFilter: string = '';
  selectAll: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private dialogService: DialogService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    // Get current user's tenant or all users for platform admin
    const userData = sessionStorage.getItem('userData');
    const tenantId = userData ? JSON.parse(userData).tenantId : null;
    
    const endpoint = tenantId ? 
      `/api/users?tenantId=${tenantId}` : 
      '/api/users';

    this.apiService.get(endpoint).subscribe({
      next: (response) => {
        this.users = response.data || [];
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toastService.error('Failed to load users');
      }
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (this.roleFilter) {
      filtered = filtered.filter(user => user.role === this.roleFilter);
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(user => user.status === this.statusFilter);
    }

    this.filteredUsers = filtered;
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  toggleSelectAll(): void {
    this.filteredUsers.forEach(user => user.selected = this.selectAll);
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  editUser(user: any): void {
    this.router.navigate(['/authentication/users/edit', user.id]);
  }

  async resetPassword(user: any): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Reset Password',
      `Send password reset email to ${user.email}?`,
      'Send Reset Email',
      'Cancel'
    ).toPromise();

    if (confirmed?.confirmed) {
      this.apiService.post(`/api/users/${user.id}/reset-password`, {}).subscribe({
        next: () => {
          this.toastService.success('Password reset email sent');
        },
        error: (error) => {
          this.toastService.error('Failed to send reset email');
        }
      });
    }
  }

  async suspendUser(user: any): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Suspend User',
      `Are you sure you want to suspend ${user.name}?`,
      'Yes, Suspend',
      'Cancel'
    ).toPromise();

    if (confirmed?.confirmed) {
      this.apiService.patch(`/api/users/${user.id}`, { status: 'Suspended' }).subscribe({
        next: () => {
          this.toastService.success('User suspended');
          this.loadUsers();
        },
        error: (error) => {
          this.toastService.error('Failed to suspend user');
        }
      });
    }
  }

  async activateUser(user: any): Promise<void> {
    this.apiService.patch(`/api/users/${user.id}`, { status: 'Active' }).subscribe({
      next: () => {
        this.toastService.success('User activated');
        this.loadUsers();
      },
      error: (error) => {
        this.toastService.error('Failed to activate user');
      }
    });
  }

  async deleteUser(user: any): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      'Yes, Delete',
      'Cancel'
    ).toPromise();

    if (confirmed?.confirmed) {
      this.apiService.delete(`/api/users/${user.id}`).subscribe({
        next: () => {
          this.toastService.success('User deleted');
          this.loadUsers();
        },
        error: (error) => {
          this.toastService.error('Failed to delete user');
        }
      });
    }
  }

  exportUsers(): void {
    // Create CSV content
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Last Active'];
    const rows = this.filteredUsers.map(user => [
      user.name,
      user.email,
      user.role,
      user.department || '',
      user.status,
      this.formatDate(user.lastActive)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.toastService.success('Users exported successfully');
  }
}