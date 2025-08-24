import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="user-detail-container">
      <div class="page-header">
        <div class="header-content">
          <h1>User Details</h1>
          <p>View and manage user information</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/authentication/users">
            ← Back to Users
          </button>
          <button class="btn-primary" [routerLink]="['/authentication/users/edit', userId]" *ngIf="user">
            ✏️ Edit User
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading user details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading User</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadUser()">Try Again</button>
      </div>

      <!-- User Details -->
      <div *ngIf="!loading && !error && user" class="user-details">
        <!-- User Profile Card -->
        <div class="profile-card">
          <div class="profile-header">
            <div class="user-avatar">{{getInitials(user.firstName, user.lastName)}}</div>
            <div class="user-info">
              <h2>{{user.firstName}} {{user.lastName}}</h2>
              <p class="user-email">{{user.email}}</p>
              <div class="status-badges">
                <span class="status-badge" [class]="'status-' + user.status?.toLowerCase()">
                  {{user.status || 'Active'}}
                </span>
                <span class="verification-badge" [class.verified]="user.emailVerified">
                  {{user.emailVerified ? '✓ Email Verified' : '✗ Email Unverified'}}
                </span>
              </div>
            </div>
          </div>
          
          <div class="profile-actions">
            <button class="action-btn" (click)="resetPassword()" [disabled]="actionLoading">
              🔑 Reset Password
            </button>
            <button class="action-btn" (click)="toggleStatus()" [disabled]="actionLoading">
              {{user.status === 'Active' ? '❌ Deactivate' : '✅ Activate'}}
            </button>
            <button class="action-btn" (click)="sendVerification()" [disabled]="actionLoading || user.emailVerified">
              📧 Send Verification
            </button>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="details-grid">
          <!-- Basic Information -->
          <div class="detail-section">
            <h3>Basic Information</h3>
            <div class="detail-items">
              <div class="detail-item">
                <label>User ID</label>
                <span>{{user.id}}</span>
              </div>
              <div class="detail-item">
                <label>Full Name</label>
                <span>{{user.firstName}} {{user.lastName}}</span>
              </div>
              <div class="detail-item">
                <label>Email</label>
                <span>{{user.email}}</span>
              </div>
              <div class="detail-item">
                <label>Phone Number</label>
                <span>{{user.phoneNumber || 'Not provided'}}</span>
              </div>
            </div>
          </div>

          <!-- Account Status -->
          <div class="detail-section">
            <h3>Account Status</h3>
            <div class="detail-items">
              <div class="detail-item">
                <label>Status</label>
                <span class="status-badge" [class]="'status-' + user.status?.toLowerCase()">
                  {{user.status || 'Active'}}
                </span>
              </div>
              <div class="detail-item">
                <label>Email Verified</label>
                <span class="verification-status" [class.verified]="user.emailVerified">
                  {{user.emailVerified ? 'Yes' : 'No'}}
                </span>
              </div>
              <div class="detail-item">
                <label>Phone Verified</label>
                <span class="verification-status" [class.verified]="user.phoneVerified">
                  {{user.phoneVerified ? 'Yes' : 'No'}}
                </span>
              </div>
              <div class="detail-item">
                <label>Password Change Required</label>
                <span [class.highlight]="user.requirePasswordChange">
                  {{user.requirePasswordChange ? 'Yes' : 'No'}}
                </span>
              </div>
            </div>
          </div>

          <!-- Tenant Information -->
          <div class="detail-section">
            <h3>Organization</h3>
            <div class="detail-items">
              <div class="detail-item">
                <label>Tenant ID</label>
                <span>{{user.tenantId}}</span>
              </div>
              <div class="detail-item">
                <label>Tenant Name</label>
                <span>{{getTenantName(user.tenantId)}}</span>
              </div>
            </div>
          </div>

          <!-- Roles and Permissions -->
          <div class="detail-section">
            <h3>Roles & Permissions</h3>
            <div class="roles-container">
              <div *ngFor="let role of user.roles" class="role-card">
                <div class="role-name">{{role}}</div>
                <div class="role-description">{{getRoleDescription(role)}}</div>
              </div>
              <div *ngIf="user.roles?.length === 0" class="no-roles">
                No roles assigned
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="activity-section">
          <h3>Recent Activity</h3>
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-icon">👤</div>
              <div class="timeline-content">
                <h4>Account Created</h4>
                <p>User account was created</p>
                <span class="timeline-date">{{formatDate(user.createdAt)}}</span>
              </div>
            </div>
            <div class="timeline-item" *ngIf="user.lastLoginAt">
              <div class="timeline-icon">🔐</div>
              <div class="timeline-content">
                <h4>Last Login</h4>
                <p>User logged into the system</p>
                <span class="timeline-date">{{formatDate(user.lastLoginAt)}}</span>
              </div>
            </div>
            <div class="timeline-item" *ngIf="user.updatedAt">
              <div class="timeline-icon">✏️</div>
              <div class="timeline-content">
                <h4>Profile Updated</h4>
                <p>User profile information was modified</p>
                <span class="timeline-date">{{formatDate(user.updatedAt)}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="stats-section">
          <h3>Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{userStats.loginCount}}</div>
              <div class="stat-label">Total Logins</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{userStats.sessionCount}}</div>
              <div class="stat-label">Active Sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{userStats.daysSinceCreated}}</div>
              <div class="stat-label">Days Since Created</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{userStats.daysSinceLogin}}</div>
              <div class="stat-label">Days Since Last Login</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Result Toast -->
      <div *ngIf="actionMessage" class="toast" [class.success]="actionSuccess" [class.error]="!actionSuccess">
        {{actionMessage}}
      </div>
    </div>
  `,
  styles: [`
    .user-detail-container {
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

    .header-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
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

    .btn-primary:hover {
      background: #1976d2;
      transform: translateY(-2px);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
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

    .user-details {
      display: grid;
      gap: 2rem;
    }

    .profile-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .user-avatar {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1.5rem;
    }

    .user-info h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
    }

    .user-email {
      margin: 0 0 1rem 0;
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .status-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .status-badge, .verification-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-active {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .status-inactive {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .status-pending {
      background: rgba(255, 152, 0, 0.2);
      color: #ff9800;
    }

    .verification-badge {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .verification-badge.verified {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .profile-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .action-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .detail-section {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .detail-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.2rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
    }

    .detail-items {
      display: grid;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item label {
      font-weight: 500;
      color: #7f8c8d;
    }

    .detail-item span {
      color: #2c3e50;
    }

    .verification-status.verified {
      color: #27ae60;
      font-weight: 500;
    }

    .highlight {
      color: #e74c3c !important;
      font-weight: 500;
    }

    .roles-container {
      display: grid;
      gap: 0.75rem;
    }

    .role-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1rem;
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

    .no-roles {
      color: #7f8c8d;
      font-style: italic;
      text-align: center;
      padding: 1rem;
    }

    .activity-section, .stats-section {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .activity-section h3, .stats-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.2rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
    }

    .timeline {
      display: grid;
      gap: 1rem;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
    }

    .timeline-icon {
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      background: #e3f2fd;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .timeline-content h4 {
      margin: 0 0 0.25rem 0;
      color: #2c3e50;
    }

    .timeline-content p {
      margin: 0 0 0.5rem 0;
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .timeline-date {
      color: #7f8c8d;
      font-size: 0.8rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      text-align: center;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: #2196f3;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #7f8c8d;
      font-size: 0.9rem;
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

    @media (max-width: 768px) {
      .user-detail-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .profile-header {
        flex-direction: column;
        text-align: center;
      }
      
      .details-grid {
        grid-template-columns: 1fr;
      }
      
      .profile-actions {
        justify-content: center;
      }
    }
  `]
})
export class UserDetailComponent implements OnInit {
  loading = true;
  error = '';
  actionLoading = false;
  actionMessage = '';
  actionSuccess = false;
  userId: string | null = null;
  user: any = null;

  userStats = {
    loginCount: 0,
    sessionCount: 0,
    daysSinceCreated: 0,
    daysSinceLogin: 0
  };

  availableTenants: any[] = [];
  roleDescriptions: { [key: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('id');
      if (this.userId) {
        this.loadUser();
      }
    });
  }

  loadUser() {
    if (!this.userId) return;
    
    this.loading = true;
    this.error = '';

    this.apiService.getUser(this.userId).subscribe({
      next: (userData) => {
        this.user = userData;
        this.loading = false;
        
        // Load user statistics
        this.loadUserStats();
        
        // Load available tenants
        this.loadTenants();
        
        // Load role descriptions
        this.loadRoleDescriptions();
      },
      error: (error) => {
        this.error = 'Failed to load user data.';
        this.loading = false;
        console.error('Error loading user:', error);
      }
    });
  }

  private loadUserStats() {
    // Load user statistics from API
    this.apiService.getUserStatistics().subscribe({
      next: (stats) => {
        this.userStats = {
          loginCount: stats?.loginCount || 0,
          sessionCount: stats?.sessionCount || 0,
          daysSinceCreated: stats?.daysSinceCreated || 0,
          daysSinceLogin: stats?.daysSinceLogin || 0
        };
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
      }
    });
  }

  private loadTenants() {
    this.apiService.getTenants().subscribe({
      next: (response) => {
        if (response && typeof response === 'object' && 'items' in response) {
          this.availableTenants = response.items || [];
        } else if (Array.isArray(response)) {
          this.availableTenants = response;
        }
      },
      error: (error) => {
        console.error('Error loading tenants:', error);
      }
    });
  }

  private loadRoleDescriptions() {
    this.apiService.getRoles().subscribe({
      next: (roles) => {
        if (Array.isArray(roles)) {
          roles.forEach(role => {
            this.roleDescriptions[role.name] = role.description || 'No description available';
          });
        }
      },
      error: (error) => {
        console.error('Error loading role descriptions:', error);
      }
    });
  }

  getInitials(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '??';
  }

  getTenantName(tenantId: string): string {
    const tenant = this.availableTenants.find(t => t.id === tenantId);
    return tenant?.name || 'Unknown Tenant';
  }

  getRoleDescription(roleName: string): string {
    return this.roleDescriptions[roleName] || 'No description available';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  resetPassword() {
    this.actionLoading = true;
    
    this.apiService.resetUserPassword(this.userId!).subscribe({
      next: () => {
        this.actionLoading = false;
        this.showActionMessage('Password reset email sent successfully!', true);
      },
      error: (error) => {
        this.actionLoading = false;
        this.showActionMessage('Failed to send password reset email.', false);
        console.error('Error resetting password:', error);
      }
    });
  }

  toggleStatus() {
    this.actionLoading = true;
    const newStatus = this.user.status === 'Active' ? 'Inactive' : 'Active';
    
    this.apiService.enableUser(this.userId!, newStatus === 'Active').subscribe({
      next: () => {
        this.user.status = newStatus;
        this.actionLoading = false;
        this.showActionMessage(`User ${this.user.status.toLowerCase()} successfully!`, true);
      },
      error: (error) => {
        this.actionLoading = false;
        this.showActionMessage('Failed to update user status.', false);
        console.error('Error updating user status:', error);
      }
    });
  }

  sendVerification() {
    this.actionLoading = true;
    
    this.apiService.sendUserVerification(this.userId!).subscribe({
      next: () => {
        this.actionLoading = false;
        this.showActionMessage('Verification email sent successfully!', true);
      },
      error: (error) => {
        this.actionLoading = false;
        this.showActionMessage('Failed to send verification email.', false);
        console.error('Error sending verification:', error);
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