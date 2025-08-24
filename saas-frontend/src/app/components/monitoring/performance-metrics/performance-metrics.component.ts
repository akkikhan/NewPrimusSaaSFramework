import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-performance-metrics',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="performance-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Performance Analytics</h1>
          <p>Application performance metrics, trends, and optimization insights</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/monitoring">
            ← Back to Monitoring
          </button>
          <select class="time-range-select" [(ngModel)]="selectedTimeRange" (change)="loadPerformanceData()">
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      <!-- Key Performance Indicators -->
      <div class="kpi-section">
        <h2>Key Performance Indicators</h2>
        <div class="kpi-grid">
          <div class="kpi-card response-time">
            <div class="kpi-icon">⚡</div>
            <div class="kpi-content">
              <h3>{{performanceData.metrics?.averageResponseTime || 0}}ms</h3>
              <p>Average Response Time</p>
              <span class="kpi-trend" [class.positive]="getResponseTimeTrend() > 0" [class.negative]="getResponseTimeTrend() < 0">
                {{getResponseTimeTrend() > 0 ? '↗' : '↘'}} {{Math.abs(getResponseTimeTrend())}}%
              </span>
            </div>
          </div>

          <div class="kpi-card throughput">
            <div class="kpi-icon">📊</div>
            <div class="kpi-content">
              <h3>{{performanceData.metrics?.requestsPerSecond || 0}}</h3>
              <p>Requests per Second</p>
              <span class="kpi-trend positive">↗ 12%</span>
            </div>
          </div>

          <div class="kpi-card error-rate">
            <div class="kpi-icon">⚠️</div>
            <div class="kpi-content">
              <h3>{{performanceData.metrics?.errorRate || 0}}%</h3>
              <p>Error Rate</p>
              <span class="kpi-trend" [class.positive]="performanceData.metrics?.errorRate < 1" [class.negative]="performanceData.metrics?.errorRate >= 1">
                {{performanceData.metrics?.errorRate < 1 ? '↘' : '↗'}} {{Math.abs(performanceData.metrics?.errorRate || 0)}}%
              </span>
            </div>
          </div>

          <div class="kpi-card throughput-data">
            <div class="kpi-icon">🔄</div>
            <div class="kpi-content">
              <h3>{{formatBytes(performanceData.metrics?.throughput || 0)}}/s</h3>
              <p>Data Throughput</p>
              <span class="kpi-trend positive">↗ 8%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Charts -->
      <div class="charts-section">
        <h2>Performance Trends</h2>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Response Time Trend</h3>
            <div class="chart-placeholder">
              <div class="mock-chart response-chart">
                <div class="chart-bars">
                  <div class="bar" style="height: 60%"></div>
                  <div class="bar" style="height: 40%"></div>
                  <div class="bar" style="height: 80%"></div>
                  <div class="bar" style="height: 30%"></div>
                  <div class="bar" style="height: 50%"></div>
                  <div class="bar" style="height: 70%"></div>
                  <div class="bar" style="height: 45%"></div>
                  <div class="bar" style="height: 55%"></div>
                  <div class="bar" style="height: 35%"></div>
                  <div class="bar" style="height: 65%"></div>
                </div>
                <div class="chart-labels">
                  <span>10:00</span>
                  <span>11:00</span>
                  <span>12:00</span>
                  <span>13:00</span>
                  <span>14:00</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3>Request Volume</h3>
            <div class="chart-placeholder">
              <div class="mock-chart volume-chart">
                <div class="chart-line">
                  <svg width="100%" height="120" viewBox="0 0 300 120">
                    <polyline points="0,80 30,60 60,70 90,50 120,40 150,60 180,35 210,45 240,30 270,40 300,25"
                             fill="none" stroke="#667eea" stroke-width="3"/>
                    <circle cx="270" cy="40" r="4" fill="#667eea"/>
                  </svg>
                </div>
                <div class="chart-labels">
                  <span>10:00</span>
                  <span>11:00</span>
                  <span>12:00</span>
                  <span>13:00</span>
                  <span>14:00</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3>Error Rate Distribution</h3>
            <div class="chart-placeholder">
              <div class="mock-chart pie-chart">
                <div class="pie-container">
                  <div class="pie-slice success" style="--angle: 320deg"></div>
                  <div class="pie-slice warning" style="--angle: 30deg"></div>
                  <div class="pie-slice error" style="--angle: 10deg"></div>
                </div>
                <div class="pie-legend">
                  <div class="legend-item">
                    <span class="legend-color success"></span>
                    <span>Success (89%)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color warning"></span>
                    <span>Warnings (8%)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color error"></span>
                    <span>Errors (3%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3>Service Health Score</h3>
            <div class="chart-placeholder">
              <div class="health-score-chart">
                <div class="score-circle">
                  <div class="score-value">94</div>
                  <div class="score-label">Health Score</div>
                </div>
                <div class="score-breakdown">
                  <div class="score-item">
                    <span class="score-name">Availability</span>
                    <div class="score-bar">
                      <div class="score-fill" style="width: 98%"></div>
                    </div>
                    <span class="score-percent">98%</span>
                  </div>
                  <div class="score-item">
                    <span class="score-name">Performance</span>
                    <div class="score-bar">
                      <div class="score-fill" style="width: 92%"></div>
                    </div>
                    <span class="score-percent">92%</span>
                  </div>
                  <div class="score-item">
                    <span class="score-name">Reliability</span>
                    <div class="score-bar">
                      <div class="score-fill" style="width: 96%"></div>
                    </div>
                    <span class="score-percent">96%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Recommendations -->
      <div class="recommendations-section">
        <h2>Performance Recommendations</h2>
        <div class="recommendations-list">
          <div class="recommendation-card high-priority">
            <div class="recommendation-icon">🔥</div>
            <div class="recommendation-content">
              <h4>High Priority</h4>
              <p>Database query optimization needed - Average query time increased by 23% in the last hour</p>
              <div class="recommendation-actions">
                <button class="btn-small">Investigate</button>
                <button class="btn-small secondary">View Details</button>
              </div>
            </div>
          </div>

          <div class="recommendation-card medium-priority">
            <div class="recommendation-icon">⚡</div>
            <div class="recommendation-content">
              <h4>Medium Priority</h4>
              <p>Consider implementing Redis caching for frequently accessed tenant data</p>
              <div class="recommendation-actions">
                <button class="btn-small">Learn More</button>
                <button class="btn-small secondary">Dismiss</button>
              </div>
            </div>
          </div>

          <div class="recommendation-card low-priority">
            <div class="recommendation-icon">📈</div>
            <div class="recommendation-content">
              <h4>Optimization Opportunity</h4>
              <p>API response compression could reduce bandwidth usage by approximately 30%</p>
              <div class="recommendation-actions">
                <button class="btn-small">Configure</button>
                <button class="btn-small secondary">Schedule</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading performance data...</p>
      </div>
    </div>
  `,
  styles: [`
    .performance-container {
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
      align-items: center;
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      background: #f8f9fa;
      color: #495057;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-secondary:hover {
      background: #e9ecef;
      transform: translateY(-1px);
    }

    .time-range-select {
      padding: 0.75rem 1rem;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      background: white;
      color: #495057;
      font-weight: 500;
      cursor: pointer;
    }

    .kpi-section, .charts-section, .recommendations-section {
      background: white;
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .kpi-section h2, .charts-section h2, .recommendations-section h2 {
      font-size: 1.8rem;
      font-weight: 600;
      color: #0a2342;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 0.5rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .kpi-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.3s ease;
    }

    .kpi-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .kpi-icon {
      font-size: 2.5rem;
      min-width: 60px;
      text-align: center;
    }

    .kpi-content h3 {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin: 0 0 0.25rem 0;
    }

    .kpi-content p {
      color: #6c757d;
      margin: 0 0 0.5rem 0;
      font-weight: 500;
    }

    .kpi-trend {
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .kpi-trend.positive {
      background: rgba(40, 167, 69, 0.1);
      color: #28a745;
    }

    .kpi-trend.negative {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .chart-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .chart-card h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #495057;
      margin: 0 0 1rem 0;
    }

    .chart-placeholder {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mock-chart {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .chart-bars {
      display: flex;
      align-items: end;
      justify-content: space-around;
      height: 80%;
      gap: 5px;
    }

    .bar {
      background: linear-gradient(to top, #667eea, #764ba2);
      width: 20px;
      border-radius: 4px 4px 0 0;
      transition: height 0.5s ease;
    }

    .chart-labels {
      display: flex;
      justify-content: space-around;
      margin-top: 10px;
      font-size: 0.8rem;
      color: #6c757d;
    }

    .chart-line {
      height: 80%;
      display: flex;
      align-items: center;
    }

    .pie-container {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      position: relative;
      margin: 0 auto 1rem;
      background: conic-gradient(
        #28a745 0deg 320deg,
        #ffc107 320deg 350deg,
        #dc3545 350deg 360deg
      );
    }

    .pie-legend {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-color.success { background: #28a745; }
    .legend-color.warning { background: #ffc107; }
    .legend-color.error { background: #dc3545; }

    .health-score-chart {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: conic-gradient(#28a745 0deg 338deg, #e9ecef 338deg 360deg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .score-circle::before {
      content: '';
      position: absolute;
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
    }

    .score-value {
      font-size: 2rem;
      font-weight: 700;
      color: #28a745;
      z-index: 1;
    }

    .score-label {
      font-size: 0.8rem;
      color: #6c757d;
      z-index: 1;
    }

    .score-breakdown {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .score-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
    }

    .score-name {
      min-width: 80px;
      color: #495057;
      font-weight: 500;
    }

    .score-bar {
      flex: 1;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, #28a745, #20c997);
      transition: width 0.5s ease;
    }

    .score-percent {
      min-width: 35px;
      text-align: right;
      font-weight: 600;
      color: #28a745;
    }

    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .recommendation-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .recommendation-card.high-priority {
      background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
      border: 1px solid rgba(220, 53, 69, 0.2);
    }

    .recommendation-card.medium-priority {
      background: linear-gradient(135deg, #fffbf0 0%, #ffffff 100%);
      border: 1px solid rgba(255, 193, 7, 0.2);
    }

    .recommendation-card.low-priority {
      background: linear-gradient(135deg, #f0f8f0 0%, #ffffff 100%);
      border: 1px solid rgba(40, 167, 69, 0.2);
    }

    .recommendation-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
    }

    .recommendation-icon {
      font-size: 2rem;
      min-width: 60px;
      text-align: center;
    }

    .recommendation-content {
      flex: 1;
    }

    .recommendation-content h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #495057;
    }

    .recommendation-content p {
      margin: 0 0 1rem 0;
      color: #6c757d;
      line-height: 1.5;
    }

    .recommendation-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-small {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      background: #667eea;
      color: white;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-small:hover {
      background: #5a6fd8;
      transform: translateY(-1px);
    }

    .btn-small.secondary {
      background: #6c757d;
      color: white;
    }

    .btn-small.secondary:hover {
      background: #5a6268;
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

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .performance-container {
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

      .kpi-grid, .charts-grid {
        grid-template-columns: 1fr;
      }

      .recommendation-card {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class PerformanceMetricsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = false;
  selectedTimeRange = '24h';
  
  performanceData: any = {
    timeRange: '24h',
    metrics: {
      averageResponseTime: 245,
      requestsPerSecond: 128,
      errorRate: 0.8,
      throughput: 1024 * 1024 * 2.5 // 2.5 MB/s
    },
    trends: []
  };

  Math = Math;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadPerformanceData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPerformanceData() {
    this.loading = true;
    
    this.apiService.getPerformanceMetrics(this.selectedTimeRange).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.performanceData = response.data;
        } else {
          // Use mock data if API fails
          this.performanceData = {
            timeRange: this.selectedTimeRange,
            metrics: {
              averageResponseTime: 245,
              requestsPerSecond: 128,
              errorRate: 0.8,
              throughput: 1024 * 1024 * 2.5 // 2.5 MB/s
            },
            trends: []
          };
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load performance data:', error);
        this.loading = false;
      }
    });
  }

  getResponseTimeTrend(): number {
    // Mock trend calculation - in production, this would be based on historical data
    return -5.2; // 5.2% improvement
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
