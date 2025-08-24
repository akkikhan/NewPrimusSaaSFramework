import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DialogService } from '../../shared/services/dialog.service';
import { ToastService } from '../../shared/services/toast.service';

interface InviteUser {
  email: string;
  name: string;
  role: string;
  department?: string;
  customMessage?: string;
}

@Component({
  selector: 'app-user-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-invitation-container">
      <div class="page-header">
        <h1>Invite Users</h1>
        <p>Send invitations to users to join your tenant</p>
      </div>

      <!-- Tenant Info -->
      <div class="tenant-info-card" *ngIf="tenantInfo">
        <div class="info-header">
          <h3>{{tenantInfo.name}}</h3>
          <span class="badge" [class.badge-success]="tenantInfo.status === 'Active'">
            {{tenantInfo.status}}
          </span>
        </div>
        <div class="usage-metrics">
          <div class="metric">
            <label>Users</label>
            <div class="progress-container">
              <div class="progress-bar" [style.width.%]="getUsersPercentage()"></div>
            </div>
            <span class="metric-value">{{tenantInfo.userCount}} / {{tenantInfo.maxUsers}}</span>
          </div>
        </div>
      </div>

      <!-- Invitation Form -->
      <div class="invitation-form-card">
        <h2>New User Invitation</h2>
        
        <form #inviteForm="ngForm" (ngSubmit)="sendInvitation()">
          <div class="form-row">
            <div class="form-group">
              <label>Email Address *</label>
              <input 
                type="email" 
                [(ngModel)]="inviteData.email" 
                name="email"
                required
                class="form-control"
                placeholder="user@example.com">
            </div>
            
            <div class="form-group">
              <label>Full Name *</label>
              <input 
                type="text" 
                [(ngModel)]="inviteData.name" 
                name="name"
                required
                class="form-control"
                placeholder="John Doe">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Role *</label>
              <select [(ngModel)]="inviteData.role" name="role" required class="form-control">
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
                <option value="ReadOnly">Read Only</option>
              </select>
            </div>

            <div class="form-group">
              <label>Department</label>
              <input 
                type="text" 
                [(ngModel)]="inviteData.department" 
                name="department"
                class="form-control"
                placeholder="Engineering, Sales, etc.">
            </div>
          </div>

          <div class="form-group">
            <label>Custom Message (Optional)</label>
            <textarea 
              [(ngModel)]="inviteData.customMessage" 
              name="customMessage"
              class="form-control"
              rows="3"
              placeholder="Add a personal message to the invitation email..."></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="!inviteForm.valid || sending">
              <span *ngIf="!sending">Send Invitation</span>
              <span *ngIf="sending">Sending...</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Recent Invitations -->
      <div class="invitations-list-card" *ngIf="recentInvitations.length > 0">
        <h2>Recent Invitations</h2>
        
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Sent Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let invitation of recentInvitations">
                <td>{{invitation.email}}</td>
                <td>{{invitation.name}}</td>
                <td>
                  <span class="role-badge">{{invitation.role}}</span>
                </td>
                <td>
                  <span class="status-badge" [class.status-pending]="invitation.status === 'Pending'"
                        [class.status-accepted]="invitation.status === 'Accepted'"
                        [class.status-expired]="invitation.status === 'Expired'">
                    {{invitation.status}}
                  </span>
                </td>
                <td>{{formatDate(invitation.sentDate)}}</td>
                <td>
                  <button *ngIf="invitation.status === 'Pending'" 
                          class="btn-sm btn-outline"
                          (click)="resendInvitation(invitation)">
                    Resend
                  </button>
                  <button *ngIf="invitation.status === 'Pending'" 
                          class="btn-sm btn-danger"
                          (click)="cancelInvitation(invitation)">
                    Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-invitation-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #002F87;
      margin: 0 0 8px 0;
    }

    .page-header p {
      color: #64748b;
      margin: 0;
    }

    .tenant-info-card,
    .invitation-form-card,
    .invitations-list-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .info-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .info-header h3 {
      margin: 0;
      color: #1e293b;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-success {
      background-color: #10b981;
      color: white;
    }

    .usage-metrics {
      display: grid;
      gap: 16px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric label {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .progress-container {
      height: 8px;
      background-color: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #002F87 0%, #F2A900 100%);
      transition: width 0.3s ease;
    }

    .metric-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 600;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #475569;
    }

    .form-control {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #002F87;
      box-shadow: 0 0 0 3px rgba(0, 47, 135, 0.1);
    }

    textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .btn-primary,
    .btn-secondary {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #002F87 0%, #001d5a 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 47, 135, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
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

    .role-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e0e7ff;
      color: #3730a3;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-accepted {
      background: #d1fae5;
      color: #065f46;
    }

    .status-expired {
      background: #fee2e2;
      color: #991b1b;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 13px;
      border-radius: 6px;
      border: 1px solid;
      background: white;
      cursor: pointer;
      margin-right: 8px;
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

    .btn-danger {
      border-color: #dc2626;
      color: #dc2626;
    }

    .btn-danger:hover {
      background: #dc2626;
      color: white;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UserInvitationComponent implements OnInit {
  tenantInfo: any = null;
  inviteData: InviteUser = {
    email: '',
    name: '',
    role: '',
    department: '',
    customMessage: ''
  };
  recentInvitations: any[] = [];
  sending = false;
  tenantId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private dialogService: DialogService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.tenantId = this.route.snapshot.params['tenantId'];
    this.loadTenantInfo();
    this.loadRecentInvitations();
  }

  loadTenantInfo(): void {
    this.apiService.get(`/api/tenants/${this.tenantId}`).subscribe({
      next: (response: any) => {
        this.tenantInfo = response.data;
      },
      error: (error: any) => {
        console.error('Error loading tenant:', error);
        this.toastService.error('Failed to load tenant information');
      }
    });
  }

  loadRecentInvitations(): void {
    this.apiService.get(`/api/users/invitations?tenantId=${this.tenantId}`).subscribe({
      next: (response: any) => {
        this.recentInvitations = response.data || [];
      },
      error: (error: any) => {
        console.error('Error loading invitations:', error);
      }
    });
  }

  getUsersPercentage(): number {
    if (!this.tenantInfo) return 0;
    return (this.tenantInfo.userCount / this.tenantInfo.maxUsers) * 100;
  }

  async sendInvitation(): Promise<void> {
    if (this.tenantInfo.userCount >= this.tenantInfo.maxUsers) {
      this.toastService.error(`User limit reached (${this.tenantInfo.maxUsers} users)`);
      return;
    }

    this.sending = true;
    
    const invitationData = {
      ...this.inviteData,
      tenantId: this.tenantId,
      invitedBy: sessionStorage.getItem('userData') ? 
                 JSON.parse(sessionStorage.getItem('userData')!).email : 'admin'
    };

    this.apiService.post('/api/users/invite', invitationData).subscribe({
      next: (response: any) => {
        this.toastService.success(`Invitation sent to ${this.inviteData.email}`);
        this.resetForm();
        this.loadRecentInvitations();
        this.loadTenantInfo(); // Refresh user count
      },
      error: (error: any) => {
        console.error('Error sending invitation:', error);
        this.toastService.error(error.error?.message || 'Failed to send invitation');
      },
      complete: () => {
        this.sending = false;
      }
    });
  }

  resendInvitation(invitation: any): void {
    this.apiService.post(`/api/users/invitations/${invitation.id}/resend`, {}).subscribe({
      next: () => {
        this.toastService.success('Invitation resent successfully');
        this.loadRecentInvitations();
      },
      error: (error: any) => {
        this.toastService.error('Failed to resend invitation');
      }
    });
  }

  async cancelInvitation(invitation: any): Promise<void> {
    const confirmed = await this.dialogService.confirm(
      'Cancel Invitation',
      `Are you sure you want to cancel the invitation for ${invitation.email}?`,
      'Yes, Cancel',
      'No, Keep'
    ).toPromise();

    if (confirmed?.confirmed) {
      this.apiService.delete(`/api/users/invitations/${invitation.id}`).subscribe({
        next: () => {
          this.toastService.success('Invitation cancelled');
          this.loadRecentInvitations();
        },
        error: (error: any) => {
          this.toastService.error('Failed to cancel invitation');
        }
      });
    }
  }

  resetForm(): void {
    this.inviteData = {
      email: '',
      name: '',
      role: '',
      department: '',
      customMessage: ''
    };
  }

  cancel(): void {
    this.router.navigate(['/tenants/list']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
