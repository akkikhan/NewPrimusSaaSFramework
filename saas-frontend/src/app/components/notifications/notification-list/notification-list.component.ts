import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Subject, interval, forkJoin } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="notification-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Notifications</h1>
          <p>Manage email, SMS, and webhook notifications</p>
          <div class="header-stats" *ngIf="stats">
            <div class="stat-item">
              <span class="stat-number">{{stats.totalSent}}</span>
              <span class="stat-label">Total Sent</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" [class]="'stat-' + (stats.unreadCount > 0 ? 'warning' : 'success')">{{stats.unreadCount}}</span>
              <span class="stat-label">Unread</span>
            </div>
            <div class="stat-item">
              <span class="stat-number stat-success">{{stats.deliveryRate.toFixed(1)}}%</span>
              <span class="stat-label">Delivery Rate</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="toggleAutoRefresh()" title="{{autoRefresh ? 'Disable' : 'Enable'}} Auto Refresh">
            {{autoRefresh ? '⏸️' : '▶️'}} Auto Refresh
            <span *ngIf="autoRefresh && countdown > 0" class="countdown">({{countdown}}s)</span>
          </button>
          <button class="btn-secondary" (click)="loadNotifications()" [disabled]="loading" title="Refresh">
            🔄 Refresh
          </button>
          <button class="btn-primary" routerLink="/notifications/send">
            ➕ Send Notification
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-grid">
          <div class="filter-group">
            <label for="typeFilter">Type</label>
            <select id="typeFilter" [(ngModel)]="filters.type" (change)="onFilterChange()" class="filter-select">
              <option value="">All Types</option>
              <option value="email">📧 Email</option>
              <option value="sms">📱 SMS</option>
              <option value="push">🔔 Push</option>
              <option value="webhook">🔗 Webhook</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="statusFilter">Status</label>
            <select id="statusFilter" [(ngModel)]="filters.status" (change)="onFilterChange()" class="filter-select">
              <option value="">All Status</option>
              <option value="delivered">✅ Delivered</option>
              <option value="pending">⏳ Pending</option>
              <option value="failed">❌ Failed</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="readFilter">Read Status</label>
            <select id="readFilter" [(ngModel)]="filters.unreadOnly" (change)="onFilterChange()" class="filter-select">
              <option [ngValue]="undefined">All</option>
              <option [ngValue]="true">🔵 Unread Only</option>
              <option [ngValue]="false">✅ Read Only</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn-clear" (click)="clearFilters()" *ngIf="hasActiveFilters()">
              🗑️ Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading && notifications.items.length === 0" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && notifications.items.length === 0" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Notifications</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadNotifications()">Try Again</button>
      </div>

      <!-- Notifications Grid -->
      <div *ngIf="!loading || notifications.items.length > 0" class="notifications-grid">
        <div *ngFor="let notification of notifications.items; trackBy: trackByNotificationId" class="notification-card" 
             [class.unread]="!notification.isRead">
          <div class="notification-header">
            <div class="notification-meta">
              <h3>{{notification.subject}}</h3>
              <div class="notification-badges">
                <span class="type-badge" [class]="'type-' + notification.type">
                  {{getTypeIcon(notification.type)}} {{notification.type | titlecase}}
                </span>
                <span class="status-badge" [class]="'status-' + notification.status?.toLowerCase()">
                  {{notification.status || 'Sent'}}
                </span>
                <span class="priority-badge" [class]="'priority-' + notification.priority?.toLowerCase()" 
                      *ngIf="notification.priority && notification.priority !== 'normal'">
                  {{getPriorityIcon(notification.priority)}} {{notification.priority | titlecase}}
                </span>
              </div>
            </div>
            <div class="notification-status">
              <span class="read-indicator" *ngIf="!notification.isRead" title="Unread">🔵</span>
              <span class="read-indicator read" *ngIf="notification.isRead" title="Read">✅</span>
            </div>
          </div>
          
          <div class="notification-content">
            <p class="notification-message">{{notification.content}}</p>
            <div class="notification-details">
              <div class="detail-item">
                <span class="detail-label">To:</span>
                <span class="detail-value">{{getRecipientsText(notification.recipients)}}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sent:</span>
                <span class="detail-value">{{formatDate(notification.sentAt)}}</span>
              </div>
              <div class="detail-item" *ngIf="notification.readAt">
                <span class="detail-label">Read:</span>
                <span class="detail-value">{{formatDate(notification.readAt)}}</span>
              </div>
              <div class="detail-item" *ngIf="notification.template">
                <span class="detail-label">Template:</span>
                <span class="detail-value template-name">{{notification.template}}</span>
              </div>
            </div>
          </div>

          <div class="notification-actions">
            <button class="btn-icon" (click)="viewNotification(notification)" title="View Details">
              👁️ View
            </button>
            <button class="btn-icon" (click)="markAsRead(notification)" *ngIf="!notification.isRead" 
                    title="Mark as Read" [disabled]="markingAsRead[notification.id]">
              {{markingAsRead[notification.id] ? '⏳' : '✓'}} Mark Read
            </button>
            <button class="btn-icon" (click)="resendNotification(notification)" title="Resend" 
                    [disabled]="resending[notification.id]">
              {{resending[notification.id] ? '⏳' : '📤'}} Resend
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="notifications.items?.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">📧</div>
          <h3>No Notifications Found</h3>
          <p>{{hasActiveFilters() ? 'No notifications match your filters.' : 'No notifications have been sent yet.'}}</p>
          <div class="empty-actions">
            <button class="btn-secondary" (click)="clearFilters()" *ngIf="hasActiveFilters()">
              Clear Filters
            </button>
            <button class="btn-primary" routerLink="/notifications/send">Send Notification</button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div *ngIf="notifications.items?.length > 0" class="pagination-container">
        <div class="pagination-info">
          Showing {{getItemRange()}} of {{notifications.totalItems}} notifications
          <span *ngIf="hasActiveFilters()" class="filter-indicator">(filtered)</span>
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
            [disabled]="currentPage >= notifications.totalPages"
            (click)="goToPage(currentPage + 1)">
            Next →
          </button>
        </div>
      </div>

      <!-- Loading overlay for refresh -->
      <div *ngIf="loading && notifications.items.length > 0" class="loading-overlay">
        <div class="loading-spinner-small"></div>
        <span>Refreshing...</span>
      </div>
    </div>
  `,
  styles: [`
    .notification-list-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }
    .header-content h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }
    .header-content p {
      color: #7f8c8d;
      margin: 0 0 1rem 0;
    }
    .header-stats {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .stat-item {
      text-align: center;
    }
    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-number.stat-warning {
      color: #f39c12;
    }
    .stat-number.stat-success {
      color: #27ae60;
    }
    .stat-label {
      font-size: 0.85rem;
      color: #7f8c8d;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .countdown {
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .filters-section {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) auto;
      gap: 1rem;
      align-items: end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
    }
    .filter-group label {
      font-size: 0.9rem;
      color: #2c3e50;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .filter-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      font-size: 0.9rem;
    }
    .btn-clear {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .notifications-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }
    .notification-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    .notification-card.unread {
      border-left: 4px solid #3498db;
      background: #fbfdff;
    }
    .notification-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .notification-meta h3 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }
    .notification-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .type-badge, .status-badge, .priority-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .type-email { background: #e3f2fd; color: #1976d2; }
    .type-sms { background: #f3e5f5; color: #7b1fa2; }
    .type-push { background: #e8f5e8; color: #388e3c; }
    .type-webhook { background: #fff3e0; color: #f57c00; }
    .status-delivered { background: #e8f5e8; color: #2e7d32; }
    .status-pending { background: #fff3e0; color: #f57c00; }
    .status-failed { background: #ffebee; color: #d32f2f; }
    .priority-high { background: #ffebee; color: #d32f2f; }
    .priority-urgent { background: #ffebee; color: #d32f2f; font-weight: bold; }
    .read-indicator {
      font-size: 1.2rem;
    }
    .read-indicator.read {
      opacity: 0.5;
    }
    .notification-content {
      margin-bottom: 1rem;
    }
    .notification-message {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }
    .notification-details {
      display: grid;
      gap: 0.25rem;
      font-size: 0.85rem;
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
    }
    .detail-label {
      color: #7f8c8d;
      font-weight: 500;
    }
    .detail-value {
      color: #2c3e50;
    }
    .detail-value.template-name {
      font-family: monospace;
      background: #f8f9fa;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }
    .notification-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-icon {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.3s ease;
    }
    .btn-icon:hover:not(:disabled) {
      background: #e0e0e0;
      transform: translateY(-1px);
    }
    .btn-icon:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      border: none;
      transition: all 0.3s ease;
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
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 10;
    }
    .loading-spinner-small {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      grid-column: 1 / -1;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }
    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    .empty-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1.5rem;
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
    .filter-indicator {
      color: #3498db;
      font-style: italic;
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

    @media (max-width: 768px) {
      .notification-list-container {
        padding: 1rem;
      }
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }
      .header-stats {
        justify-content: space-around;
      }
      .filters-grid {
        grid-template-columns: 1fr;
      }
      .notifications-grid {
        grid-template-columns: 1fr;
      }
      .notification-actions {
        justify-content: space-between;
      }
      .pagination-container {
        flex-direction: column;
        gap: 1rem;
      }
    }
  `]
})
export class NotificationListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  error = '';
  currentPage = 1;
  pageSize = 20;
  autoRefresh = true;
  countdown = 30;

  notifications: any = {
    items: [],
    totalItems: 0,
    totalPages: 0,
    page: 1
  };

  stats: any = null;
  
  filters = {
    type: '',
    status: '',
    unreadOnly: undefined as boolean | undefined
  };

  markingAsRead: { [key: string]: boolean } = {};
  resending: { [key: string]: boolean } = {};

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    this.error = '';

    // Load notifications and stats in parallel
    forkJoin({
      notifications: this.apiService.getNotifications(
        this.currentPage, 
        this.pageSize,
        this.filters.type || undefined,
        this.filters.status || undefined,
        this.filters.unreadOnly
      ),
      stats: this.apiService.getNotificationStats()
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading notification data:', error);
        this.error = this.apiService.handleError(error);
        this.loading = false;
        
        // Return fallback data
        return [{
          notifications: {
            items: [],
            totalItems: 0,
            totalPages: 0,
            page: 1,
            pageSize: this.pageSize
          },
          stats: {
            totalSent: 0,
            unreadCount: 0,
            deliveryRate: 0
          }
        }];
      })
    ).subscribe((result) => {
      if (result.notifications) {
        this.notifications = result.notifications;
      }
      if (result.stats) {
        this.stats = result.stats;
      }
      this.loading = false;
      
      console.log('✅ Loaded notifications:', {
        count: this.notifications.items?.length || 0,
        total: this.notifications.totalItems,
        stats: this.stats
      });
    });
  }

  loadNotifications() {
    this.loadData();
  }

  startAutoRefresh() {
    if (this.autoRefresh) {
      this.countdown = 30;
      
      interval(1000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if (this.autoRefresh) {
          this.countdown--;
          
          if (this.countdown <= 0) {
            this.loadData();
            this.countdown = 30;
          }
        }
      });
    }
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadData();
  }

  clearFilters() {
    this.filters = {
      type: '',
      status: '',
      unreadOnly: undefined
    };
    this.currentPage = 1;
    this.loadData();
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.type || this.filters.status || this.filters.unreadOnly !== undefined);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'email': return '📧';
      case 'sms': return '📱';
      case 'push': return '🔔';
      case 'webhook': return '🔗';
      default: return '📄';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '🔴';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '🟡';
    }
  }

  getRecipientsText(recipients: string[]): string {
    if (!recipients || recipients.length === 0) return 'None';
    if (recipients.length === 1) return recipients[0];
    return `${recipients[0]} +${recipients.length - 1} more`;
  }

  getItemRange(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.notifications.totalItems);
    return `${start}-${end}`;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.notifications.totalPages) {
      this.currentPage = page;
      this.loadData();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.notifications.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  viewNotification(notification: any) {
    // Navigate to notification details or show modal
    console.log('Viewing notification:', notification);
    // TODO: Implement notification detail view
  }

  markAsRead(notification: any) {
    if (notification.id && !notification.isRead) {
      this.markingAsRead[notification.id] = true;
      
      this.apiService.markNotificationRead(notification.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.markingAsRead[notification.id] = false;
          
          // Update stats
          if (this.stats) {
            this.stats.unreadCount = Math.max(0, this.stats.unreadCount - 1);
          }
          
          console.log('✅ Marked notification as read:', notification.id);
        },
        error: (error) => {
          console.error('Failed to mark notification as read:', error);
          this.markingAsRead[notification.id] = false;
        }
      });
    }
  }

  resendNotification(notification: any) {
    if (notification.id) {
      this.resending[notification.id] = true;
      
      const resendData = {
        type: notification.type,
        recipients: notification.recipients,
        subject: `[RESEND] ${notification.subject}`,
        content: notification.content,
        template: notification.template,
        priority: notification.priority || 'normal'
      };
      
      this.apiService.sendNotification(resendData).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (result) => {
          this.resending[notification.id] = false;
          console.log('✅ Notification resent successfully:', result);
          
          // Refresh the list to show the new notification
          this.loadData();
        },
        error: (error) => {
          console.error('Failed to resend notification:', error);
          this.resending[notification.id] = false;
        }
      });
    }
  }

  trackByNotificationId(index: number, notification: any): string {
    return notification.id;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
} 