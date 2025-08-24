import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="user-form-container">
      <div class="page-header">
        <div class="header-content">
          <h1>{{isEditMode ? 'Edit User' : 'Create New User'}}</h1>
          <p>{{isEditMode ? 'Update user information and permissions' : 'Add a new user to the system'}}</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/authentication/users">
            ← Back to Users
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{isEditMode ? 'Loading user data...' : 'Initializing form...'}}</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadUser()" *ngIf="isEditMode">Try Again</button>
      </div>

      <!-- User Form -->
      <form *ngIf="!loading && !error" (ngSubmit)="onSubmit()" class="user-form">
        <div class="form-sections">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="firstName">First Name *</label>
                <input 
                  type="text" 
                  id="firstName"
                  [(ngModel)]="user.firstName"
                  name="firstName"
                  required
                  class="form-input"
                  [class.error]="submitted && !user.firstName">
                <div *ngIf="submitted && !user.firstName" class="error-message">
                  First name is required
                </div>
              </div>

              <div class="form-group">
                <label for="lastName">Last Name *</label>
                <input 
                  type="text" 
                  id="lastName"
                  [(ngModel)]="user.lastName"
                  name="lastName"
                  required
                  class="form-input"
                  [class.error]="submitted && !user.lastName">
                <div *ngIf="submitted && !user.lastName" class="error-message">
                  Last name is required
                </div>
              </div>

              <div class="form-group">
                <label for="email">Email Address *</label>
                <input 
                  type="email" 
                  id="email"
                  [(ngModel)]="user.email"
                  name="email"
                  required
                  class="form-input"
                  [class.error]="submitted && (!user.email || !isValidEmail(user.email))">
                <div *ngIf="submitted && !user.email" class="error-message">
                  Email is required
                </div>
                <div *ngIf="submitted && user.email && !isValidEmail(user.email)" class="error-message">
                  Please enter a valid email address
                </div>
              </div>

              <div class="form-group">
                <label for="phoneNumber">Phone Number</label>
                <input 
                  type="tel" 
                  id="phoneNumber"
                  [(ngModel)]="user.phoneNumber"
                  name="phoneNumber"
                  class="form-input">
              </div>
            </div>
          </div>

          <!-- Authentication -->
          <div class="form-section" *ngIf="!isEditMode">
            <h3>Authentication</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="password">Password *</label>
                <input 
                  type="password" 
                  id="password"
                  [(ngModel)]="user.password"
                  name="password"
                  required
                  class="form-input"
                  [class.error]="submitted && (!user.password || user.password.length < 8)">
                <div *ngIf="submitted && !user.password" class="error-message">
                  Password is required
                </div>
                <div *ngIf="submitted && user.password && user.password.length < 8" class="error-message">
                  Password must be at least 8 characters
                </div>
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirm Password *</label>
                <input 
                  type="password" 
                  id="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  class="form-input"
                  [class.error]="submitted && (confirmPassword !== user.password)">
                <div *ngIf="submitted && confirmPassword !== user.password" class="error-message">
                  Passwords do not match
                </div>
              </div>
            </div>
          </div>

          <!-- Tenant and Status -->
          <div class="form-section">
            <h3>Organization</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="tenantId">Tenant *</label>
                <select 
                  id="tenantId"
                  [(ngModel)]="user.tenantId"
                  name="tenantId"
                  required
                  class="form-select"
                  [class.error]="submitted && !user.tenantId">
                  <option value="">Select Tenant</option>
                  <option *ngFor="let tenant of availableTenants" [value]="tenant.id">
                    {{tenant.name}}
                  </option>
                </select>
                <div *ngIf="submitted && !user.tenantId" class="error-message">
                  Please select a tenant
                </div>
              </div>

              <div class="form-group">
                <label for="status">Status</label>
                <select 
                  id="status"
                  [(ngModel)]="user.status"
                  name="status"
                  class="form-select">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Roles and Permissions -->
          <div class="form-section">
            <h3>Roles & Permissions</h3>
            <div class="roles-section">
              <div class="roles-grid">
                <div *ngFor="let role of availableRoles" class="role-item">
                  <label class="role-checkbox">
                    <input 
                      type="checkbox"
                      [checked]="isRoleSelected(role.name)"
                      (change)="toggleRole(role.name, $event)">
                    <span class="checkmark"></span>
                    <div class="role-info">
                      <div class="role-name">{{role.name}}</div>
                      <div class="role-description">{{role.description}}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Settings -->
          <div class="form-section">
            <h3>Additional Settings</h3>
            <div class="settings-grid">
              <label class="setting-item">
                <input 
                  type="checkbox"
                  [(ngModel)]="user.emailVerified"
                  name="emailVerified">
                <span class="setting-label">Email Verified</span>
                <span class="setting-description">Mark email as verified</span>
              </label>

              <label class="setting-item">
                <input 
                  type="checkbox"
                  [(ngModel)]="user.phoneVerified"
                  name="phoneVerified">
                <span class="setting-label">Phone Verified</span>
                <span class="setting-description">Mark phone number as verified</span>
              </label>

              <label class="setting-item">
                <input 
                  type="checkbox"
                  [(ngModel)]="user.requirePasswordChange"
                  name="requirePasswordChange">
                <span class="setting-label">Require Password Change</span>
                <span class="setting-description">User must change password on next login</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" routerLink="/authentication/users">
            Cancel
          </button>
          <button type="submit" class="btn-primary" [disabled]="saving">
            {{saving ? 'Saving...' : (isEditMode ? 'Update User' : 'Create User')}}
          </button>
        </div>
      </form>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="success-container">
        <div class="success-icon">✅</div>
        <h3>Success!</h3>
        <p>{{successMessage}}</p>
        <button class="btn-primary" routerLink="/authentication/users">Go to Users</button>
      </div>
    </div>
  `,
  styles: [`
    .user-form-container {
      padding: 2rem;
      max-width: 1000px;
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
      transform: translateY(-2px);
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

    .btn-secondary:hover {
      background: #e0e0e0;
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

    .user-form {
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

    .form-group label {
      color: #2c3e50;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input, .form-select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .form-input.error, .form-select.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .role-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .role-item:hover {
      border-color: #2196f3;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
    }

    .role-checkbox {
      display: flex;
      align-items: center;
      padding: 1rem;
      cursor: pointer;
      width: 100%;
      position: relative;
    }

    .role-checkbox input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      cursor: pointer;
    }

    .checkmark {
      width: 20px;
      height: 20px;
      border: 2px solid #ddd;
      border-radius: 4px;
      margin-right: 1rem;
      position: relative;
      transition: all 0.3s ease;
    }

    .role-checkbox input:checked + .checkmark {
      background: #2196f3;
      border-color: #2196f3;
    }

    .role-checkbox input:checked + .checkmark::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
    }

    .role-info {
      flex: 1;
    }

    .role-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .role-description {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .settings-grid {
      display: grid;
      gap: 1rem;
    }

    .setting-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .setting-item:hover {
      background: #f8f9fa;
      border-color: #2196f3;
    }

    .setting-item input[type="checkbox"] {
      margin: 0;
    }

    .setting-label {
      font-weight: 500;
      color: #2c3e50;
    }

    .setting-description {
      color: #7f8c8d;
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    @media (max-width: 768px) {
      .user-form-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .roles-grid {
        grid-template-columns: 1fr;
      }
      
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class UserFormComponent implements OnInit {
  loading = true;
  saving = false;
  submitted = false;
  error = '';
  successMessage = '';
  isEditMode = false;
  userId: string | null = null;
  confirmPassword = '';

  user = {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    tenantId: '',
    status: 'Active',
    roles: [] as string[],
    emailVerified: false,
    phoneVerified: false,
    requirePasswordChange: false
  };

  availableTenants = [
    { id: 'tenant-1', name: 'Default Tenant' },
    { id: 'tenant-2', name: 'Acme Corporation' },
    { id: 'tenant-3', name: 'TechStart Inc.' }
  ];

  availableRoles = [
    { name: 'Admin', description: 'Full system access and management capabilities' },
    { name: 'Manager', description: 'Team management and operational oversight' },
    { name: 'User', description: 'Standard user access with basic permissions' },
    { name: 'Viewer', description: 'Read-only access to system resources' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('id');
      this.isEditMode = !!this.userId;
      
      if (this.isEditMode) {
        this.loadUser();
      } else {
        this.loading = false;
      }
    });
  }

  loadUser() {
    if (!this.userId) return;
    
    this.loading = true;
    this.error = '';

    this.apiService.getUser(this.userId).subscribe({
      next: (userData) => {
        this.user = {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber || '',
          password: '',
          tenantId: userData.tenantId || 'default-tenant',
          status: userData.isEnabled ? 'Active' : 'Inactive',
          roles: userData.roles?.map((r: any) => r.roleName) || [],
          emailVerified: userData.emailVerified || false,
          phoneVerified: userData.phoneVerified || false,
          requirePasswordChange: false
        };
        this.loading = false;
        console.log('Successfully loaded user:', userData);
      },
      error: (error) => {
        this.error = this.apiService.handleError(error);
        this.loading = false;
        console.error('Failed to load user:', error);
      }
    });
  }

  onSubmit() {
    this.submitted = true;
    
    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;
    this.error = '';

    const userData = {
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      email: this.user.email,
      phoneNumber: this.user.phoneNumber,
      locale: 'en-US',
      timeZone: 'UTC',
      isEnabled: this.user.status === 'Active'
    };

    const apiCall = this.isEditMode 
      ? this.apiService.updateUser(this.userId!, userData)
      : this.apiService.createUser(userData);

    apiCall.subscribe({
      next: (result) => {
        this.saving = false;
        this.successMessage = this.isEditMode 
          ? 'User updated successfully!'
          : 'User created successfully!';
        
        console.log('Successfully saved user:', result);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/authentication/users']);
        }, 2000);
      },
      error: (error) => {
        this.saving = false;
        this.error = this.apiService.handleError(error);
        console.error('Failed to save user:', error);
      }
    });
  }

  isFormValid(): boolean {
    // Basic validation
    if (!this.user.firstName || !this.user.lastName || !this.user.email || !this.user.tenantId) {
      return false;
    }

    if (!this.isValidEmail(this.user.email)) {
      return false;
    }

    if (!this.isEditMode) {
      if (!this.user.password || this.user.password.length < 8) {
        return false;
      }
      
      if (this.confirmPassword !== this.user.password) {
        return false;
      }
    }

    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isRoleSelected(roleName: string): boolean {
    return this.user.roles.includes(roleName);
  }

  toggleRole(roleName: string, event: any) {
    if (event.target.checked) {
      if (!this.user.roles.includes(roleName)) {
        this.user.roles.push(roleName);
      }
    } else {
      this.user.roles = this.user.roles.filter(role => role !== roleName);
    }
  }
} 