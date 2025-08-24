import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { RbacService } from '../../../core/services/rbac.service';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="role-form-container">
      <div class="page-header">
        <div class="header-content">
          <h1>{{isEditMode ? 'Edit Role' : 'Create New Role'}}</h1>
          <p>{{isEditMode ? 'Update role information and permissions' : 'Define a new role with specific permissions'}}</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/rbac/roles">
            ← Back to Roles
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{isEditMode ? 'Loading role data...' : 'Initializing form...'}}</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadRole()" *ngIf="isEditMode">Try Again</button>
      </div>

      <!-- Role Form -->
      <form *ngIf="!loading && !error" (ngSubmit)="onSubmit()" #roleForm="ngForm" class="role-form">
        <div class="form-sections">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>🛡️ Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="name">Role Name *</label>
                <input 
                  type="text" 
                  id="name"
                  [(ngModel)]="role.name"
                  name="name"
                  required
                  class="form-input"
                  [class.error]="submitted && !role.name"
                  placeholder="Enter role name">
                <div *ngIf="submitted && !role.name" class="error-message">
                  Role name is required
                </div>
              </div>

              <div class="form-group">
                <label for="type">Role Type</label>
                <select id="type" [(ngModel)]="role.type" name="type" class="form-select">
                  <option value="System">🔒 System Role</option>
                  <option value="Custom">⚙️ Custom Role</option>
                </select>
              </div>

              <div class="form-group">
                <label for="status">Status</label>
                <select id="status" [(ngModel)]="role.status" name="status" class="form-select">
                  <option value="Active">🟢 Active</option>
                  <option value="Inactive">🔴 Inactive</option>
                </select>
              </div>

              <div class="form-group">
                <label for="parentRole">Parent Role</label>
                <select id="parentRole" [(ngModel)]="role.parentRoleId" name="parentRole" class="form-select">
                  <option value="">No Parent Role</option>
                  <option *ngFor="let parentRole of availableParentRoles" [value]="parentRole.id">
                    {{parentRole.name}}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-group full-width">
              <label for="description">Description *</label>
              <textarea 
                id="description"
                [(ngModel)]="role.description"
                name="description"
                required
                rows="3"
                class="form-textarea"
                [class.error]="submitted && !role.description"
                placeholder="Describe the purpose and scope of this role"></textarea>
              <div *ngIf="submitted && !role.description" class="error-message">
                Role description is required
              </div>
            </div>
          </div>

          <!-- Permissions -->
          <div class="form-section">
            <h3>🔑 Permissions</h3>
            <div class="permissions-section">
              <div class="permissions-header">
                <div class="permission-actions">
                  <button type="button" class="btn-outline" (click)="selectAllPermissions()">
                    ✅ Select All
                  </button>
                  <button type="button" class="btn-outline" (click)="clearAllPermissions()">
                    ❌ Clear All
                  </button>
                  <div class="permission-count">
                    {{getSelectedPermissionsCount()}} of {{getTotalPermissionsCount()}} permissions selected
                  </div>
                </div>
              </div>

              <div class="permission-categories">
                <div *ngFor="let category of permissionCategories" class="category-section">
                  <div class="category-header">
                    <label class="category-checkbox">
                      <input 
                        type="checkbox"
                        [checked]="isCategorySelected(category)"
                        [indeterminate]="isCategoryPartiallySelected(category)"
                        (change)="toggleCategory(category, $event)">
                      <span class="category-title">{{category.title}}</span>
                      <span class="category-icon">{{category.icon}}</span>
                    </label>
                    <div class="category-description">{{category.description}}</div>
                  </div>

                  <div class="permissions-grid">
                    <label *ngFor="let permission of category.permissions" class="permission-item">
                      <input 
                        type="checkbox"
                        [checked]="isPermissionSelected(permission.key)"
                        (change)="togglePermission(permission.key, $event)">
                      <div class="permission-info">
                        <span class="permission-name">{{permission.name}}</span>
                        <span class="permission-description">{{permission.description}}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Role Preview -->
          <div class="form-section">
            <h3>👁️ Role Preview</h3>
            <div class="role-preview">
              <div class="preview-card">
                <div class="preview-header">
                  <div class="role-name">{{role.name || 'New Role'}}</div>
                  <div class="role-type">{{role.type || 'Custom'}}</div>
                </div>
                <div class="preview-description">{{role.description || 'No description provided'}}</div>
                <div class="preview-permissions">
                  <strong>Permissions ({{getSelectedPermissionsCount()}}):</strong>
                  <div class="permission-tags">
                    <span *ngFor="let permission of getSelectedPermissionsList()" class="permission-tag">
                      {{permission}}
                    </span>
                    <span *ngIf="getSelectedPermissionsCount() === 0" class="no-permissions">
                      No permissions selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" routerLink="/rbac/roles">
            Cancel
          </button>
          <button type="submit" class="btn-primary" [disabled]="saving || !roleForm.valid">
            {{saving ? '💾 Saving...' : (isEditMode ? '💾 Update Role' : '🚀 Create Role')}}
          </button>
        </div>
      </form>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="success-container">
        <div class="success-icon">✅</div>
        <h3>Success!</h3>
        <p>{{successMessage}}</p>
        <button class="btn-primary" routerLink="/rbac/roles">Go to Roles</button>
      </div>
    </div>
  `,
  styles: [`
    .role-form-container {
      padding: 2rem;
      max-width: 1200px;
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

    .role-form {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .form-sections {
      padding: 2rem;
    }

    .form-section {
      margin-bottom: 2.5rem;
    }

    .form-section:last-child {
      margin-bottom: 0;
    }

    .form-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.3rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      color: #2c3e50;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input, .form-select, .form-textarea {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .form-input.error, .form-select.error, .form-textarea.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .permissions-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .permissions-header {
      margin-bottom: 1.5rem;
    }

    .permission-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .permission-count {
      color: #7f8c8d;
      font-size: 0.9rem;
      margin-left: auto;
    }

    .category-section {
      margin-bottom: 2rem;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .category-header {
      background: #e3f2fd;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .category-checkbox {
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      font-weight: 600;
      color: #2c3e50;
    }

    .category-title {
      flex: 1;
    }

    .category-icon {
      font-size: 1.2rem;
    }

    .category-description {
      color: #7f8c8d;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 0.5rem;
      padding: 1rem;
    }

    .permission-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .permission-item:hover {
      background: #f8f9fa;
    }

    .permission-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
    }

    .permission-info {
      flex: 1;
    }

    .permission-name {
      font-weight: 500;
      color: #2c3e50;
      display: block;
    }

    .permission-description {
      color: #7f8c8d;
      font-size: 0.85rem;
    }

    .role-preview {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .preview-card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #e0e0e0;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .role-name {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .role-type {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .preview-description {
      color: #7f8c8d;
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .preview-permissions strong {
      color: #2c3e50;
      display: block;
      margin-bottom: 0.5rem;
    }

    .permission-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .permission-tag {
      background: #e8f5e8;
      color: #2e7d32;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .no-permissions {
      color: #7f8c8d;
      font-style: italic;
    }

    .loading-container, .error-container, .success-container {
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

    .success-container {
      color: #27ae60;
    }

    .error-icon, .success-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .btn-primary, .btn-secondary, .btn-outline {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      border: none;
    }

         .btn-primary {
       background: #e5006e;
       color: white;
       border-radius: 8px;
       box-shadow: 0 2px 4px rgba(229, 0, 110, 0.2);
     }

     .btn-primary:hover:not(:disabled) {
       background: #c2005a;
       transform: translateY(-2px);
       box-shadow: 0 4px 8px rgba(229, 0, 110, 0.3);
     }

    .btn-primary:disabled {
      background: #bbb;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-outline {
      background: white;
      color: #2196f3;
      border: 1px solid #2196f3;
    }

    .btn-outline:hover {
      background: #2196f3;
      color: white;
    }

    @media (max-width: 768px) {
      .role-form-container {
        padding: 1rem;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .permissions-grid {
        grid-template-columns: 1fr;
      }
      
      .permission-actions {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class RoleFormComponent implements OnInit {
  loading = true;
  saving = false;
  submitted = false;
  error = '';
  successMessage = '';
  isEditMode = false;
  roleId: string | null = null;

  role = {
    name: '',
    description: '',
    type: 'Custom',
    status: 'Active',
    parentRoleId: '',
    permissions: [] as string[]
  };

  availableParentRoles = [
    { id: 'role-admin', name: 'Administrator' },
    { id: 'role-manager', name: 'Manager' },
    { id: 'role-user', name: 'User' }
  ];

  permissionCategories = [
    {
      title: 'User Management',
      icon: '👥',
      description: 'Permissions related to managing users and their accounts',
      permissions: [
        { key: 'users.create', name: 'Create Users', description: 'Add new users to the system' },
        { key: 'users.read', name: 'View Users', description: 'View user profiles and information' },
        { key: 'users.update', name: 'Edit Users', description: 'Modify user information and settings' },
        { key: 'users.delete', name: 'Delete Users', description: 'Remove users from the system' },
        { key: 'users.manage_roles', name: 'Manage User Roles', description: 'Assign and modify user roles' }
      ]
    },
    {
      title: 'Tenant Management',
      icon: '🏢',
      description: 'Permissions for managing tenant organizations',
      permissions: [
        { key: 'tenants.onboard', name: 'Onboard Tenants', description: 'Onboard new tenant organizations' },
        { key: 'tenants.read', name: 'View Tenants', description: 'View tenant information and settings' },
        { key: 'tenants.update', name: 'Edit Tenants', description: 'Modify tenant settings and configuration' },
        { key: 'tenants.delete', name: 'Delete Tenants', description: 'Remove tenant organizations' },
        { key: 'tenants.billing', name: 'Manage Billing', description: 'Access billing and subscription information' }
      ]
    },
    {
      title: 'Role & Permission Management',
      icon: '🛡️',
      description: 'Permissions for managing roles and permissions',
      permissions: [
        { key: 'roles.create', name: 'Create Roles', description: 'Create new roles and permission sets' },
        { key: 'roles.read', name: 'View Roles', description: 'View roles and their permissions' },
        { key: 'roles.update', name: 'Edit Roles', description: 'Modify role permissions and settings' },
        { key: 'roles.delete', name: 'Delete Roles', description: 'Remove roles from the system' },
        { key: 'permissions.manage', name: 'Manage Permissions', description: 'Create and modify permissions' }
      ]
    },
    {
      title: 'Notifications',
      icon: '📧',
      description: 'Permissions for notification and messaging system',
      permissions: [
        { key: 'notifications.send', name: 'Send Notifications', description: 'Send messages and notifications' },
        { key: 'notifications.read', name: 'View Notifications', description: 'View notification history and logs' },
        { key: 'notifications.templates', name: 'Manage Templates', description: 'Create and edit notification templates' },
        { key: 'notifications.settings', name: 'Notification Settings', description: 'Configure notification preferences' }
      ]
    },
    {
      title: 'Audit & Compliance',
      icon: '📋',
      description: 'Permissions for audit logging and compliance features',
      permissions: [
        { key: 'audit.read', name: 'View Audit Logs', description: 'Access audit trails and logs' },
        { key: 'audit.export', name: 'Export Audit Data', description: 'Export audit logs and reports' },
        { key: 'compliance.reports', name: 'Compliance Reports', description: 'Generate compliance reports' },
        { key: 'security.manage', name: 'Security Settings', description: 'Manage security configurations' }
      ]
    },
    {
      title: 'System Administration',
      icon: '⚙️',
      description: 'System-level administrative permissions',
      permissions: [
        { key: 'system.settings', name: 'System Settings', description: 'Access system-wide settings' },
        { key: 'system.maintenance', name: 'System Maintenance', description: 'Perform system maintenance tasks' },
        { key: 'api.access', name: 'API Access', description: 'Access system APIs and integrations' },
        { key: 'analytics.read', name: 'View Analytics', description: 'Access analytics and reporting data' }
      ]
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private dialogService: DialogService,
    private rbacService: RbacService
  ) {}

  ngOnInit() {
    this.roleId = this.route.snapshot.params['id'];
    this.isEditMode = !!this.roleId;

    if (this.isEditMode) {
      this.loadRole();
    } else {
      this.loading = false;
    }
  }

  loadRole() {
    if (!this.roleId) return;

    this.loading = true;
    this.error = '';

    this.rbacService.getRole(this.roleId).subscribe({
      next: (roleData) => {
        this.role = {
          name: roleData.name || '',
          description: roleData.description || '',
          type: roleData.type || 'Custom',
          status: roleData.status || 'Active',
          parentRoleId: roleData.parentRoleId || '',
          permissions: roleData.permissions?.map(p => typeof p === 'string' ? p : p.name) || []
        };
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load role data.';
        this.loading = false;
        console.error('Error loading role:', error);
      }
    });
  }

  onSubmit() {
    this.submitted = true;

    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;

    const roleData = {
      name: this.role.name,
      displayName: this.role.name, // Add displayName required by CreateRoleDto
      description: this.role.description,
      permissions: this.role.permissions
    };

    const apiCall = this.isEditMode ? 
      this.rbacService.updateRole(this.roleId!, roleData) :
      this.rbacService.createRole(roleData);

    apiCall.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.isEditMode ? 
          'Role updated successfully!' : 
          'Role created successfully!';
        
        this.dialogService.success(
          'Success!',
          this.successMessage
        ).subscribe(() => {
          this.router.navigate(['/rbac/roles']);
        });
      },
      error: (error) => {
        this.saving = false;
        this.error = 'Failed to save role. Please try again.';
        console.error('Error saving role:', error);
      }
    });
  }

  isFormValid(): boolean {
    return !!(this.role.name && this.role.description);
  }

  // Permission management methods
  isPermissionSelected(permissionKey: string): boolean {
    return this.role.permissions.includes(permissionKey);
  }

  togglePermission(permissionKey: string, event: any) {
    if (event.target.checked) {
      if (!this.role.permissions.includes(permissionKey)) {
        this.role.permissions.push(permissionKey);
      }
    } else {
      this.role.permissions = this.role.permissions.filter(p => p !== permissionKey);
    }
  }

  isCategorySelected(category: any): boolean {
    return category.permissions.every((p: any) => this.isPermissionSelected(p.key));
  }

  isCategoryPartiallySelected(category: any): boolean {
    const selectedCount = category.permissions.filter((p: any) => this.isPermissionSelected(p.key)).length;
    return selectedCount > 0 && selectedCount < category.permissions.length;
  }

  toggleCategory(category: any, event: any) {
    if (event.target.checked) {
      // Select all permissions in category
      category.permissions.forEach((p: any) => {
        if (!this.role.permissions.includes(p.key)) {
          this.role.permissions.push(p.key);
        }
      });
    } else {
      // Deselect all permissions in category
      category.permissions.forEach((p: any) => {
        this.role.permissions = this.role.permissions.filter(perm => perm !== p.key);
      });
    }
  }

  selectAllPermissions() {
    this.permissionCategories.forEach(category => {
      category.permissions.forEach(permission => {
        if (!this.role.permissions.includes(permission.key)) {
          this.role.permissions.push(permission.key);
        }
      });
    });
  }

  clearAllPermissions() {
    this.role.permissions = [];
  }

  getSelectedPermissionsCount(): number {
    return this.role.permissions.length;
  }

  getTotalPermissionsCount(): number {
    return this.permissionCategories.reduce((total, category) => total + category.permissions.length, 0);
  }

  getSelectedPermissionsList(): string[] {
    const allPermissions = this.permissionCategories.flatMap(cat => cat.permissions);
    return this.role.permissions.map(key => {
      const permission = allPermissions.find(p => p.key === key);
      return permission ? permission.name : key;
    });
  }
} 