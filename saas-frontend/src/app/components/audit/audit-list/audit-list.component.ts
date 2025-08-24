import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AuditLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  module: string;
  event: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  resource?: string;
  action?: string;
  success: boolean;
  reason?: string;
  ipAddress?: string;
  correlationId: string;
}

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Audit Logs</h1>
          <p>Track and monitor all system activities and user actions</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="refreshLogs()">
            🔄 Refresh
          </button>
          <button class="btn-secondary" (click)="exportLogs()">
            📥 Export
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-grid">
          <div class="filter-group">
            <label>Level</label>
            <select [(ngModel)]="filterLevel" (change)="applyFilters()" class="filter-select">
              <option value="">All Levels</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Module</label>
            <select [(ngModel)]="filterModule" (change)="applyFilters()" class="filter-select">
              <option value="">All Modules</option>
              <option value="AUTH">Authentication</option>
              <option value="RBAC">RBAC</option>
              <option value="AUDIT">Audit</option>
              <option value="TENANT">Tenant</option>
            </select>
          </div>

          <div class="filter-group">
            <label>User</label>
            <input type="text" [(ngModel)]="filterUser" (input)="applyFilters()" 
                   placeholder="Search by user..." class="filter-input">
          </div>

          <div class="filter-group">
            <label>Date Range</label>
            <select [(ngModel)]="filterDateRange" (change)="applyFilters()" class="filter-select">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="logs-table-container">
        <table class="logs-table">
            <thead>
              <tr>
              <th>Timestamp</th>
              <th>Level</th>
              <th>Module</th>
              <th>Event</th>
                <th>User</th>
              <th>Resource</th>
              <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            <tr *ngFor="let log of filteredLogs" [class]="'log-row log-' + log.level.toLowerCase()">
              <td class="timestamp">{{formatTimestamp(log.timestamp)}}</td>
              <td>
                <span class="level-badge" [class]="'level-' + log.level.toLowerCase()">
                  {{log.level}}
                </span>
                </td>
                <td>
                <span class="module-badge">{{log.module}}</span>
                </td>
              <td class="event">{{log.event}}</td>
              <td class="user">
                  <div class="user-info">
                  <span class="user-email">{{log.userEmail}}</span>
                  <span class="user-id">{{log.userId}}</span>
                  </div>
                </td>
              <td class="resource">{{log.resource || '-'}}</td>
              <td>
                <span class="status-badge" [class]="log.success ? 'status-success' : 'status-failed'">
                  {{log.success ? 'Success' : 'Failed'}}
                  </span>
                </td>
              <td class="actions">
                <button class="btn-icon" (click)="viewDetails(log)" title="View Details">
                  👁️
                    </button>
                </td>
              </tr>
            </tbody>
          </table>
        
        <!-- Empty State -->
        <div *ngIf="filteredLogs.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No Audit Logs Found</h3>
          <p>No logs match your current filter criteria.</p>
          <button class="btn-secondary" (click)="clearFilters()">Clear Filters</button>
          </div>
      </div>

        <!-- Pagination -->
      <div class="pagination" *ngIf="filteredLogs.length > 0">
          <div class="pagination-info">
          Showing {{(currentPage - 1) * pageSize + 1}} to {{Math.min(currentPage * pageSize, filteredLogs.length)}} 
          of {{filteredLogs.length}} logs
          </div>
          <div class="pagination-controls">
          <button [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">Previous</button>
          <span class="page-info">Page {{currentPage}} of {{totalPages}}</span>
          <button [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">Next</button>
          </div>
        </div>
      </div>

    <!-- Log Details Modal -->
    <div *ngIf="selectedLog" class="modal-overlay" (click)="closeDetails()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Audit Log Details</h3>
          <button class="modal-close" (click)="closeDetails()">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Timestamp:</label>
              <span>{{formatTimestamp(selectedLog.timestamp)}}</span>
            </div>
            <div class="detail-item">
              <label>Level:</label>
              <span class="level-badge" [class]="'level-' + selectedLog.level.toLowerCase()">
                {{selectedLog.level}}
              </span>
            </div>
            <div class="detail-item">
              <label>Module:</label>
              <span class="module-badge">{{selectedLog.module}}</span>
            </div>
            <div class="detail-item">
              <label>Event:</label>
              <span>{{selectedLog.event}}</span>
            </div>
            <div class="detail-item">
              <label>User ID:</label>
              <span>{{selectedLog.userId}}</span>
            </div>
            <div class="detail-item">
              <label>User Email:</label>
              <span>{{selectedLog.userEmail}}</span>
            </div>
            <div class="detail-item">
              <label>Tenant ID:</label>
              <span>{{selectedLog.tenantId}}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.resource">
              <label>Resource:</label>
              <span>{{selectedLog.resource}}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.action">
              <label>Action:</label>
              <span>{{selectedLog.action}}</span>
            </div>
            <div class="detail-item">
              <label>Success:</label>
              <span class="status-badge" [class]="selectedLog.success ? 'status-success' : 'status-failed'">
                {{selectedLog.success ? 'Success' : 'Failed'}}
              </span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.reason">
              <label>Reason:</label>
              <span>{{selectedLog.reason}}</span>
            </div>
            <div class="detail-item" *ngIf="selectedLog.ipAddress">
              <label>IP Address:</label>
              <span>{{selectedLog.ipAddress}}</span>
            </div>
            <div class="detail-item">
              <label>Correlation ID:</label>
              <span class="correlation-id">{{selectedLog.correlationId}}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeDetails()">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-list-container {
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

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .filters-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      margin-bottom: 2rem;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .filter-group label {
      font-weight: 500;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .filter-select, .filter-input {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
    }

    .logs-table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .logs-table {
      width: 100%;
      border-collapse: collapse;
    }

    .logs-table th {
      background: #f8f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #e0e0e0;
    }

    .logs-table td {
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }

    .log-row:hover {
      background: #f8f9fa;
    }

    .log-row.log-error {
      border-left: 4px solid #e74c3c;
    }

    .log-row.log-warning {
      border-left: 4px solid #f39c12;
    }

    .log-row.log-info {
      border-left: 4px solid #3498db;
    }

    .timestamp {
      font-family: monospace;
      font-size: 0.9rem;
      color: #7f8c8d;
    }

    .level-badge, .module-badge, .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .level-info {
      background: #e3f2fd;
      color: #1976d2;
    }

    .level-warning {
      background: #fff3e0;
      color: #f57c00;
    }

    .level-error {
      background: #ffebee;
      color: #d32f2f;
    }

    .module-badge {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-success {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-failed {
      background: #ffebee;
      color: #c62828;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-email {
      font-weight: 500;
      color: #2c3e50;
    }

    .user-id {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .btn-icon {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-icon:hover {
      background: #e0e0e0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #7f8c8d;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .pagination-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .pagination-controls button {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
    }

    .pagination-controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item label {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .correlation-id {
      font-family: monospace;
      font-size: 0.9rem;
      background: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .audit-list-container {
        padding: 1rem;
      }
      
      .logs-table {
        font-size: 0.8rem;
      }
      
      .logs-table th,
      .logs-table td {
        padding: 0.5rem;
      }
    }
  `]
})
export class AuditListComponent implements OnInit {
  auditLogs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  selectedLog: AuditLog | null = null;

  // Filters
  filterLevel = '';
  filterModule = '';
  filterUser = '';
  filterDateRange = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  // For template access
  Math = Math;

  ngOnInit() {
    this.generateMockLogs();
    this.applyFilters();
  }

  private generateMockLogs(): void {
    const users = [
      { id: 'platform-admin-user', email: 'admin@saasfactory.com' },
      { id: 'tenant-admin-user', email: 'admin@company-a.com' },
      { id: 'tenant-user-1', email: 'john.doe@company-a.com' }
    ];

    const events = [
      { module: 'AUTH', event: 'LoginAttempt', success: true, resource: '/login' },
      { module: 'AUTH', event: 'LoginSuccess', success: true, resource: '/dashboard' },
      { module: 'AUTH', event: 'LogoutSuccess', success: true, resource: '/logout' },
      { module: 'RBAC', event: 'PermissionGranted', success: true, resource: 'roles' },
      { module: 'RBAC', event: 'PermissionDenied', success: false, resource: 'users' },
      { module: 'RBAC', event: 'RoleAssigned', success: true, resource: 'role-tenant-admin' },
      { module: 'RBAC', event: 'RoleCreated', success: true, resource: 'custom-role' },
      { module: 'AUDIT', event: 'LogsExported', success: true, resource: 'audit-logs' },
      { module: 'TENANT', event: 'TenantCreated', success: true, resource: 'new-tenant' },
      { module: 'TENANT', event: 'TenantUpdated', success: true, resource: 'tenant-settings' }
    ];

    // Generate logs for the last 30 days
    for (let i = 0; i < 100; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const event = events[Math.floor(Math.random() * events.length)];
      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      this.auditLogs.push({
        id: `log-${i + 1}`,
        timestamp: timestamp.toISOString(),
        level: event.success ? (Math.random() > 0.1 ? 'INFO' : 'WARNING') : 'ERROR',
        module: event.module,
        event: event.event,
        userId: user.id,
        userEmail: user.email,
        tenantId: user.id.includes('platform') ? 'platform' : 'default-tenant',
        resource: event.resource,
        action: event.event.toLowerCase().includes('create') ? 'create' : 
                event.event.toLowerCase().includes('update') ? 'update' :
                event.event.toLowerCase().includes('delete') ? 'delete' : 'read',
        success: event.success,
        reason: event.success ? 'Operation completed successfully' : 'Permission denied or validation failed',
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        correlationId: this.generateCorrelationId()
      });
    }

    // Sort by timestamp (newest first)
    this.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  applyFilters(): void {
    let filtered = [...this.auditLogs];

    if (this.filterLevel) {
      filtered = filtered.filter(log => log.level === this.filterLevel);
    }

    if (this.filterModule) {
      filtered = filtered.filter(log => log.module === this.filterModule);
    }

    if (this.filterUser) {
      const userFilter = this.filterUser.toLowerCase();
      filtered = filtered.filter(log => 
        log.userEmail.toLowerCase().includes(userFilter) ||
        log.userId.toLowerCase().includes(userFilter)
      );
    }

    if (this.filterDateRange) {
      const now = new Date();
      let startDate: Date;

      switch (this.filterDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }

    this.filteredLogs = filtered;
    this.totalPages = Math.ceil(this.filteredLogs.length / this.pageSize);
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.filterLevel = '';
    this.filterModule = '';
    this.filterUser = '';
    this.filterDateRange = '';
    this.applyFilters();
  }

  refreshLogs(): void {
    this.generateMockLogs();
    this.applyFilters();
  }

  exportLogs(): void {
    const csvContent = this.convertToCSV(this.filteredLogs);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(logs: AuditLog[]): string {
    const headers = ['Timestamp', 'Level', 'Module', 'Event', 'User ID', 'User Email', 'Tenant ID', 'Resource', 'Action', 'Success', 'Reason', 'IP Address', 'Correlation ID'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      log.module,
      log.event,
      log.userId,
      log.userEmail,
      log.tenantId,
      log.resource || '',
      log.action || '',
      log.success.toString(),
      log.reason || '',
      log.ipAddress || '',
      log.correlationId
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  }

  viewDetails(log: AuditLog): void {
    this.selectedLog = log;
  }

  closeDetails(): void {
    this.selectedLog = null;
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
} 