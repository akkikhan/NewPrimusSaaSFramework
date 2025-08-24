import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';

@Component({
  selector: 'app-audit-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="audit-reports-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Audit Reports</h1>
          <p>Generate comprehensive audit reports and compliance documentation</p>
        </div>
        <div class="header-actions">
          <button class="btn-outline" (click)="exportReport()">
            📊 Export Report
          </button>
          <button class="btn-primary" routerLink="/audit">
            ← Back to Audit Logs
          </button>
        </div>
      </div>

      <!-- Report Filters -->
      <div class="filters-section">
        <h3>📋 Report Configuration</h3>
        <div class="filters-grid">
          <div class="filter-group">
            <label for="reportType">Report Type</label>
            <select id="reportType" [(ngModel)]="filters.reportType" (change)="onFilterChange()" class="form-select">
              <option value="security">🔒 Security Report</option>
              <option value="compliance">📋 Compliance Report</option>
              <option value="user-activity">👥 User Activity Report</option>
              <option value="system-events">⚙️ System Events Report</option>
              <option value="data-access">📊 Data Access Report</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="dateRange">Date Range</label>
            <select id="dateRange" [(ngModel)]="filters.dateRange" (change)="onDateRangeChange()" class="form-select">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div class="filter-group" *ngIf="filters.dateRange === 'custom'">
            <label for="startDate">Start Date</label>
            <input type="date" id="startDate" [(ngModel)]="filters.startDate" (change)="onFilterChange()" class="form-input">
          </div>

          <div class="filter-group" *ngIf="filters.dateRange === 'custom'">
            <label for="endDate">End Date</label>
            <input type="date" id="endDate" [(ngModel)]="filters.endDate" (change)="onFilterChange()" class="form-input">
          </div>

          <div class="filter-group">
            <label for="severity">Severity Level</label>
            <select id="severity" [(ngModel)]="filters.severity" (change)="onFilterChange()" class="form-select">
              <option value="">All Levels</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="tenant">Tenant</label>
            <select id="tenant" [(ngModel)]="filters.tenantId" (change)="onFilterChange()" class="form-select">
              <option value="">All Tenants</option>
              <option *ngFor="let tenant of availableTenants" [value]="tenant.id">
                {{tenant.name}}
              </option>
            </select>
          </div>
        </div>

        <div class="filter-actions">
          <button class="btn-outline" (click)="resetFilters()">Reset Filters</button>
          <button class="btn-primary" (click)="generateReport()" [disabled]="generating">
            {{generating ? '📊 Generating...' : '📊 Generate Report'}}
          </button>
        </div>
      </div>

      <!-- Report Summary -->
      <div class="summary-section" *ngIf="reportData">
        <h3>📈 Report Summary</h3>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <div class="card-value">{{reportData.totalEvents}}</div>
              <div class="card-label">Total Events</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">🔴</div>
            <div class="card-content">
              <div class="card-value">{{reportData.criticalEvents}}</div>
              <div class="card-label">Critical Events</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">👥</div>
            <div class="card-content">
              <div class="card-value">{{reportData.uniqueUsers}}</div>
              <div class="card-label">Unique Users</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">📅</div>
            <div class="card-content">
              <div class="card-value">{{formatDateRange()}}</div>
              <div class="card-label">Date Range</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Content -->
      <div class="report-content" *ngIf="reportData">
        <div class="content-tabs">
          <button 
            class="tab-btn"
            [class.active]="activeTab === 'overview'"
            (click)="setActiveTab('overview')">
            📊 Overview
          </button>
          <button 
            class="tab-btn"
            [class.active]="activeTab === 'details'"
            (click)="setActiveTab('details')">
            📋 Details
          </button>
          <button 
            class="tab-btn"
            [class.active]="activeTab === 'compliance'"
            (click)="setActiveTab('compliance')">
            ✅ Compliance
          </button>
          <button 
            class="tab-btn"
            [class.active]="activeTab === 'recommendations'"
            (click)="setActiveTab('recommendations')">
            💡 Recommendations
          </button>
        </div>

        <div class="tab-content">
          <!-- Overview Tab -->
          <div *ngIf="activeTab === 'overview'" class="tab-panel">
            <div class="charts-grid">
              <div class="chart-container">
                <h4>Event Types Distribution</h4>
                <div class="chart-placeholder">
                  <div class="chart-item" *ngFor="let item of reportData.eventTypes">
                    <div class="chart-bar" [style.width.%]="item.percentage"></div>
                    <span class="chart-label">{{item.name}} ({{item.count}})</span>
                  </div>
                </div>
              </div>

              <div class="chart-container">
                <h4>Activity Timeline</h4>
                <div class="timeline-chart">
                  <div class="timeline-item" *ngFor="let item of reportData.timeline">
                    <div class="timeline-date">{{formatDate(item.date)}}</div>
                    <div class="timeline-bar" [style.height.px]="item.events * 2"></div>
                    <div class="timeline-count">{{item.events}}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Details Tab -->
          <div *ngIf="activeTab === 'details'" class="tab-panel">
            <div class="details-table">
              <table class="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Result</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let event of reportData.events">
                    <td>{{formatDateTime(event.timestamp)}}</td>
                    <td>{{event.eventType}}</td>
                    <td>{{event.user}}</td>
                    <td>{{event.action}}</td>
                    <td>
                      <span class="status-badge" [class]="'status-' + event.result.toLowerCase()">
                        {{event.result}}
                      </span>
                    </td>
                    <td>
                      <span class="severity-badge" [class]="'severity-' + event.severity.toLowerCase()">
                        {{event.severity}}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Compliance Tab -->
          <div *ngIf="activeTab === 'compliance'" class="tab-panel">
            <div class="compliance-checklist">
              <h4>Compliance Status</h4>
              <div class="compliance-item" *ngFor="let item of reportData.compliance">
                <div class="compliance-status">
                  <span class="status-icon" [class]="item.status">
                    {{item.status === 'pass' ? '✅' : item.status === 'fail' ? '❌' : '⚠️'}}
                  </span>
                  <span class="compliance-name">{{item.name}}</span>
                </div>
                <div class="compliance-description">{{item.description}}</div>
                <div class="compliance-score">Score: {{item.score}}%</div>
              </div>
            </div>
          </div>

          <!-- Recommendations Tab -->
          <div *ngIf="activeTab === 'recommendations'" class="tab-panel">
            <div class="recommendations-list">
              <h4>Security Recommendations</h4>
              <div class="recommendation-item" *ngFor="let rec of reportData.recommendations">
                <div class="recommendation-priority" [class]="'priority-' + rec.priority">
                  {{rec.priority}}
                </div>
                <div class="recommendation-content">
                  <h5>{{rec.title}}</h5>
                  <p>{{rec.description}}</p>
                  <div class="recommendation-actions">
                    <button class="btn-sm btn-primary">Implement</button>
                    <button class="btn-sm btn-outline">Learn More</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="generating" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Generating audit report...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!reportData && !generating" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No Report Generated</h3>
        <p>Configure your filters above and click "Generate Report" to create an audit report.</p>
      </div>
    </div>
  `,
  styles: [`
    .audit-reports-container {
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

    .filters-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .filters-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.3rem;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
    }

    .filter-group label {
      color: #2c3e50;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input, .form-select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
    }

    .filter-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .summary-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.3rem;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .card-icon {
      font-size: 2rem;
    }

    .card-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .card-label {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .report-content {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .content-tabs {
      display: flex;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .tab-btn {
      padding: 1rem 1.5rem;
      border: none;
      background: none;
      cursor: pointer;
      font-weight: 500;
      color: #7f8c8d;
      transition: all 0.3s ease;
    }

    .tab-btn.active {
      color: #2196f3;
      background: white;
      border-bottom: 2px solid #2196f3;
    }

    .tab-content {
      padding: 1.5rem;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
    }

    .chart-container {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .chart-container h4 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
    }

    .chart-placeholder .chart-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .chart-bar {
      height: 20px;
      background: #2196f3;
      border-radius: 4px;
      min-width: 20px;
    }

    .chart-label {
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .timeline-chart {
      display: flex;
      align-items: end;
      gap: 0.5rem;
      height: 200px;
    }

    .timeline-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
    }

    .timeline-bar {
      background: #2196f3;
      width: 20px;
      min-height: 10px;
      border-radius: 2px;
    }

    .timeline-date {
      font-size: 0.8rem;
      color: #7f8c8d;
      margin-bottom: 0.5rem;
    }

    .timeline-count {
      font-size: 0.8rem;
      color: #2c3e50;
      margin-top: 0.25rem;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
    }

    .audit-table th,
    .audit-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    .audit-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
    }

    .status-badge, .severity-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-success {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-failed {
      background: #ffebee;
      color: #c62828;
    }

    .severity-critical {
      background: #ffebee;
      color: #c62828;
    }

    .severity-high {
      background: #fff3e0;
      color: #ef6c00;
    }

    .severity-medium {
      background: #fffde7;
      color: #f57f17;
    }

    .severity-low {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .compliance-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .compliance-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .compliance-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .compliance-description {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .compliance-score {
      color: #2c3e50;
      font-weight: 500;
    }

    .recommendation-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .recommendation-priority {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-high {
      background: #ffebee;
      color: #c62828;
    }

    .priority-medium {
      background: #fff3e0;
      color: #ef6c00;
    }

    .priority-low {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .recommendation-content h5 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .recommendation-content p {
      color: #7f8c8d;
      margin: 0 0 1rem 0;
    }

    .recommendation-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }

    .btn-primary, .btn-secondary, .btn-outline {
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

    .btn-outline {
      background: white;
      color: #2196f3;
      border: 1px solid #2196f3;
    }

    .loading-container, .empty-state {
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

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    @media (max-width: 768px) {
      .audit-reports-container {
        padding: 1rem;
      }
      
      .filters-grid {
        grid-template-columns: 1fr;
      }
      
      .summary-cards {
        grid-template-columns: 1fr;
      }
      
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AuditReportsComponent implements OnInit {
  generating = false;
  activeTab = 'overview';
  reportData: any = null;

  filters = {
    reportType: 'security',
    dateRange: 'month',
    startDate: '',
    endDate: '',
    severity: '',
    tenantId: ''
  };

  availableTenants = [
    { id: 'tenant-1', name: 'Acme Corporation' },
    { id: 'tenant-2', name: 'Tech Solutions Ltd' },
    { id: 'tenant-3', name: 'Global Industries' }
  ];

  constructor(
    private apiService: ApiService,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.setDefaultDateRange();
  }

  setDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    this.filters.startDate = thirtyDaysAgo.toISOString().split('T')[0];
    this.filters.endDate = today.toISOString().split('T')[0];
  }

  onDateRangeChange() {
    const today = new Date();
    
    switch (this.filters.dateRange) {
      case 'today':
        this.filters.startDate = today.toISOString().split('T')[0];
        this.filters.endDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        this.filters.startDate = weekAgo.toISOString().split('T')[0];
        this.filters.endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        this.filters.startDate = monthAgo.toISOString().split('T')[0];
        this.filters.endDate = today.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
        this.filters.startDate = quarterAgo.toISOString().split('T')[0];
        this.filters.endDate = today.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
        this.filters.startDate = yearAgo.toISOString().split('T')[0];
        this.filters.endDate = today.toISOString().split('T')[0];
        break;
    }
  }

  onFilterChange() {
    // Filters changed - could auto-regenerate or wait for user action
  }

  resetFilters() {
    this.filters = {
      reportType: 'security',
      dateRange: 'month',
      startDate: '',
      endDate: '',
      severity: '',
      tenantId: ''
    };
    this.setDefaultDateRange();
    this.reportData = null;
  }

  generateReport() {
    this.generating = true;

    // Simulate API call
    setTimeout(() => {
      this.reportData = {
        totalEvents: 1247,
        criticalEvents: 12,
        uniqueUsers: 234,
        eventTypes: [
          { name: 'Login', count: 543, percentage: 45 },
          { name: 'Data Access', count: 312, percentage: 25 },
          { name: 'Settings Change', count: 234, percentage: 18 },
          { name: 'System Alert', count: 158, percentage: 12 }
        ],
        timeline: [
          { date: '2024-01-01', events: 45 },
          { date: '2024-01-02', events: 67 },
          { date: '2024-01-03', events: 52 },
          { date: '2024-01-04', events: 89 },
          { date: '2024-01-05', events: 73 }
        ],
        events: [
          {
            timestamp: new Date().toISOString(),
            eventType: 'Authentication',
            user: 'john.doe@example.com',
            action: 'Login Failed',
            result: 'Failed',
            severity: 'Medium'
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            eventType: 'Data Access',
            user: 'jane.smith@example.com',
            action: 'Export Data',
            result: 'Success',
            severity: 'Low'
          }
        ],
        compliance: [
          { name: 'GDPR Compliance', description: 'Data protection regulations', score: 98, status: 'pass' },
          { name: 'SOX Compliance', description: 'Financial reporting standards', score: 85, status: 'warn' },
          { name: 'HIPAA Compliance', description: 'Healthcare data protection', score: 92, status: 'pass' }
        ],
        recommendations: [
          {
            priority: 'high',
            title: 'Enable Multi-Factor Authentication',
            description: 'Implement MFA for all user accounts to enhance security.'
          },
          {
            priority: 'medium',
            title: 'Review Access Permissions',
            description: 'Conduct quarterly review of user access permissions.'
          }
        ]
      };
      this.generating = false;
    }, 2000);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  exportReport() {
    this.dialogService.success(
      'Export Started',
      'Your audit report is being exported and will be available shortly.'
    );
  }

  formatDateRange(): string {
    if (this.filters.startDate && this.filters.endDate) {
      return `${this.formatDate(this.filters.startDate)} - ${this.formatDate(this.filters.endDate)}`;
    }
    return 'All Time';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
} 