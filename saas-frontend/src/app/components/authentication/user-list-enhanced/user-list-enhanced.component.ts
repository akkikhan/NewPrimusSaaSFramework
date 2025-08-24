import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { UserManagementService, User, UserFilters, BulkOperationRequest } from '../../../services/user-management.service';

@Component({
  selector: 'app-user-list-enhanced',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="user-list-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>User Management</h1>
          <p>Manage users, roles, and authentication settings - Enhanced Version</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="exportUsers()">
            📤 Export
          </button>
          <label class="btn-secondary import-btn">
            📥 Import
            <input type="file" accept=".csv" (change)="importUsers($event)" hidden>
          </label>
          <button class="btn-primary" (click)="createUser()">
            ➕ Create User
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-bar">
          <input 
            type="text" 
            [value]="searchTerm"
            (input)="onSearch($event)"
            placeholder="Search users by name, email, or role..."
            class="search-input">
          <button class="search-btn">🔍</button>
        </div>
        
        <div class="filters">
          <select [(ngModel)]="selectedStatus" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option *ngFor="let status of statusOptions" [value]="status">{{status}}</option>
          </select>
          
          <select [(ngModel)]="selectedRole" (change)="onFilterChange()" class="filter-select">
            <option value="">All Roles</option>
            <option *ngFor="let role of roleOptions" [value]="role">{{role}}</option>
          </select>

          <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="filter-select">
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      <!-- Bulk Actions -->
      <div class="bulk-actions" *ngIf="selectedUsers.size > 0">
        <div class="selected-count">
          {{selectedUsers.size}} user(s) selected
        </div>
        <div class="bulk-buttons">
          <button class="btn-secondary" (click)="performBulkOperation('activate')" 
                  [disabled]="bulkOperationInProgress">
            ✅ Activate
          </button>
          <button class="btn-secondary" (click)="performBulkOperation('deactivate')" 
                  [disabled]="bulkOperationInProgress">
            ❌ Deactivate
          </button>
          <button class="btn-danger" (click)="performBulkOperation('delete')" 
                  [disabled]="bulkOperationInProgress">
            🗑️ Delete
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div class="error-message" *ngIf="error">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <span>{{error}}</span>
          <button class="btn-secondary" (click)="loadUsers()">Retry</button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="(loading$ | async)">
        <div class="loading-spinner"></div>
        <p>Loading users...</p>
      </div>

      <!-- Users Table -->
      <div class="table-container" *ngIf="!(loading$ | async) && !error">
        <table class="users-table">
          <thead>
            <tr>
              <th class="checkbox-column">
                <input type="checkbox" 
                       [checked]="allUsersSelected" 
                       [indeterminate]="someUsersSelected"
                       (change)="toggleSelectAll()">
              </th>
              <th (click)="onSortChange('firstName')" class="sortable">
                Name
                <span class="sort-indicator" *ngIf="sortBy === 'firstName'">
                  {{sortOrder === 'asc' ? '↑' : '↓'}}
                </span>
              </th>
              <th (click)="onSortChange('email')" class="sortable">
                Email
                <span class="sort-indicator" *ngIf="sortBy === 'email'">
                  {{sortOrder === 'asc' ? '↑' : '↓'}}
                </span>
              </th>
              <th>Roles</th>
              <th (click)="onSortChange('status')" class="sortable">
                Status
                <span class="sort-indicator" *ngIf="sortBy === 'status'">
                  {{sortOrder === 'asc' ? '↑' : '↓'}}
                </span>
              </th>
              <th (click)="onSortChange('lastLoginAt')" class="sortable">
                Last Login
                <span class="sort-indicator" *ngIf="sortBy === 'lastLoginAt'">
                  {{sortOrder === 'asc' ? '↑' : '↓'}}
                </span>
              </th>
              <th (click)="onSortChange('createdAt')" class="sortable">
                Created
                <span class="sort-indicator" *ngIf="sortBy === 'createdAt'">
                  {{sortOrder === 'asc' ? '↑' : '↓'}}
                </span>
              </th>
              <th class="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users; trackBy: trackByUserId" class="user-row">
              <td>
                <input type="checkbox" 
                       [checked]="isUserSelected(user.id)"
                       (change)="toggleUserSelection(user.id)">
              </td>
              <td class="user-name">
                <div class="name-cell">
                  <div class="user-avatar">{{user.firstName.charAt(0)}}{{user.lastName.charAt(0)}}</div>
                  <div class="name-info">
                    <div class="full-name">{{user.firstName}} {{user.lastName}}</div>
                    <div class="user-id">ID: {{user.id}}</div>
                  </div>
                </div>
              </td>
              <td class="user-email">
                <div class="email-cell">
                  <span class="email">{{user.email}}</span>
                  <span class="verification-badges">
                    <span class="badge verified" *ngIf="user.emailVerified" title="Email Verified">✓</span>
                    <span class="badge verified" *ngIf="user.phoneVerified" title="Phone Verified">📱</span>
                  </span>
                </div>
              </td>
              <td class="user-roles">
                <div class="roles-container">
                  <span *ngFor="let role of user.roles" 
                        class="role-badge" 
                        [class]="getRoleClass([role])">
                    {{role}}
                  </span>
                </div>
              </td>
              <td class="user-status">
                <span class="status-badge" [class]="getStatusClass(user.status)">
                  {{user.status}}
                </span>
              </td>
              <td class="last-login">
                <span *ngIf="user.lastLoginAt; else noLogin">
                  {{user.lastLoginAt | date:'short'}}
                </span>
                <ng-template #noLogin>
                  <span class="no-login">Never</span>
                </ng-template>
              </td>
              <td class="created-date">
                {{user.createdAt | date:'shortDate'}}
              </td>
              <td class="actions">
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewUser(user)" title="View Details">
                    👁️
                  </button>
                  <button class="action-btn edit" (click)="editUser(user)" title="Edit User">
                    ✏️
                  </button>
                  <button class="action-btn toggle" 
                          (click)="toggleUserStatus(user)" 
                          [title]="user.status === 'Active' ? 'Deactivate' : 'Activate'">
                    {{user.status === 'Active' ? '⏸️' : '▶️'}}
                  </button>
                  <button class="action-btn reset" (click)="resetPassword(user)" title="Reset Password">
                    🔄
                  </button>
                  <button class="action-btn delete" (click)="deleteUser(user)" title="Delete User">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="users.length === 0">
          <div class="empty-icon">👥</div>
          <h3>No users found</h3>
          <p>{{searchTerm ? 'Try adjusting your search criteria' : 'Start by creating your first user'}}</p>
          <button class="btn-primary" (click)="createUser()">Create User</button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="totalPages > 1">
        <div class="pagination-info">
          Showing {{((currentPage - 1) * pageSize) + 1}} to {{Math.min(currentPage * pageSize, totalUsers)}} of {{totalUsers}} users
        </div>
        <div class="pagination-controls">
          <button class="page-btn" 
                  [disabled]="currentPage === 1" 
                  (click)="onPageChange(currentPage - 1)">
            ← Previous
          </button>
          
          <div class="page-numbers">
            <button *ngFor="let page of getPageNumbers()" 
                    class="page-btn" 
                    [class.active]="page === currentPage"
                    (click)="onPageChange(page)">
              {{page}}
            </button>
          </div>
          
          <button class="page-btn" 
                  [disabled]="currentPage === totalPages" 
                  (click)="onPageChange(currentPage + 1)">
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

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .btn-primary, .btn-secondary, .btn-danger {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #ecf0f1;
      color: #2c3e50;
      border: 1px solid #bdc3c7;
    }

    .btn-secondary:hover {
      background: #d5dbdb;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
    }

    .import-btn {
      position: relative;
      cursor: pointer;
    }

    .search-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 1px solid #ecf0f1;
    }

    .search-bar {
      display: flex;
      gap: 1rem;
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
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .search-btn {
      background: #3498db;
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

    .bulk-actions {
      background: #e8f6f3;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #1abc9c;
    }

    .selected-count {
      font-weight: 500;
      color: #16a085;
    }

    .bulk-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .error-message {
      background: #fdedec;
      border: 1px solid #e74c3c;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .error-icon {
      font-size: 1.5rem;
    }

    .loading-container {
      text-align: center;
      padding: 3rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #ecf0f1;
      margin-bottom: 1.5rem;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th,
    .users-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }

    .users-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }

    .users-table th.sortable {
      cursor: pointer;
      user-select: none;
    }

    .users-table th.sortable:hover {
      background: #e9ecef;
    }

    .sort-indicator {
      margin-left: 0.5rem;
      color: #3498db;
    }

    .checkbox-column {
      width: 40px;
    }

    .actions-column {
      width: 200px;
    }

    .user-row:hover {
      background: #f8f9fa;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3498db;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .name-info {
      flex: 1;
    }

    .full-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .user-id {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .email-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .verification-badges {
      display: flex;
      gap: 0.25rem;
    }

    .badge {
      padding: 0.125rem 0.25rem;
      border-radius: 4px;
      font-size: 0.7rem;
    }

    .badge.verified {
      background: #d4edda;
      color: #155724;
    }

    .roles-container {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .role-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .role-badge.role-admin {
      background: #ffeaa7;
      color: #2d3436;
    }

    .role-badge.role-manager {
      background: #fab1a0;
      color: #2d3436;
    }

    .role-badge.role-user {
      background: #74b9ff;
      color: white;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-badge.status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.status-inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .no-login {
      color: #7f8c8d;
      font-style: italic;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      background: none;
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .action-btn.view:hover {
      border-color: #3498db;
      background: #e3f2fd;
    }

    .action-btn.edit:hover {
      border-color: #f39c12;
      background: #fff8e1;
    }

    .action-btn.toggle:hover {
      border-color: #27ae60;
      background: #e8f5e8;
    }

    .action-btn.reset:hover {
      border-color: #9b59b6;
      background: #f3e5f5;
    }

    .action-btn.delete:hover {
      border-color: #e74c3c;
      background: #ffebee;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #7f8c8d;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #ecf0f1;
    }

    .pagination-info {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .page-numbers {
      display: flex;
      gap: 0.25rem;
    }

    .page-btn {
      background: white;
      border: 1px solid #ddd;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .page-btn:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #3498db;
    }

    .page-btn.active {
      background: #3498db;
      color: white;
      border-color: #3498db;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .user-list-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .filters {
        flex-direction: column;
      }
      
      .users-table {
        font-size: 0.9rem;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .pagination {
        flex-direction: column;
        gap: 1rem;
      }
    }
  `]
})
export class UserListEnhancedComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');
  private filtersSubject = new BehaviorSubject<Partial<UserFilters>>({});

  // Math for template
  Math = Math;

  // Observable data
  users$: Observable<User[]> | undefined;
  loading$: Observable<boolean> | undefined;
  
  // Component state
  users: User[] = [];
  totalUsers = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  
  // Filters
  searchTerm = '';
  selectedStatus = '';
  selectedRole = '';
  selectedTenant = '';
  sortBy = 'createdAt';
  sortOrder = 'desc';
  
  // Options
  statusOptions = ['Active', 'Inactive', 'Pending'];
  roleOptions = ['Admin', 'Manager', 'User', 'Viewer'];
  
  // Bulk operations
  selectedUsers: Set<string> = new Set();
  bulkOperationInProgress = false;
  
  // Error handling
  error: string | null = null;

  constructor(
    private router: Router,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    // Initialize observables
    this.users$ = this.userService.users$;
    this.loading$ = this.userService.loading$;
    
    this.setupFilters();
    this.loadUsers();
    this.subscribeToUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Setup reactive search
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.currentPage = 1;
      this.updateFilters();
    });

    // Setup reactive filters
    this.filtersSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(100),
      switchMap(() => this.loadUsersFromAPI())
    ).subscribe({
      next: (response) => {
        this.users = response.data;
        this.totalUsers = response.total;
        this.totalPages = response.totalPages;
        this.error = null;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.error = error.message || 'Failed to load users';
      }
    });
  }

  private subscribeToUsers(): void {
    this.users$?.pipe(takeUntil(this.destroy$)).subscribe((users: User[]) => {
      this.users = users;
    });
  }

  private loadUsersFromAPI() {
    const filters: UserFilters = {
      page: this.currentPage,
      size: this.pageSize,
      search: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
      role: this.selectedRole || undefined,
      tenantId: this.selectedTenant || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    return this.userService.getUsers(filters);
  }

  loadUsers(): void {
    this.updateFilters();
  }

  private updateFilters(): void {
    this.filtersSubject.next({
      page: this.currentPage,
      size: this.pageSize,
      search: this.searchTerm,
      status: this.selectedStatus,
      role: this.selectedRole,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.updateFilters();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updateFilters();
  }

  onSortChange(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.updateFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateFilters();
  }

  viewUser(user: User): void {
    this.router.navigate(['/authentication/users', user.id]);
  }

  editUser(user: User): void {
    this.router.navigate(['/authentication/users/edit', user.id]);
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadUsers(); // Refresh the list
        },
        error: (error) => {
          alert(`Failed to delete user: ${error.message}`);
        }
      });
    }
  }

  createUser(): void {
    this.router.navigate(['/authentication/users/create']);
  }

  resetPassword(user: User): void {
    if (confirm(`Reset password for ${user.firstName} ${user.lastName}?`)) {
      this.userService.resetUserPassword(user.id, true).subscribe({
        next: (result) => {
          if (result.temporaryPassword) {
            alert(`Password reset successfully! Temporary password: ${result.temporaryPassword}`);
          } else {
            alert('Password reset email sent successfully!');
          }
        },
        error: (error) => {
          alert(`Failed to reset password: ${error.message}`);
        }
      });
    }
  }

  toggleUserStatus(user: User): void {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    
    this.userService.updateUserStatus(user.id, newStatus).subscribe({
      next: () => {
        user.status = newStatus;
      },
      error: (error) => {
        alert(`Failed to update user status: ${error.message}`);
      }
    });
  }

  // Bulk operations
  toggleUserSelection(userId: string): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  toggleSelectAll(): void {
    if (this.selectedUsers.size === this.users.length) {
      this.selectedUsers.clear();
    } else {
      this.selectedUsers.clear();
      this.users.forEach(user => this.selectedUsers.add(user.id));
    }
  }

  performBulkOperation(operation: 'delete' | 'activate' | 'deactivate' | 'assign-role'): void {
    if (this.selectedUsers.size === 0) {
      alert('Please select users first');
      return;
    }

    const userIds = Array.from(this.selectedUsers);
    let message = '';
    
    switch (operation) {
      case 'delete':
        message = `Delete ${userIds.length} selected users?`;
        break;
      case 'activate':
        message = `Activate ${userIds.length} selected users?`;
        break;
      case 'deactivate':
        message = `Deactivate ${userIds.length} selected users?`;
        break;
      case 'assign-role':
        const role = prompt('Enter role to assign:');
        if (!role) return;
        message = `Assign role "${role}" to ${userIds.length} selected users?`;
        break;
    }

    if (confirm(message)) {
      this.bulkOperationInProgress = true;
      
      const request: BulkOperationRequest = {
        operation,
        userIds,
        parameters: operation === 'assign-role' ? { role: prompt('Enter role:') } : undefined
      };

      this.userService.bulkOperations(request)
        .pipe(finalize(() => this.bulkOperationInProgress = false))
        .subscribe({
          next: (result) => {
            alert(`Bulk operation completed: ${result.successful} successful, ${result.failed} failed`);
            this.selectedUsers.clear();
            this.loadUsers();
          },
          error: (error) => {
            alert(`Bulk operation failed: ${error.message}`);
          }
        });
    }
  }

  exportUsers(): void {
    const filters = {
      search: this.searchTerm,
      status: this.selectedStatus,
      role: this.selectedRole,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    this.userService.exportUsers(filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        alert(`Export failed: ${error.message}`);
      }
    });
  }

  importUsers(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      this.userService.importUsers(file).subscribe({
        next: (result) => {
          alert(`Import completed: ${result.success} successful, ${result.failed} failed`);
          if (result.errors.length > 0) {
            console.error('Import errors:', result.errors);
          }
          this.loadUsers();
        },
        error: (error) => {
          alert(`Import failed: ${error.message}`);
        }
      });
    }
  }

  // Utility methods
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'pending': return 'status-pending';
      default: return 'status-unknown';
    }
  }

  getRoleClass(roles: string[]): string {
    if (roles.includes('Admin')) return 'role-admin';
    if (roles.includes('Manager')) return 'role-manager';
    return 'role-user';
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers.has(userId);
  }

  get allUsersSelected(): boolean {
    return this.users.length > 0 && this.selectedUsers.size === this.users.length;
  }

  get someUsersSelected(): boolean {
    return this.selectedUsers.size > 0 && this.selectedUsers.size < this.users.length;
  }

  trackByUserId(index: number, user: User): string {
    return user.id;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 7; // Show max 7 page numbers
    
    if (this.totalPages <= maxPages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic for large page counts
      const half = Math.floor(maxPages / 2);
      let start = Math.max(1, this.currentPage - half);
      let end = Math.min(this.totalPages, start + maxPages - 1);
      
      if (end - start + 1 < maxPages) {
        start = Math.max(1, end - maxPages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
} 