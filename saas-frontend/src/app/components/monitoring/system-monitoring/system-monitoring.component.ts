import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-system-monitoring',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="monitoring-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Real-Time System Monitoring</h1>
          <p>Live system metrics, performance data, and service health monitoring</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/dashboard">
            ← Back to Dashboard
          </button>
          <button class="btn-primary" (click)="refreshAll()" [disabled]="loading">
            <span class="refresh-icon" [class.spinning]="loading">🔄</span>
            Refresh All
          </button>
        </div>
      </div>

      <!-- System Health Overview -->
      <div class="health-overview">
        <div class="health-card" [class]="systemHealth.status">
          <div class="health-icon">
            <span class="status-indicator" [class]="systemHealth.status"></span>
            {{getHealthIcon()}}
          </div>
          <div class="health-content">
            <h3>System Status: {{systemHealth.status | titlecase}}</h3>
            <p>Last checked: {{systemHealth.lastCheck | date:'medium'}}</p>
          </div>
        </div>
      </div>

      <!-- Services Status Grid -->
      <div class="services-section">
        <h2>Service Health</h2>
        <div class="services-grid" *ngIf="servicesStatus.length > 0">
          <div class="service-card" 
               *ngFor="let service of servicesStatus" 
               [class.online]="service.status === 'online'"
               [class.offline]="service.status === 'offline'">
            <div class="service-header">
              <h4>{{service.name}}</h4>
              <span class="service-status" [class]="service.status">
                <span class="status-dot"></span>
                {{service.status | titlecase}}
              </span>
            </div>
            <div class="service-details">
              <div class="detail-item">
                <span class="label">Port:</span>
                <span class="value">{{service.port}}</span>
              </div>
              <div class="detail-item">
                <span class="label">Response Time:</span>
                <span class="value">{{service.responseTime}}ms</span>
              </div>
              <div class="detail-item">
                <span class="label">Last Check:</span>
                <span class="value">{{service.lastCheck | date:'short'}}</span>
              </div>
              <div class="detail-item" *ngIf="service.details">
                <span class="label">Details:</span>
                <span class="value">{{service.details}}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="empty-state" *ngIf="servicesStatus.length === 0 && !loading">
          <p>No service status data available</p>
        </div>
      </div>

      <!-- System Metrics -->
      <div class="metrics-section">
        <h2>System Performance</h2>
        <div class="metrics-grid">
          <div class="metric-card cpu">
            <div class="metric-header">
              <h4>CPU Usage</h4>
              <span class="metric-value">{{systemMetrics.system?.cpuUsage | number:'1.1-1'}}%</span>
            </div>
            <div class="metric-chart">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="systemMetrics.system?.cpuUsage"></div>
              </div>
            </div>
          </div>

          <div class="metric-card memory">
            <div class="metric-header">
              <h4>Memory Usage</h4>
              <span class="metric-value">{{systemMetrics.system?.memoryUsage?.percentage | number:'1.1-1'}}%</span>
            </div>
            <div class="metric-chart">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="systemMetrics.system?.memoryUsage?.percentage"></div>
              </div>
            </div>
            <div class="metric-details">
              <small>{{formatBytes(systemMetrics.system?.memoryUsage?.used)}} / {{formatBytes(systemMetrics.system?.memoryUsage?.total)}}</small>
            </div>
          </div>

          <div class="metric-card disk">
            <div class="metric-header">
              <h4>Disk Usage</h4>
              <span class="metric-value">{{systemMetrics.system?.diskUsage?.percentage | number:'1.1-1'}}%</span>
            </div>
            <div class="metric-chart">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="systemMetrics.system?.diskUsage?.percentage"></div>
              </div>
            </div>
            <div class="metric-details">
              <small>{{formatBytes(systemMetrics.system?.diskUsage?.used)}} / {{formatBytes(systemMetrics.system?.diskUsage?.total)}}</small>
            </div>
          </div>

          <div class="metric-card uptime">
            <div class="metric-header">
              <h4>System Uptime</h4>
              <span class="metric-value">{{systemMetrics.system?.uptime}}</span>
            </div>
            <div class="metric-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Application Metrics -->
      <div class="app-metrics-section">
        <h2>Application Performance</h2>
        <div class="app-metrics-grid">
          <div class="app-metric-card">
            <div class="metric-icon requests">📊</div>
            <div class="metric-content">
              <h4>Total Requests</h4>
              <span class="metric-number">{{systemMetrics.application?.requestCount | number}}</span>
              <small>Since startup</small>
            </div>
          </div>

          <div class="app-metric-card">
            <div class="metric-icon errors">⚠️</div>
            <div class="metric-content">
              <h4>Error Count</h4>
              <span class="metric-number">{{systemMetrics.application?.errorCount | number}}</span>
              <small>Last 24 hours</small>
            </div>
          </div>

          <div class="app-metric-card">
            <div class="metric-icon connections">🔗</div>
            <div class="metric-content">
              <h4>Active Connections</h4>
              <span class="metric-number">{{systemMetrics.application?.activeConnections | number}}</span>
              <small>Current</small>
            </div>
          </div>

          <div class="app-metric-card">
            <div class="metric-icon response">⚡</div>
            <div class="metric-content">
              <h4>Avg Response Time</h4>
              <span class="metric-number">{{systemMetrics.application?.responseTime | number}}ms</span>
              <small>Last hour</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto-refresh Controls -->
      <div class="auto-refresh-section">
        <div class="refresh-controls">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="autoRefresh" (change)="toggleAutoRefresh()">
            <span class="checkmark"></span>
            Auto-refresh every 30 seconds
          </label>
          <div class="refresh-status" *ngIf="autoRefresh">
            <span class="countdown">Next refresh in: {{countdown}}s</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading system metrics...</p>
      </div>
    </div>
  `,
  styles: [`
    .monitoring-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #f8fafe 0%, #ffffff 100%);
      min-height: 100vh;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      background: white;
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .header-content h1 {
      font-size: 2.5rem;
      font-weight: 600;
      color: #0a2342;
      margin: 0 0 0.5rem 0;
    }

    .header-content p {
      color: #666;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
    }

    .btn-primary:hover {
      background: #5a6fd8;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #495057;
      border: 1px solid #dee2e6;
    }

    .btn-secondary:hover {
      background: #e9ecef;
      transform: translateY(-1px);
    }

    .refresh-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .health-overview {
      margin-bottom: 2rem;
    }

    .health-card {
      background: white;
      padding: 2rem;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border-left: 4px solid #28a745;
    }

    .health-card.degraded {
      border-left-color: #ffc107;
    }

    .health-card.unhealthy {
      border-left-color: #dc3545;
    }

    .health-icon {
      font-size: 3rem;
      position: relative;
    }

    .status-indicator {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-indicator.healthy {
      background: #28a745;
    }

    .status-indicator.degraded {
      background: #ffc107;
    }

    .status-indicator.unhealthy {
      background: #dc3545;
    }

    .services-section, .metrics-section, .app-metrics-section, .auto-refresh-section {
      background: white;
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .services-section h2, .metrics-section h2, .app-metrics-section h2 {
      font-size: 1.8rem;
      font-weight: 600;
      color: #0a2342;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 0.5rem;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .service-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .service-card.online {
      border-color: #28a745;
      background: linear-gradient(135deg, #d4edda 0%, #ffffff 100%);
    }

    .service-card.offline {
      border-color: #dc3545;
      background: linear-gradient(135deg, #f8d7da 0%, #ffffff 100%);
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .service-header h4 {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0;
      color: #0a2342;
    }

    .service-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
    }

    .service-status.online {
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
    }

    .service-status.offline {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: block;
    }

    .service-status.online .status-dot {
      background: #28a745;
    }

    .service-status.offline .status-dot {
      background: #dc3545;
    }

    .service-details {
      display: grid;
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item .label {
      font-weight: 500;
      color: #6c757d;
    }

    .detail-item .value {
      font-weight: 600;
      color: #495057;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .metric-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .metric-header h4 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: #495057;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.5s ease;
      border-radius: 4px;
    }

    .metric-details {
      text-align: center;
      color: #6c757d;
    }

    .metric-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 1rem;
      color: #667eea;
    }

    .app-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .app-metric-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: all 0.3s ease;
    }

    .app-metric-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .app-metric-card .metric-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .app-metric-card h4 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #495057;
    }

    .metric-number {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 0.25rem;
    }

    .app-metric-card small {
      color: #6c757d;
      font-size: 0.85rem;
    }

    .refresh-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      color: #495057;
    }

    .checkbox-label input[type="checkbox"] {
      margin: 0;
    }

    .refresh-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .countdown {
      font-weight: 600;
      color: #667eea;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .monitoring-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .header-actions {
        justify-content: center;
      }

      .services-grid, .metrics-grid, .app-metrics-grid {
        grid-template-columns: 1fr;
      }

      .refresh-controls {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class SystemMonitoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = false;
  autoRefresh = true;
  countdown = 30;
  
  systemHealth: any = {
    status: 'healthy',
    lastCheck: new Date()
  };
  
  servicesStatus: any[] = [];
  systemMetrics: any = {
    system: {
      cpuUsage: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      diskUsage: { used: 0, total: 0, free: 0, percentage: 0 },
      uptime: '0d 0h 0m'
    },
    application: {
      requestCount: 0,
      errorCount: 0,
      activeConnections: 0,
      responseTime: 0
    }
  };

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
    this.loadSystemHealth();
    this.loadServicesStatus();
    this.loadSystemMetrics();
  }

  loadSystemHealth() {
    this.apiService.getSystemHealth().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.systemHealth = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load system health:', error);
      }
    });
  }

  loadServicesStatus() {
    this.apiService.getServicesStatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.servicesStatus = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load services status:', error);
      }
    });
  }

  loadSystemMetrics() {
    this.apiService.getSystemMetrics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.systemMetrics = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load system metrics:', error);
      }
    });
  }

  refreshAll() {
    this.loading = true;
    this.loadData();
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  startAutoRefresh() {
    if (this.autoRefresh) {
      interval(1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.countdown--;
          if (this.countdown <= 0) {
            this.loadData();
            this.countdown = 30;
          }
        });
    }
  }

  getHealthIcon(): string {
    switch (this.systemHealth.status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
