import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="audit-logs-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Audit Trail</h1>
          <p>Comprehensive audit logging for compliance and security monitoring</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/monitoring">
            ← Back to Monitoring
          </button>
          <button class="btn-primary" (click)="refreshLogs()" [disabled]="loading">
            <span class="refresh-icon" [class.spinning]="loading">🔄</span>
            Refresh
          </button>
          <button class="btn-secondary" (click)="exportLogs()">
            📥 Export
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-icon">📊</div>
          <div class="summary-content">
            <h3>{{auditSummary.totalEvents}}</h3>
            <p>Total Events</p>
          </div>
        </div>
        <div class="summary-card success">
          <div class="summary-icon">✅</div>
          <div class="summary-content">
            <h3>{{auditSummary.successfulEvents}}</h3>
            <p>Successful</p>
          </div>
        </div>
        <div class="summary-card warning">
          <div class="summary-icon">⚠️</div>
          <div class="summary-content">
            <h3>{{auditSummary.warnings}}</h3>
            <p>Warnings</p>
          </div>
        </div>
        <div class="summary-card error">
          <div class="summary-icon">❌</div>
          <div class="summary-content">
            <h3>{{auditSummary.errors}}</h3>
            <p>Errors</p>
          </div>
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
              <option value="Authentication">Authentication</option>
              <option value="RBAC">RBAC</option>
              <option value="Gateway">Gateway</option>
              <option value="Notifications">Notifications</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Event Type</label>
            <select [(ngModel)]="filterEvent" (change)="applyFilters()" class="filter-select">
              <option value="">All Events</option>
              <option value="User Login">User Login</option>
              <option value="User Logout">User Logout</option>
              <option value="Permission Change">Permission Change</option>
              <option value="Data Access">Data Access</option>
              <option value="Configuration Change">Configuration Change</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Success Status</label>
            <select [(ngModel)]="filterSuccess" (change)="applyFilters()" class="filter-select">
              <option value="">All</option>
              <option value="true">Successful</option>
              <option value="false">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="audit-table-section">
        <div class="table-header">
          <h3>Audit Events ({{filteredLogs.length}} of {{auditLogs.length}})</h3>
          <div class="auto-refresh">
            <label>
              <input type="checkbox" [(ngModel)]="autoRefresh" (change)="toggleAutoRefresh()">
              Auto-refresh (10s)
            </label>
          </div>
        </div>

        <div class="audit-table-container" *ngIf="filteredLogs.length > 0">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Level</th>
                <th>Module</th>
                <th>Event</th>
                <th>User</th>
                <th>Resource</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of filteredLogs" 
                  [class]="'level-' + log.level.toLowerCase()">
                <td class="timestamp">
                  {{log.timestamp | date:'yyyy-MM-dd HH:mm:ss'}}
                </td>
                <td>
                  <span class="level-badge" [class]="'level-' + log.level.toLowerCase()">
                    {{log.level}}
                  </span>
                </td>
                <td class="module">{{log.module}}</td>
                <td class="event">{{log.event}}</td>
                <td class="user">
                  <div class="user-info">
                    <div class="user-email">{{log.userEmail}}</div>
                    <div class="user-id">{{log.userId}}</div>
                  </div>
                </td>
                <td class="resource">{{log.resource || '-'}}</td>
                <td>
                  <span class="status-badge" [class]="log.success ? 'success' : 'failed'">
                    {{log.success ? 'Success' : 'Failed'}}
                  </span>
                </td>
                <td class="ip">{{log.ipAddress || '-'}}</td>
                <td class="actions">
                  <button class="btn-small" (click)="viewDetails(log)">
                    👁️ Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="no-logs" *ngIf="filteredLogs.length === 0 && !loading">
          <div class="no-logs-icon">📋</div>
          <h3>No audit logs found</h3>
          <p>No audit events match the current filter criteria.</p>
        </div>

        <div class="loading-spinner" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-logs-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e1e8ed;
    }

    .header-content h1 {
      margin: 0 0 0.5rem 0;
      color: #1da1f2;
      font-size: 2rem;
    }

    .header-content p {
      margin: 0;
      color: #657786;
      font-size: 1.1rem;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #e1e8ed;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .summary-card.success {
      border-left: 4px solid #4caf50;
    }

    .summary-card.warning {
      border-left: 4px solid #ff9800;
    }

    .summary-card.error {
      border-left: 4px solid #f44336;
    }

    .summary-icon {
      font-size: 2rem;
    }

    .summary-content h3 {
      margin: 0;
      font-size: 1.5rem;
      color: #14171a;
    }

    .summary-content p {
      margin: 0;
      color: #657786;
      font-size: 0.9rem;
    }

    .filters-section {
      background: #f7f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-group label {
      font-weight: 600;
      color: #14171a;
      font-size: 0.9rem;
    }

    .filter-select {
      padding: 0.75rem;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      background: white;
      font-size: 0.9rem;
    }

    .audit-table-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: #f7f9fa;
      border-bottom: 1px solid #e1e8ed;
    }

    .table-header h3 {
      margin: 0;
      color: #14171a;
    }

    .auto-refresh label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: #657786;
    }

    .audit-table-container {
      overflow-x: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
    }

    .audit-table th {
      background: #f7f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #14171a;
      border-bottom: 1px solid #e1e8ed;
      font-size: 0.9rem;
    }

    .audit-table td {
      padding: 1rem;
      border-bottom: 1px solid #f1f3f4;
      font-size: 0.85rem;
      vertical-align: top;
    }

    .audit-table tr:hover {
      background: #f8f9fa;
    }

    .audit-table tr.level-error {
      background-color: #ffebee;
    }

    .audit-table tr.level-warning {
      background-color: #fff8e1;
    }

    .timestamp {
      font-family: 'Courier New', monospace;
      color: #657786;
      white-space: nowrap;
    }

    .level-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
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

    .module {
      color: #1da1f2;
      font-weight: 600;
    }

    .event {
      color: #14171a;
      font-weight: 500;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .user-email {
      color: #14171a;
      font-weight: 500;
    }

    .user-id {
      color: #657786;
      font-size: 0.75rem;
      font-family: 'Courier New', monospace;
    }

    .resource {
      color: #657786;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.success {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-badge.failed {
      background: #ffebee;
      color: #c62828;
    }

    .ip {
      font-family: 'Courier New', monospace;
      color: #657786;
    }

    .btn-small {
      padding: 0.5rem 0.75rem;
      background: #f7f9fa;
      border: 1px solid #e1e8ed;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      color: #1da1f2;
      transition: all 0.2s;
    }

    .btn-small:hover {
      background: #e1e8ed;
    }

    .no-logs {
      padding: 4rem 2rem;
      text-align: center;
      color: #657786;
    }

    .no-logs-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .no-logs h3 {
      margin: 0 0 0.5rem 0;
      color: #14171a;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e1e8ed;
      border-top: 4px solid #1da1f2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #1da1f2;
      color: white;
    }

    .btn-primary:hover {
      background: #1991db;
    }

    .btn-secondary {
      background: #f7f9fa;
      color: #1da1f2;
      border: 1px solid #e1e8ed;
    }

    .btn-secondary:hover {
      background: #e1e8ed;
    }

    .refresh-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @media (max-width: 768px) {
      .audit-logs-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .header-actions {
        justify-content: center;
      }

      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .table-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .audit-table {
        font-size: 0.8rem;
      }

      .audit-table th,
      .audit-table td {
        padding: 0.5rem;
      }
    }
  `]
})
export class AuditLogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = false;
  autoRefresh = false;
  
  filterLevel = '';
  filterModule = '';
  filterEvent = '';
  filterSuccess = '';
  
  auditLogs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  
  auditSummary = {
    totalEvents: 0,
    successfulEvents: 0,
    warnings: 0,
    errors: 0
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadAuditLogs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAuditLogs() {
    this.loading = true;
    
    // Generate mock audit logs for demonstration
    this.auditLogs = this.generateMockAuditLogs();
    this.calculateSummary();
    this.applyFilters();
    this.loading = false;
  }

  refreshLogs() {
    this.loadAuditLogs();
  }

  applyFilters() {
    this.filteredLogs = this.auditLogs.filter(log => {
      const levelMatch = !this.filterLevel || log.level === this.filterLevel;
      const moduleMatch = !this.filterModule || log.module === this.filterModule;
      const eventMatch = !this.filterEvent || log.event === this.filterEvent;
      const successMatch = !this.filterSuccess || log.success.toString() === this.filterSuccess;
      
      return levelMatch && moduleMatch && eventMatch && successMatch;
    });
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      interval(10000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.autoRefresh) {
            this.loadAuditLogs();
          }
        });
    }
  }

  exportLogs() {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  viewDetails(log: AuditLog) {
    alert(`Audit Log Details:\n\nID: ${log.id}\nTimestamp: ${log.timestamp}\nCorrelation ID: ${log.correlationId}\nReason: ${log.reason || 'N/A'}`);
  }

  private calculateSummary() {
    this.auditSummary.totalEvents = this.auditLogs.length;
    this.auditSummary.successfulEvents = this.auditLogs.filter(log => log.success).length;
    this.auditSummary.warnings = this.auditLogs.filter(log => log.level === 'WARNING').length;
    this.auditSummary.errors = this.auditLogs.filter(log => log.level === 'ERROR').length;
  }

  private generateCSV(): string {
    const headers = ['Timestamp', 'Level', 'Module', 'Event', 'User Email', 'Success', 'IP Address', 'Resource'];
    const rows = this.filteredLogs.map(log => [
      log.timestamp,
      log.level,
      log.module,
      log.event,
      log.userEmail,
      log.success.toString(),
      log.ipAddress || '',
      log.resource || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateMockAuditLogs(): AuditLog[] {
    const modules = ['Authentication', 'RBAC', 'Gateway', 'Notifications'];
    const events = ['User Login', 'User Logout', 'Permission Change', 'Data Access', 'Configuration Change'];
    const users = [
      { id: 'user1', email: 'admin@acme.com' },
      { id: 'user2', email: 'manager@acme.com' },
      { id: 'user3', email: 'user@acme.com' }
    ];
    const resources = ['User Profile', 'Tenant Settings', 'API Key', 'Role Assignment', 'System Config'];
    const ips = ['192.168.1.100', '10.0.0.50', '172.16.0.25'];

    const logs: AuditLog[] = [];
    for (let i = 0; i < 100; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const success = Math.random() > 0.1; // 90% success rate
      const level = success ? 
        (Math.random() > 0.8 ? 'WARNING' : 'INFO') : 
        'ERROR';
      
      logs.push({
        id: `audit-${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(), // Random time in last 7 days
        level: level as 'INFO' | 'WARNING' | 'ERROR',
        module: modules[Math.floor(Math.random() * modules.length)],
        event: events[Math.floor(Math.random() * events.length)],
        userId: user.id,
        userEmail: user.email,
        tenantId: 'tenant-acme',
        resource: Math.random() > 0.3 ? resources[Math.floor(Math.random() * resources.length)] : undefined,
        action: Math.random() > 0.5 ? 'READ' : 'write',
        success: success,
        reason: success ? undefined : 'Authentication failed',
        ipAddress: ips[Math.floor(Math.random() * ips.length)],
        correlationId: `corr-${Math.random().toString(36).substr(2, 9)}`
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}