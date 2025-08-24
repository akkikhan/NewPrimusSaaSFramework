import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';

interface GatewayStatus {
  isHealthy: boolean;
  uptime: string;
  version: string;
  environment: string;
  lastHealthCheck: string;
  requestsPerMinute: number;
  errorRate: number;
}

interface ModuleGuardStats {
  totalRequests: number;
  blockedRequests: number;
  cachingStats: {
    hitRate: number;
    cacheSize: number;
  };
  backoffStats: {
    activeBackoffs: number;
    totalBackoffs: number;
  };
  timeoutStats: {
    timeouts: number;
    averageResponseTime: number;
  };
}

interface ModuleGuardConfig {
  cachingEnabled: boolean;
  cacheExpiryMinutes: number;
  backoffEnabled: boolean;
  maxBackoffMinutes: number;
  timeoutEnabled: boolean;
  timeoutSeconds: number;
}

interface RecentActivity {
  timestamp: string;
  tenantId: string;
  moduleId: string;
  action: string;
  result: 'allowed' | 'blocked' | 'error';
  responseTime: number;
}

@Component({
  selector: 'app-gateway-status',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="gateway-status-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Gateway Status</h1>
          <p>Monitor Gateway health and Module Guard performance</p>
        </div>
        
        <div class="refresh-controls">
          <label class="auto-refresh-toggle">
            <input type="checkbox" [(ngModel)]="autoRefresh" (change)="toggleAutoRefresh()">
            Auto-refresh ({{refreshInterval/1000}}s)
          </label>
          <button class="btn-secondary" (click)="refreshAll()">
            🔄 Refresh Now
          </button>
        </div>
      </div>

      <!-- Gateway Health Status -->
      <div class="status-card" [class]="'health-' + (gatewayStatus?.isHealthy ? 'healthy' : 'unhealthy')">
        <div class="card-header">
          <h3>Gateway Health</h3>
          <div class="status-indicator" [class]="'status-' + (gatewayStatus?.isHealthy ? 'healthy' : 'unhealthy')">
            <span *ngIf="gatewayStatus?.isHealthy">✅ Healthy</span>
            <span *ngIf="!gatewayStatus?.isHealthy && gatewayStatus">❌ Unhealthy</span>
            <span *ngIf="!gatewayStatus">⏳ Loading...</span>
          </div>
        </div>

        <div *ngIf="gatewayStatus" class="health-metrics">
          <div class="metric-grid">
            <div class="metric-item">
              <span class="metric-label">Uptime</span>
              <span class="metric-value">{{gatewayStatus.uptime}}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Version</span>
              <span class="metric-value">{{gatewayStatus.version}}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Environment</span>
              <span class="metric-value environment">{{gatewayStatus.environment}}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Last Check</span>
              <span class="metric-value">{{formatTime(gatewayStatus.lastHealthCheck)}}</span>
            </div>
          </div>

          <div class="performance-metrics">
            <div class="perf-item">
              <span class="perf-label">Requests/min</span>
              <span class="perf-value requests">{{gatewayStatus.requestsPerMinute}}</span>
            </div>
            <div class="perf-item">
              <span class="perf-label">Error Rate</span>
              <span class="perf-value" [class]="getErrorRateClass(gatewayStatus.errorRate)">
                {{gatewayStatus.errorRate.toFixed(2)}}%
              </span>
            </div>
          </div>
        </div>

        <div *ngIf="healthError" class="error-message">
          <span class="error-icon">❌</span>
          <span>{{healthError}}</span>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Module Guard Configuration -->
        <div class="info-card">
          <div class="card-header">
            <h3>Module Guard Configuration</h3>
            <span class="config-status" [class]="moduleGuardConfig ? 'active' : 'loading'">
              {{moduleGuardConfig ? 'Active' : 'Loading...'}}
            </span>
          </div>

          <div *ngIf="moduleGuardConfig" class="config-grid">
            <div class="config-section">
              <h4>Caching</h4>
              <div class="config-item">
                <span class="config-toggle" [class]="moduleGuardConfig.cachingEnabled ? 'enabled' : 'disabled'">
                  {{moduleGuardConfig.cachingEnabled ? '✅' : '❌'}}
                </span>
                <span>{{moduleGuardConfig.cachingEnabled ? 'Enabled' : 'Disabled'}}</span>
              </div>
              <div class="config-detail">
                Cache Expiry: {{moduleGuardConfig.cacheExpiryMinutes}} minutes
              </div>
            </div>

            <div class="config-section">
              <h4>Backoff Strategy</h4>
              <div class="config-item">
                <span class="config-toggle" [class]="moduleGuardConfig.backoffEnabled ? 'enabled' : 'disabled'">
                  {{moduleGuardConfig.backoffEnabled ? '✅' : '❌'}}
                </span>
                <span>{{moduleGuardConfig.backoffEnabled ? 'Enabled' : 'Disabled'}}</span>
              </div>
              <div class="config-detail">
                Max Backoff: {{moduleGuardConfig.maxBackoffMinutes}} minutes
              </div>
            </div>

            <div class="config-section">
              <h4>Timeout Control</h4>
              <div class="config-item">
                <span class="config-toggle" [class]="moduleGuardConfig.timeoutEnabled ? 'enabled' : 'disabled'">
                  {{moduleGuardConfig.timeoutEnabled ? '✅' : '❌'}}
                </span>
                <span>{{moduleGuardConfig.timeoutEnabled ? 'Enabled' : 'Disabled'}}</span>
              </div>
              <div class="config-detail">
                Timeout: {{moduleGuardConfig.timeoutSeconds}} seconds
              </div>
            </div>
          </div>

          <div *ngIf="configError" class="error-message">
            <span class="error-icon">❌</span>
            <span>{{configError}}</span>
          </div>
        </div>

        <!-- Module Guard Statistics -->
        <div class="stats-card">
          <div class="card-header">
            <h3>Module Guard Statistics</h3>
            <span class="last-updated">Updated: {{formatTime(statsLastUpdated)}}</span>
          </div>

          <div *ngIf="moduleGuardStats" class="stats-grid">
            <div class="stat-section">
              <h4>Request Statistics</h4>
              <div class="stat-item">
                <span class="stat-value total">{{moduleGuardStats.totalRequests}}</span>
                <span class="stat-label">Total Requests</span>
              </div>
              <div class="stat-item">
                <span class="stat-value blocked">{{moduleGuardStats.blockedRequests}}</span>
                <span class="stat-label">Blocked Requests</span>
              </div>
              <div class="stat-item">
                <span class="stat-value success">{{getSuccessRequests()}}</span>
                <span class="stat-label">Successful Requests</span>
              </div>
            </div>

            <div class="stat-section">
              <h4>Cache Performance</h4>
              <div class="stat-item">
                <span class="stat-value cache" [class]="getCacheHitRateClass(moduleGuardStats.cachingStats.hitRate)">
                  {{moduleGuardStats.cachingStats.hitRate.toFixed(1)}}%
                </span>
                <span class="stat-label">Hit Rate</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{moduleGuardStats.cachingStats.cacheSize}}</span>
                <span class="stat-label">Cache Size</span>
              </div>
            </div>

            <div class="stat-section">
              <h4>Backoff & Timeouts</h4>
              <div class="stat-item">
                <span class="stat-value backoff">{{moduleGuardStats.backoffStats.activeBackoffs}}</span>
                <span class="stat-label">Active Backoffs</span>
              </div>
              <div class="stat-item">
                <span class="stat-value timeout">{{moduleGuardStats.timeoutStats.timeouts}}</span>
                <span class="stat-label">Timeouts</span>
              </div>
              <div class="stat-item">
                <span class="stat-value performance">{{moduleGuardStats.timeoutStats.averageResponseTime}}ms</span>
                <span class="stat-label">Avg Response Time</span>
              </div>
            </div>
          </div>

          <div *ngIf="statsError" class="error-message">
            <span class="error-icon">❌</span>
            <span>{{statsError}}</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="activity-card">
        <div class="card-header">
          <h3>Recent Activity</h3>
          <div class="activity-filters">
            <select [(ngModel)]="activityFilter" (change)="filterActivity()">
              <option value="all">All Activities</option>
              <option value="allowed">Allowed Only</option>
              <option value="blocked">Blocked Only</option>
              <option value="error">Errors Only</option>
            </select>
          </div>
        </div>

        <div class="activity-list" *ngIf="filteredActivity.length > 0">
          <div *ngFor="let activity of filteredActivity.slice(0, 10)" 
               class="activity-item" 
               [class]="'result-' + activity.result">
            <div class="activity-main">
              <div class="activity-info">
                <span class="activity-tenant">{{activity.tenantId}}</span>
                <span class="activity-module">{{activity.moduleId}}</span>
                <span class="activity-action">{{activity.action}}</span>
              </div>
              <div class="activity-result">
                <span class="result-indicator" [class]="'result-' + activity.result">
                  <span *ngIf="activity.result === 'allowed'">✅ Allowed</span>
                  <span *ngIf="activity.result === 'blocked'">🔴 Blocked</span>
                  <span *ngIf="activity.result === 'error'">❌ Error</span>
                </span>
                <span class="response-time">{{activity.responseTime}}ms</span>
              </div>
            </div>
            <div class="activity-time">
              {{formatTime(activity.timestamp)}}
            </div>
          </div>
        </div>

        <div *ngIf="filteredActivity.length === 0" class="empty-activity">
          <span class="empty-icon">📋</span>
          <p>No recent activity to display</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gateway-status-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      color: #002F87;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .page-header p {
      color: #666;
      margin: 0;
    }

    .refresh-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .auto-refresh-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: #666;
      cursor: pointer;
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #002F87;
      border: 1px solid #002F87;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .status-card {
      background: white;
      border-radius: 12px;
      border: 2px solid #e0e0e0;
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .status-card.health-healthy {
      border-color: #28a745;
      background: linear-gradient(135deg, #ffffff 0%, #f8fff9 100%);
    }

    .status-card.health-unhealthy {
      border-color: #dc3545;
      background: linear-gradient(135deg, #ffffff 0%, #fff8f8 100%);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .card-header h3 {
      color: #002F87;
      margin: 0;
    }

    .status-indicator {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .status-indicator.status-healthy {
      background: #d4edda;
      color: #155724;
    }

    .status-indicator.status-unhealthy {
      background: #f8d7da;
      color: #721c24;
    }

    .health-metrics {
      padding: 1.5rem;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .metric-label {
      font-size: 0.8rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #002F87;
    }

    .metric-value.environment {
      color: #856404;
      background: #fff3cd;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }

    .performance-metrics {
      display: flex;
      gap: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .perf-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .perf-label {
      font-size: 0.8rem;
      color: #666;
    }

    .perf-value {
      font-size: 1.3rem;
      font-weight: 700;
    }

    .perf-value.requests {
      color: #007bff;
    }

    .perf-value.error-low {
      color: #28a745;
    }

    .perf-value.error-medium {
      color: #ffc107;
    }

    .perf-value.error-high {
      color: #dc3545;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .info-card,
    .stats-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .config-status {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .config-status.active {
      background: #d4edda;
      color: #155724;
    }

    .config-status.loading {
      background: #d1ecf1;
      color: #0c5460;
    }

    .config-grid {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .config-section h4 {
      color: #002F87;
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
    }

    .config-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .config-toggle {
      width: 20px;
      text-align: center;
    }

    .config-detail {
      font-size: 0.85rem;
      color: #666;
      margin-left: 2.5rem;
    }

    .stats-grid {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stat-section h4 {
      color: #002F87;
      margin: 0 0 1rem 0;
      font-size: 1rem;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .stat-item:last-child {
      border-bottom: none;
    }

    .stat-value {
      font-size: 1.2rem;
      font-weight: 600;
    }

    .stat-value.total {
      color: #007bff;
    }

    .stat-value.blocked {
      color: #dc3545;
    }

    .stat-value.success {
      color: #28a745;
    }

    .stat-value.cache.excellent {
      color: #28a745;
    }

    .stat-value.cache.good {
      color: #007bff;
    }

    .stat-value.cache.poor {
      color: #ffc107;
    }

    .stat-value.backoff {
      color: #ffc107;
    }

    .stat-value.timeout {
      color: #dc3545;
    }

    .stat-value.performance {
      color: #17a2b8;
    }

    .stat-label {
      font-size: 0.85rem;
      color: #666;
    }

    .last-updated {
      font-size: 0.8rem;
      color: #666;
    }

    .activity-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .activity-filters select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .activity-list {
      padding: 1rem;
    }

    .activity-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-left: 4px solid #e0e0e0;
      margin-bottom: 0.75rem;
      background: #f8f9fa;
      border-radius: 0 8px 8px 0;
    }

    .activity-item.result-allowed {
      border-left-color: #28a745;
      background: #f8fff9;
    }

    .activity-item.result-blocked {
      border-left-color: #dc3545;
      background: #fff8f8;
    }

    .activity-item.result-error {
      border-left-color: #ffc107;
      background: #fffbf0;
    }

    .activity-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      margin-right: 1rem;
    }

    .activity-info {
      display: flex;
      gap: 1rem;
    }

    .activity-tenant {
      font-weight: 600;
      color: #002F87;
    }

    .activity-module {
      color: #666;
    }

    .activity-action {
      font-style: italic;
      color: #666;
    }

    .activity-result {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .result-indicator {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .result-indicator.result-allowed {
      background: #d4edda;
      color: #155724;
    }

    .result-indicator.result-blocked {
      background: #f8d7da;
      color: #721c24;
    }

    .result-indicator.result-error {
      background: #fff3cd;
      color: #856404;
    }

    .response-time {
      font-family: monospace;
      font-size: 0.8rem;
      color: #666;
    }

    .activity-time {
      font-size: 0.8rem;
      color: #666;
      white-space: nowrap;
    }

    .empty-activity {
      padding: 3rem;
      text-align: center;
      color: #666;
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.5;
      display: block;
      margin-bottom: 1rem;
    }

    .error-message {
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #721c24;
      background: #f8d7da;
    }

    .error-icon {
      font-size: 1.2rem;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 1rem;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .metric-grid {
        grid-template-columns: 1fr;
      }

      .performance-metrics {
        flex-direction: column;
        gap: 1rem;
      }

      .activity-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .activity-info {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `]
})
export class GatewayStatusComponent implements OnInit, OnDestroy {
  autoRefresh = true;
  refreshInterval = 30000; // 30 seconds
  private refreshSubscription?: Subscription;

  gatewayStatus: GatewayStatus | null = null;
  moduleGuardStats: ModuleGuardStats | null = null;
  moduleGuardConfig: ModuleGuardConfig | null = null;
  recentActivity: RecentActivity[] = [];
  filteredActivity: RecentActivity[] = [];
  activityFilter = 'all';

  healthError = '';
  statsError = '';
  configError = '';
  statsLastUpdated = '';

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    console.log('📊 GatewayStatusComponent initialized');
    this.refreshAll();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  refreshAll() {
    console.log('🔄 Refreshing all Gateway status data...');
    this.loadGatewayHealth();
    this.loadModuleGuardStats();
    this.loadModuleGuardConfig();
    this.loadRecentActivity();
  }

  loadGatewayHealth() {
    this.healthError = '';
    
    this.apiService.getGatewayHealth().subscribe({
      next: (response: any) => {
        console.log('💚 Gateway health response:', response);
        this.gatewayStatus = {
          isHealthy: response.status === 'Healthy' || response.healthy === true,
          uptime: response.uptime || 'Unknown',
          version: response.version || '1.0.0',
          environment: response.environment || 'Production',
          lastHealthCheck: new Date().toISOString(),
          requestsPerMinute: response.requestsPerMinute || 0,
          errorRate: response.errorRate || 0
        };
      },
      error: (error: any) => {
        console.error('❌ Error loading Gateway health:', error);
        this.healthError = this.apiService.handleError(error);
        this.gatewayStatus = null;
      }
    });
  }

  loadModuleGuardStats() {
    this.statsError = '';
    
    this.apiService.getModuleGuardStats().subscribe({
      next: (response: any) => {
        console.log('📊 Module Guard stats response:', response);
        this.moduleGuardStats = {
          totalRequests: response.totalRequests || 0,
          blockedRequests: response.blockedRequests || 0,
          cachingStats: {
            hitRate: response.cachingStats?.hitRate || 0,
            cacheSize: response.cachingStats?.cacheSize || 0
          },
          backoffStats: {
            activeBackoffs: response.backoffStats?.activeBackoffs || 0,
            totalBackoffs: response.backoffStats?.totalBackoffs || 0
          },
          timeoutStats: {
            timeouts: response.timeoutStats?.timeouts || 0,
            averageResponseTime: response.timeoutStats?.averageResponseTime || 0
          }
        };
        this.statsLastUpdated = new Date().toISOString();
      },
      error: (error: any) => {
        console.error('❌ Error loading Module Guard stats:', error);
        this.statsError = this.apiService.handleError(error);
        this.moduleGuardStats = null;
      }
    });
  }

  loadModuleGuardConfig() {
    this.configError = '';
    
    this.apiService.getModuleGuardConfig().subscribe({
      next: (response: any) => {
        console.log('⚙️ Module Guard config response:', response);
        this.moduleGuardConfig = {
          cachingEnabled: response.cachingEnabled !== false,
          cacheExpiryMinutes: response.cacheExpiryMinutes || 30,
          backoffEnabled: response.backoffEnabled !== false,
          maxBackoffMinutes: response.maxBackoffMinutes || 60,
          timeoutEnabled: response.timeoutEnabled !== false,
          timeoutSeconds: response.timeoutSeconds || 30
        };
      },
      error: (error: any) => {
        console.error('❌ Error loading Module Guard config:', error);
        this.configError = this.apiService.handleError(error);
        this.moduleGuardConfig = null;
      }
    });
  }

  loadRecentActivity() {
    // Mock recent activity data for demo purposes
    // In a real implementation, this would call an API endpoint
    this.recentActivity = [
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        tenantId: 'tenant-001',
        moduleId: 'document-management',
        action: 'access-documents',
        result: 'allowed',
        responseTime: 45
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        tenantId: 'tenant-002',
        moduleId: 'analytics',
        action: 'view-reports',
        result: 'blocked',
        responseTime: 12
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        tenantId: 'tenant-001',
        moduleId: 'user-management',
        action: 'create-user',
        result: 'allowed',
        responseTime: 67
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        tenantId: 'tenant-003',
        moduleId: 'billing',
        action: 'generate-invoice',
        result: 'error',
        responseTime: 5000
      }
    ];
    
    this.filterActivity();
  }

  filterActivity() {
    if (this.activityFilter === 'all') {
      this.filteredActivity = [...this.recentActivity];
    } else {
      this.filteredActivity = this.recentActivity.filter(
        activity => activity.result === this.activityFilter
      );
    }
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        this.refreshAll();
      });
      console.log(`🔄 Auto-refresh started (${this.refreshInterval/1000}s interval)`);
    }
  }

  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
      console.log('⏹️ Auto-refresh stopped');
    }
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  getErrorRateClass(errorRate: number): string {
    if (errorRate <= 1) return 'error-low';
    if (errorRate <= 5) return 'error-medium';
    return 'error-high';
  }

  getCacheHitRateClass(hitRate: number): string {
    if (hitRate >= 80) return 'excellent';
    if (hitRate >= 60) return 'good';
    return 'poor';
  }

  getSuccessRequests(): number {
    if (!this.moduleGuardStats) return 0;
    return this.moduleGuardStats.totalRequests - this.moduleGuardStats.blockedRequests;
  }
}
