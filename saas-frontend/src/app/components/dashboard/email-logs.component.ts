import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, PagedResult } from '../../services/api.service';

@Component({
  selector: 'app-email-logs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="email-logs-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Email Logs</h1>
          <p>View recent email notifications sent by the platform</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/dashboard">
            ← Back to Dashboard
          </button>
          <button class="btn-primary" (click)="loadEmailLogs()">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading email logs...</p>
      </div>

      <!-- Email Logs -->
      <div *ngIf="!loading" class="email-logs-grid">
  <div *ngFor="let email of emailLogs" class="email-card">
          <div class="email-header">
            <div class="email-info">
              <h3>{{email.subject}}</h3>
              <p class="email-recipient">To: {{email.to}}</p>
            </div>
            <span class="status-badge" [class]="'status-' + email.result.deliveryStatus">
              {{email.result.deliveryStatus | uppercase}}
            </span>
          </div>

          <div class="email-details">
            <div class="detail-row">
              <label>Message ID:</label>
              <span class="message-id">{{email.result.messageId}}</span>
            </div>
            <div class="detail-row">
              <label>Sent:</label>
              <span>{{formatDate(email.timestamp)}}</span>
            </div>
            <div class="detail-row" *ngIf="email.result.error">
              <label>Error:</label>
              <span class="error-text">{{email.result.error}}</span>
            </div>
          </div>

          <div class="email-preview" *ngIf="email.text">
            <label>Content Preview:</label>
            <div class="content-preview">{{getPreview(email.text)}}</div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="emailLogs.length === 0" class="empty-state">
          <div class="empty-icon">📧</div>
          <h3>No Email Logs Found</h3>
          <p>Once the system sends emails (e.g., onboarding, invites), they’ll appear here.</p>
          <button class="btn-primary" routerLink="/tenants/onboard">🎉 Onboard Tenant</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-section" *ngIf="!loading && emailLogs.length > 0">
        <h2>Email Statistics</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Sent</span>
            <span class="stat-value">{{emailLogs.length}}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Delivered</span>
            <span class="stat-value">{{getDeliveredCount()}}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Failed</span>
            <span class="stat-value">{{getFailedCount()}}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Success Rate</span>
            <span class="stat-value">{{getSuccessRate()}}%</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .email-logs-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
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
      text-decoration: none;
      display: inline-block;
      margin-left: 0.5rem;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background: #1976d2;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .loading-container {
      text-align: center;
      padding: 3rem;
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

    .email-logs-grid {
      display: grid;
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .email-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .email-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .email-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .email-info h3 {
      color: #2c3e50;
      margin: 0 0 0.25rem 0;
    }

    .email-recipient {
      color: #7f8c8d;
      margin: 0;
      font-size: 0.9rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-sent, .status-delivered {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-failed {
      background: #ffebee;
      color: #c62828;
    }

    .status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .email-details {
      margin-bottom: 1rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .message-id {
      font-family: monospace;
      font-size: 0.8rem;
      color: #666;
    }

    .error-text {
      color: #d32f2f;
      font-weight: 500;
    }

    .email-preview {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }

    .email-preview label {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.5rem;
      display: block;
    }

    .content-preview {
      color: #666;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .stats-section {
      margin-top: 2rem;
    }

    .stats-section h2 {
      color: #2c3e50;
      margin-bottom: 1.5rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      background: white;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
    }

    .stat-label {
      color: #7f8c8d;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .stat-value {
      color: #2c3e50;
      font-size: 1.8rem;
      font-weight: 700;
    }

    @media (max-width: 768px) {
      .email-logs-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class EmailLogsComponent implements OnInit {
  loading = true;
  emailLogs: any[] = [];
  private readonly pageSize = 50;

  constructor(private api: ApiService) {}

  ngOnInit() {
    console.log('📧 EmailLogsComponent initialized');
    this.loadEmailLogs();
  }

  loadEmailLogs() {
    this.loading = true;
    // Fetch notifications of type 'email' and map to email log shape expected by UI
    this.api.getNotifications(1, this.pageSize, 'email').subscribe({
      next: (paged: PagedResult<any>) => {
        const items = paged?.items || [];
        this.emailLogs = items.map((n: any) => this.mapNotificationToEmail(n));
        this.loading = false;
        console.log('📧 Email logs loaded:', this.emailLogs);
      },
      error: (error: any) => {
        console.error('❌ Failed to load email logs:', error);
        this.emailLogs = [];
        this.loading = false;
      }
    });
  }

  private mapNotificationToEmail(n: any) {
    // Normalize various possible shapes into the email UI format
    const meta = n.meta || n.metadata || {};
    const content = n.content || n.body || n.text || '';
    const status = (n.status || meta.status || 'sent').toString().toLowerCase();
    const recipient = n.recipient || n.to || meta.to || meta.recipient || 'unknown@recipient';
    const subject = n.subject || n.title || meta.subject || '(no subject)';
    const messageId = n.id || n.messageId || meta.messageId || cryptoRandomId();
    const error = n.error || meta.error || undefined;
    const timestamp = n.createdAt || n.timestamp || n.sentAt || new Date().toISOString();

    return {
      subject,
      to: recipient,
      timestamp,
      text: content,
      result: {
        deliveryStatus: mapStatus(status),
        messageId,
        error
      }
    };
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getPreview(text: string): string {
    if (!text) return 'No content preview available';
    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
  }

  getDeliveredCount(): number {
    return this.emailLogs.filter(email => 
      email.result?.deliveryStatus === 'delivered' || 
      email.result?.deliveryStatus === 'sent'
    ).length;
  }

  getFailedCount(): number {
    return this.emailLogs.filter(email => 
      email.result?.deliveryStatus === 'failed'
    ).length;
  }

  getSuccessRate(): number {
    if (this.emailLogs.length === 0) return 0;
    return Math.round((this.getDeliveredCount() / this.emailLogs.length) * 100);
  }
} 

// Helpers
function mapStatus(s: string): 'sent' | 'delivered' | 'failed' | 'pending' {
  const v = (s || '').toLowerCase();
  if (['delivered', 'success', 'ok'].includes(v)) return 'delivered';
  if (['failed', 'error'].includes(v)) return 'failed';
  if (['queued', 'pending'].includes(v)) return 'pending';
  return 'sent';
}

function cryptoRandomId(): string {
  try {
    // Prefer browser crypto if available
    const arr = new Uint8Array(8);
    (window.crypto || (window as any).msCrypto).getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2);
  }
}
