import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="user-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>User Management</h1>
          <p>Manage users, roles, and authentication settings</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" routerLink="/authentication/users/create">
            ➕ Create User
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
            placeholder="Search users by email, name, or tenant..."
            class="search-input">
          <button class="search-btn" (click)="loadUsers()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
          <select [(ngModel)]="roleFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
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

      <!-- Users Table -->
      <div *ngIf="!loading && !error" class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Tenant</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users.items" class="user-row">
              <td>
                <div class="user-info">
                  <div class="user-avatar">{{getInitials(user.firstName, user.lastName)}}</div>
                  <div class="user-details">
                    <div class="user-name">{{user.firstName}} {{user.lastName}}</div>
                    <div class="user-id">ID: {{user.id}}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="user-email">{{user.email}}</div>
              </td>
              <td>
                <div class="tenant-info">
                  <span class="tenant-name">{{user.tenantId}}</span>
                </div>
              </td>
              <td>
                <div class="roles-container">
                  <span *ngFor="let role of user.roles" class="role-badge">{{role}}</span>
                </div>
              </td>
              <td>
                <span class="status-badge" [class]="'status-' + user.status?.toLowerCase()">
                  {{user.status || 'Active'}}
                </span>
              </td>
              <td>
                <div class="date-info">
                  {{formatDate(user.lastLoginAt) || 'Never'}}
                </div>
              </td>
              <td>
                <div class="date-info">
                  {{formatDate(user.createdAt)}}
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    class="btn-icon" 
                    [routerLink]="['/authentication/users', user.id]"
                    title="View Details">
                    👁️
                  </button>
                  <button 
                    class="btn-icon" 
                    [routerLink]="['/authentication/users/edit', user.id]"
                    title="Edit User">
                    ✏️
                  </button>
                  <button 
                    class="btn-icon delete" 
                    (click)="confirmDelete(user)"
                    title="Delete User">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div *ngIf="users.items?.length === 0" class="empty-state">
          <div class="empty-icon">👤</div>
          <h3>No Users Found</h3>
          <p>{{searchTerm ? 'No users match your search criteria.' : 'Create your first user to get started.'}}</p>
          <button class="btn-primary" routerLink="/authentication/users/create">Create User</button>
        </div>
      </div>

      <!-- Pagination -->
      <div *ngIf="users.items?.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{users.items.length}} of {{users.totalItems}} users
        </div>
        <div class="pagination-controls">
          <button 
            class="btn-pagination" 
            [disabled]="currentPage <= 1"
            (click)="goToPage(currentPage - 1)">
            ← Previous
          </button>
          <span class="page-numbers">
            <button 
              *ngFor="let page of getPageNumbers()" 
              class="btn-page"
              [class.active]="page === currentPage"
              (click)="goToPage(page)">
              {{page}}
            </button>
          </span>
          <button 
            class="btn-pagination" 
            [disabled]="currentPage >= users.totalPages"
            (click)="goToPage(currentPage + 1)">
            Next →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-list-container {
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

    .table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th {
      background: #f8f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #e0e0e0;
    }

    .users-table td {
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .user-row:hover {
      background: #f8f9fa;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      background: #2196f3;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .user-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .user-id {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .user-email {
      color: #2196f3;
      font-weight: 500;
    }

    .tenant-name {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    .roles-container {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .role-badge {
      background: #f0f0f0;
      color: #2c3e50;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
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

    .status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .date-info {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      background: none;
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-icon:hover {
      background: #f0f0f0;
      transform: scale(1.1);
    }

    .btn-icon.delete:hover {
      background: #ffebee;
      border-color: #e74c3c;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .pagination-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
      padding: 1rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-pagination, .btn-page {
      background: none;
      border: 1px solid #ddd;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-page.active {
      background: #2196f3;
      color: white;
      border-color: #2196f3;
    }

    .btn-pagination:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .users-table {
        font-size: 0.9rem;
      }
      
      .user-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .pagination-container {
        flex-direction: column;
        gap: 1rem;
      }
      
      .search-bar {
        flex-direction: column;
      }
      
      .filters {
        flex-direction: column;
      }
    }
  `]
})
export class UserListComponent implements OnInit {
  loading = true;
  error = '';
  searchTerm = '';
  statusFilter = '';
  roleFilter = '';
  currentPage = 1;
  pageSize = 10;

  users: any = {
    items: [],
    totalItems: 0,
    totalPages: 0,
    page: 1
  };

  constructor(
    private apiService: ApiService,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = '';

    this.apiService.getUsers(
      this.currentPage, 
      this.pageSize, 
      this.searchTerm || undefined,
      this.statusFilter || undefined,
      this.roleFilter || undefined
    ).subscribe({
      next: (response) => {
        this.users = response;
        this.loading = false;
        console.log('Successfully loaded users:', response.totalItems, 'total items');
      },
      error: (error) => {
        this.error = this.apiService.handleError(error);
        this.loading = false;
        console.error('Failed to load users:', error);
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.users.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.users.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getInitials(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '??';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  confirmDelete(user: any) {
    this.dialogService.confirm(
      'Delete User',
      `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      'Delete',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        this.deleteUser(user);
      }
    });
  }

  deleteUser(user: any) {
    this.apiService.deleteUser(user.id).subscribe({
      next: () => {
        // Remove user from local list
        this.users.items = this.users.items.filter((u: any) => u.id !== user.id);
        this.users.totalItems--;
        
        this.dialogService.success(
          'User Deleted',
          `${user.firstName} ${user.lastName} has been successfully deleted.`
        );
        
        console.log('Successfully deleted user:', user.id);
      },
      error: (error) => {
        console.error('Failed to delete user:', error);
        this.dialogService.error(
          'Delete Failed',
          `Failed to delete ${user.firstName} ${user.lastName}. Please try again.`
        );
      }
    });
  }
} 