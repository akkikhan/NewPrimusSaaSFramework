import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-system-logs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="logs-container">
      <div class="page-header">
        <div class="header-content">
          <h1>System Logs</h1>
          <p>Real-time system logs and application events</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/monitoring">
            ← Back to Monitoring
          </button>
          <button class="btn-primary" (click)="refreshLogs()" [disabled]="loading">
            <span class="refresh-icon" [class.spinning]="loading">🔄</span>
            Refresh
          </button>
        </div>
      </div>

      <!-- Log Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label for="logLevel">Log Level:</label>
          <select id="logLevel" [(ngModel)]="selectedLogLevel" (change)="filterLogs()">
            <option value="">All Levels</option>
            <option value="ERROR">Error</option>
            <option value="WARN">Warning</option>
            <option value="INFO">Info</option>
            <option value="DEBUG">Debug</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="service">Service:</label>
          <select id="service" [(ngModel)]="selectedService" (change)="filterLogs()">
            <option value="">All Services</option>
            <option value="Gateway">Gateway</option>
            <option value="Authentication">Authentication</option>
            <option value="RBAC">RBAC</option>
            <option value="Notifications">Notifications</option>
          </select>
        </div>
      </div>

      <!-- Logs Display -->
      <div class="logs-section">
        <div class="logs-header">
          <h3>System Events ({{filteredLogs.length}} entries)</h3>
          <div class="auto-refresh">
            <label>
              <input type="checkbox" [(ngModel)]="autoRefresh" (change)="toggleAutoRefresh()">
              Auto-refresh (5s)
            </label>
          </div>
        </div>
        
        <div class="logs-container-inner" *ngIf="filteredLogs.length > 0">
          <div class="log-entry" 
               *ngFor="let log of filteredLogs" 
               [class]="'log-' + log.level.toLowerCase()">
            <div class="log-timestamp">
              {{log.timestamp | date:'yyyy-MM-dd HH:mm:ss'}}
            </div>
            <div class="log-level">
              <span class="level-badge" [class]="'level-' + log.level.toLowerCase()">
                {{log.level}}
              </span>
            </div>
            <div class="log-service">{{log.service}}</div>
            <div class="log-message">{{log.message}}</div>
          </div>
        </div>

        <div class="no-logs" *ngIf="filteredLogs.length === 0 && !loading">
          <p>No system logs found matching the current filters.</p>
        </div>

        <div class="loading-spinner" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading system logs...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logs-container {
      padding: 2rem;
      max-width: 1200px;
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

    .filters-section {
      background: #f7f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-group label {
      font-weight: 600;
      color: #14171a;
    }

    .filter-group select {
      padding: 0.75rem;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      background: white;
      font-size: 0.9rem;
    }

    .logs-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e1e8ed;
      overflow: hidden;
    }

    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: #f7f9fa;
      border-bottom: 1px solid #e1e8ed;
    }

    .logs-header h3 {
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

    .logs-container-inner {
      max-height: 600px;
      overflow-y: auto;
    }

    .log-entry {
      display: grid;
      grid-template-columns: 150px 80px 120px 1fr;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f1f3f4;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      align-items: center;
    }

    .log-entry:last-child {
      border-bottom: none;
    }

    .log-entry.log-error {
      background-color: #ffebee;
      border-left: 4px solid #f44336;
    }

    .log-entry.log-warn {
      background-color: #fff8e1;
      border-left: 4px solid #ff9800;
    }

    .log-entry.log-info {
      background-color: #e8f5e8;
      border-left: 4px solid #4caf50;
    }

    .log-entry.log-debug {
      background-color: #f3e5f5;
      border-left: 4px solid #9c27b0;
    }

    .log-timestamp {
      color: #657786;
      font-weight: 500;
    }

    .level-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .level-error {
      background: #f44336;
      color: white;
    }

    .level-warn {
      background: #ff9800;
      color: white;
    }

    .level-info {
      background: #4caf50;
      color: white;
    }

    .level-debug {
      background: #9c27b0;
      color: white;
    }

    .log-service {
      color: #1da1f2;
      font-weight: 600;
    }

    .log-message {
      color: #14171a;
      word-break: break-word;
    }

    .no-logs {
      padding: 3rem;
      text-align: center;
      color: #657786;
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
      .logs-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .filters-section {
        flex-direction: column;
        gap: 1rem;
      }

      .log-entry {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .logs-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
    }
  `]
})
export class SystemLogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = false;
  autoRefresh = false;
  selectedLogLevel = '';
  selectedService = '';
  
  logs: any[] = [];
  filteredLogs: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadLogs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs() {
    this.loading = true;
    
    // Generate mock logs for demonstration
    this.logs = this.generateMockLogs();
    this.filterLogs();
    this.loading = false;
  }

  refreshLogs() {
    this.loadLogs();
  }

  filterLogs() {
    this.filteredLogs = this.logs.filter(log => {
      const levelMatch = !this.selectedLogLevel || log.level === this.selectedLogLevel;
      const serviceMatch = !this.selectedService || log.service === this.selectedService;
      return levelMatch && serviceMatch;
    });
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      interval(5000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.autoRefresh) {
            this.loadLogs();
          }
        });
    }
  }

  private generateMockLogs(): any[] {
    const services = ['Gateway', 'Authentication', 'RBAC', 'Notifications'];
    const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const messages = [
      'Service started successfully',
      'Database connection established',
      'User authentication successful',
      'API request processed',
      'Cache invalidated',
      'Configuration updated',
      'Health check passed',
      'Memory usage within limits',
      'Warning: High CPU usage detected',
      'Error: Database connection timeout',
      'Debug: Request trace completed'
    ];

    const logs = [];
    for (let i = 0; i < 50; i++) {
      logs.push({
        id: i + 1,
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
        level: levels[Math.floor(Math.random() * levels.length)],
        service: services[Math.floor(Math.random() * services.length)],
        message: messages[Math.floor(Math.random() * messages.length)]
      });
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}