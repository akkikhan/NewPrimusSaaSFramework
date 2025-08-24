import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: 'pending' | 'success' | 'error';
  response?: any;
  error?: string;
  duration?: number;
}

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="api-test-container">
      <div class="test-header">
        <h1>🧪 API Authentication Test Suite</h1>
        <p>Testing all authenticated API endpoints with Bearer tokens</p>
        <div class="test-controls">
          <button class="btn-primary" (click)="runAllTests()" [disabled]="isRunning">
            {{isRunning ? 'Running Tests...' : 'Run All Tests'}}
          </button>
          <button class="btn-secondary" (click)="clearResults()">Clear Results</button>
        </div>
      </div>

      <!-- Authentication Status -->
      <div class="auth-status">
        <h3>🔐 Authentication Status</h3>
        <div class="status-item">
          <span class="label">Authenticated:</span>
          <span class="value" [class.success]="isAuthenticated" [class.error]="!isAuthenticated">
            {{isAuthenticated ? 'Yes' : 'No'}}
          </span>
        </div>
        <div class="status-item" *ngIf="currentUser">
          <span class="label">User:</span>
          <span class="value">{{currentUser.name}} ({{currentUser.email}})</span>
        </div>
        <div class="status-item" *ngIf="currentUser">
          <span class="label">Roles:</span>
          <span class="value">{{currentUser.roles.join(', ')}}</span>
        </div>
      </div>

      <!-- Test Results -->
      <div class="test-results">
        <h3>📊 API Test Results</h3>
        <div class="results-summary">
          <div class="summary-item success">
            <span class="count">{{getSuccessCount()}}</span>
            <span class="label">Passed</span>
          </div>
          <div class="summary-item error">
            <span class="count">{{getErrorCount()}}</span>
            <span class="label">Failed</span>
          </div>
          <div class="summary-item pending">
            <span class="count">{{getPendingCount()}}</span>
            <span class="label">Pending</span>
          </div>
        </div>

        <div class="test-list">
          <div 
            *ngFor="let test of testResults" 
            class="test-item" 
            [class.success]="test.status === 'success'"
            [class.error]="test.status === 'error'"
            [class.pending]="test.status === 'pending'">
            
            <div class="test-info">
              <div class="test-endpoint">
                <span class="method">{{test.method}}</span>
                <span class="url">{{test.endpoint}}</span>
              </div>
              <div class="test-status">
                <span class="status-badge" [class]="test.status">
                  {{test.status | titlecase}}
                </span>
                <span *ngIf="test.duration" class="duration">{{test.duration}}ms</span>
              </div>
            </div>

            <div *ngIf="test.status === 'success' && test.response" class="test-response">
              <strong>Response:</strong>
              <pre>{{formatResponse(test.response)}}</pre>
            </div>

            <div *ngIf="test.status === 'error' && test.error" class="test-error">
              <strong>Error:</strong>
              <span>{{test.error}}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .api-test-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .test-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .test-header h1 {
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .test-header p {
      color: #7f8c8d;
      margin-bottom: 1.5rem;
    }

    .test-controls {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #333;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .auth-status, .test-results {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .auth-status h3, .test-results h3 {
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .status-item {
      display: flex;
      margin-bottom: 0.5rem;
    }

    .status-item .label {
      font-weight: 600;
      width: 120px;
    }

    .status-item .value.success {
      color: #4caf50;
    }

    .status-item .value.error {
      color: #f44336;
    }

    .results-summary {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      border-radius: 8px;
    }

    .summary-item.success {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }

    .summary-item.error {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }

    .summary-item.pending {
      background: rgba(255, 152, 0, 0.1);
      color: #ff9800;
    }

    .summary-item .count {
      font-size: 2rem;
      font-weight: bold;
    }

    .test-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .test-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.3s ease;
    }

    .test-item.success {
      border-color: #4caf50;
      background: rgba(76, 175, 80, 0.05);
    }

    .test-item.error {
      border-color: #f44336;
      background: rgba(244, 67, 54, 0.05);
    }

    .test-item.pending {
      border-color: #ff9800;
      background: rgba(255, 152, 0, 0.05);
    }

    .test-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .test-endpoint {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .method {
      background: #2196f3;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .url {
      font-family: monospace;
      font-size: 0.9rem;
    }

    .test-status {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .status-badge.success {
      background: #4caf50;
      color: white;
    }

    .status-badge.error {
      background: #f44336;
      color: white;
    }

    .status-badge.pending {
      background: #ff9800;
      color: white;
    }

    .duration {
      font-size: 0.8rem;
      color: #666;
    }

    .test-response, .test-error {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .test-response {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
    }

    .test-response pre {
      margin: 0.5rem 0 0 0;
      white-space: pre-wrap;
      font-size: 0.8rem;
    }

    .test-error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid #f44336;
      color: #c62828;
    }

    @media (max-width: 768px) {
      .api-test-container {
        padding: 1rem;
      }

      .test-controls {
        flex-direction: column;
        align-items: center;
      }

      .results-summary {
        flex-direction: column;
        gap: 1rem;
      }

      .test-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }
  `]
})
export class ApiTestComponent implements OnInit {
  isRunning = false;
  isAuthenticated = false;
  currentUser: any = null;
  testResults: ApiTestResult[] = [];

  private readonly testEndpoints = [
    { endpoint: '/health', method: 'GET', description: 'Health Check' },
    { endpoint: '/users/me', method: 'GET', description: 'Current User' },
    { endpoint: '/users', method: 'GET', description: 'List Users' },
    { endpoint: '/tenants', method: 'GET', description: 'List Tenants' },
    { endpoint: '/roles', method: 'GET', description: 'List Roles' },
    { endpoint: '/notifications', method: 'GET', description: 'List Notifications' },
    { endpoint: '/analytics/dashboard', method: 'GET', description: 'Dashboard Analytics' },
    { endpoint: '/audit/logs', method: 'GET', description: 'Audit Logs' },
    { endpoint: '/settings', method: 'GET', description: 'System Settings' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Initialize test results
    this.initializeTests();

    // Subscribe to authentication state
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });

    this.authService.userProfile$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  private initializeTests() {
    this.testResults = this.testEndpoints.map(endpoint => ({
      endpoint: endpoint.endpoint,
      method: endpoint.method,
      status: 'pending'
    }));
  }

  runAllTests() {
    this.isRunning = true;
    this.initializeTests();

    console.log('🧪 Starting API authentication tests...');

    // Run tests sequentially to avoid overwhelming the API
    this.runTestsSequentially(0);
  }

  private runTestsSequentially(index: number) {
    if (index >= this.testResults.length) {
      this.isRunning = false;
      console.log('✅ All tests completed');
      return;
    }

    const test = this.testResults[index];
    const startTime = Date.now();

    console.log(`🔄 Testing ${test.method} ${test.endpoint}`);

    this.callApiEndpoint(test.endpoint, test.method).subscribe({
      next: (response) => {
        const duration = Date.now() - startTime;
        test.status = 'success';
        test.response = response;
        test.duration = duration;
        
        console.log(`✅ ${test.method} ${test.endpoint} - Success (${duration}ms)`);
        
        // Run next test after a short delay
        setTimeout(() => this.runTestsSequentially(index + 1), 500);
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        test.status = 'error';
        test.error = error.message || error.toString();
        test.duration = duration;
        
        console.log(`❌ ${test.method} ${test.endpoint} - Error: ${test.error}`);
        
        // Run next test after a short delay
        setTimeout(() => this.runTestsSequentially(index + 1), 500);
      }
    });
  }

  private callApiEndpoint(endpoint: string, method: string) {
    switch (endpoint) {
      case '/health':
        return this.apiService.getHealthCheck();
      case '/users/me':
        return this.apiService.getCurrentUser();
      case '/users':
        return this.apiService.getUsers(1, 5);
      case '/tenants':
        return this.apiService.getTenants(1, 5);
      case '/roles':
        return this.apiService.getRoles();
      case '/notifications':
        return this.apiService.getNotifications(1, 5);
      case '/analytics/dashboard':
        return this.apiService.getDashboardMetrics();
      case '/audit/logs':
        return this.apiService.getAuditLogs({ page: 1, pageSize: 5 });
      case '/settings':
        return this.apiService.getSettings();
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  clearResults() {
    this.initializeTests();
  }

  getSuccessCount(): number {
    return this.testResults.filter(t => t.status === 'success').length;
  }

  getErrorCount(): number {
    return this.testResults.filter(t => t.status === 'error').length;
  }

  getPendingCount(): number {
    return this.testResults.filter(t => t.status === 'pending').length;
  }

  formatResponse(response: any): string {
    try {
      if (typeof response === 'object') {
        // Show a summary for large objects
        if (Array.isArray(response)) {
          return `Array with ${response.length} items`;
        } else if (response.items && Array.isArray(response.items)) {
          return `Paged result: ${response.items.length} items, total: ${response.totalItems || 'unknown'}`;
        } else {
          const keys = Object.keys(response);
          return keys.length > 5 
            ? `Object with keys: ${keys.slice(0, 5).join(', ')}...`
            : JSON.stringify(response, null, 2);
        }
      }
      return String(response);
    } catch (error) {
      return 'Invalid response format';
    }
  }
} 