import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, from } from 'rxjs';
import { EnhancedAuthService } from '../../core/services/enhanced-auth.service';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-auth-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-test-container">
      <h1>🔍 Authentication Debug Console</h1>
      
      <!-- Service Status -->
      <div class="section">
        <h2>🔧 Service Status</h2>
        <div class="status-grid">
          <div class="status-item" [class.success]="authServiceConnected" [class.error]="!authServiceConnected">
            <strong>Enhanced Auth Service:</strong> {{authServiceConnected ? 'Connected' : 'Disconnected'}}
          </div>
          <div class="status-item" [class.success]="msalServiceConnected" [class.error]="!msalServiceConnected">
            <strong>MSAL Service:</strong> {{msalServiceConnected ? 'Connected' : 'Disconnected'}}
        </div>
          <div class="status-item" [class.success]="!isLoading" [class.warning]="isLoading">
            <strong>Loading State:</strong> {{isLoading ? 'Loading...' : 'Ready'}}
        </div>
        </div>
      </div>

      <!-- Authentication State -->
      <div class="section">
        <h2>🛡️ Authentication State</h2>
        <div class="auth-info">
          <div class="info-row">
            <strong>Is Authenticated:</strong> 
            <span [class.success]="isAuthenticated" [class.error]="!isAuthenticated">
              {{isAuthenticated ? 'Yes' : 'No'}}
            </span>
          </div>
          <div class="info-row" *ngIf="userProfile">
            <strong>User Name:</strong> {{userProfile.name}}
          </div>
          <div class="info-row" *ngIf="userProfile">
            <strong>Email:</strong> {{userProfile.email}}
          </div>
          <div class="info-row" *ngIf="userProfile">
            <strong>Roles:</strong> {{userProfile.roles?.join(', ') || 'None'}}
          </div>
          <div class="info-row" *ngIf="userProfile">
            <strong>Tenant ID:</strong> {{userProfile.tenantId}}
          </div>
          <div class="info-row" *ngIf="errorMessage" class="error">
            <strong>Error:</strong> {{errorMessage}}
          </div>
        </div>
      </div>

      <!-- MSAL Details -->
      <div class="section">
        <h2>📊 MSAL Details</h2>
        <div class="msal-info">
          <div class="info-row">
            <strong>Total Accounts:</strong> {{msalAccounts.length}}
          </div>
          <div class="info-row">
            <strong>Active Account:</strong> {{activeAccountEmail || 'None'}}
          </div>
          <div class="info-row">
            <strong>Client ID:</strong> {{clientId}}
        </div>
          <div class="info-row">
            <strong>Authority:</strong> {{authority}}
          </div>
        </div>
      </div>

      <!-- Test Actions -->
      <div class="section">
        <h2>🧪 Test Actions</h2>
        <div class="action-buttons">
          <button 
            class="btn btn-success" 
            (click)="testAuthenticationFlow()">
            🔍 Test Auth Flow
          </button>
          
          <button 
            class="btn btn-primary" 
            (click)="testPopupLogin()"
            [disabled]="isLoading">
            🔐 Test Popup Login
          </button>
          
          <button 
            class="btn btn-secondary" 
            (click)="testRedirectLogin()"
            [disabled]="isLoading">
            🌐 Test Redirect Login
          </button>
          
          <button 
            class="btn btn-info" 
            (click)="refreshData()"
            [disabled]="isLoading">
            🔄 Refresh Data
          </button>
          
          <button 
            class="btn btn-warning" 
            (click)="clearAuth()"
            [disabled]="isLoading">
            🧹 Clear Auth
          </button>
          
          <button 
            class="btn btn-danger" 
            (click)="logout()"
            [disabled]="isLoading || !isAuthenticated">
            🚪 Logout
          </button>
        </div>
      </div>

      <!-- Console Logs -->
      <div class="section">
        <h2>📝 Console Logs</h2>
        <div class="console-logs">
          <div *ngFor="let log of logs" [class]="'log-' + log.type">
            <span class="timestamp">{{log.timestamp}}</span>
            <span class="message">{{log.message}}</span>
          </div>
        </div>
        <button class="btn btn-sm" (click)="clearLogs()">Clear Logs</button>
      </div>
    </div>
  `,
  styles: [`
    .auth-test-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    h1 {
      color: #2c3e50;
      text-align: center;
      margin-bottom: 2rem;
    }

    .section {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    h2 {
      color: #34495e;
      margin: 0 0 1rem 0;
      font-size: 1.3rem;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .status-item {
      padding: 1rem;
      border-radius: 6px;
      background: #f8f9fa;
      border-left: 4px solid #6c757d;
    }

    .status-item.success {
      background: #d4edda;
      border-left-color: #28a745;
      color: #155724;
    }

    .status-item.error {
      background: #f8d7da;
      border-left-color: #dc3545;
      color: #721c24;
    }

    .status-item.warning {
      background: #fff3cd;
      border-left-color: #ffc107;
      color: #856404;
    }

    .auth-info, .msal-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e9ecef;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row.error {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .success {
      color: #28a745;
      font-weight: bold;
    }

    .error {
      color: #dc3545;
      font-weight: bold;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-warning {
      background: #ffc107;
      color: #212529;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .console-logs {
      background: #2d3748;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .log-info {
      color: #63b3ed;
    }

    .log-success {
      color: #68d391;
    }

    .log-warning {
      color: #fbd38d;
    }

    .log-error {
      color: #fc8181;
    }

    .timestamp {
      color: #a0aec0;
      margin-right: 0.5rem;
    }

    @media (max-width: 768px) {
      .auth-test-container {
        padding: 1rem;
    }

      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class AuthTestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Service status
  authServiceConnected = false;
  msalServiceConnected = false;
  
  // Auth state
  isAuthenticated = false;
  isLoading = false;
  userProfile: any = null;
  errorMessage = '';
  
  // MSAL state
  msalAccounts: any[] = [];
  activeAccountEmail = '';
  clientId = '';
  authority = '';
  
  // Logs
  logs: Array<{type: string, message: string, timestamp: string}> = [];

  constructor(
    private authService: EnhancedAuthService,
    private msalService: MsalService
  ) {}

  ngOnInit(): void {
    this.log('info', 'Auth Test Component initialized');
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    try {
      this.authServiceConnected = !!this.authService;
      this.msalServiceConnected = !!this.msalService;
      
      if (this.authServiceConnected) {
        this.setupAuthSubscriptions();
      }
      
      if (this.msalServiceConnected) {
        this.refreshMsalData();
      }
      
      this.log('success', 'Component initialization complete');
    } catch (error: any) {
      this.log('error', `Initialization failed: ${error.message}`);
    }
  }

  private setupAuthSubscriptions(): void {
    // Authentication state
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        this.isAuthenticated = isAuth;
        this.log('info', `Authentication state: ${isAuth}`);
      });

    // Loading state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
        this.log('info', `Loading state: ${loading}`);
    });

    // User profile
    this.authService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
        if (profile) {
          this.log('success', `User profile loaded: ${profile.email}`);
        }
      });

    // Error state
    this.authService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error || '';
        if (error) {
          this.log('error', `Auth error: ${error}`);
      }
    });
  }

  private refreshMsalData(): void {
    try {
      this.msalAccounts = this.msalService.instance.getAllAccounts();
      const activeAccount = this.msalService.instance.getActiveAccount();
      this.activeAccountEmail = activeAccount?.username || '';
      
      const config = this.msalService.instance.getConfiguration();
      this.clientId = config.auth.clientId;
      this.authority = config.auth.authority || '';
      
      this.log('info', `MSAL data refreshed: ${this.msalAccounts.length} accounts`);
    } catch (error: any) {
      this.log('error', `Failed to refresh MSAL data: ${error.message}`);
    }
  }

  testPopupLogin(): void {
    this.log('info', 'Testing popup login...');
    from(this.authService.loginPopup())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success: void) => {
          this.log('success', 'Popup login completed successfully');
          this.refreshData();
        },
        error: (error: any) => {
          this.log('error', `Popup login failed: ${error.message}`);
        }
      });
  }

  testRedirectLogin(): void {
    this.log('info', 'Testing redirect login...');
    try {
      this.authService.loginRedirect();
      this.log('info', 'Redirect login initiated');
    } catch (error: any) {
      this.log('error', `Redirect login failed: ${error.message}`);
    }
  }

  refreshData(): void {
    this.log('info', 'Refreshing all data...');
    this.refreshMsalData();
  }

  clearAuth(): void {
    this.log('warning', 'Clearing authentication state...');
    try {
      // Call the logout method instead of the non-existent clearAuthStatePublic method
      this.authService.logout();
      this.refreshData();
      this.log('success', 'Authentication state cleared');
    } catch (error: any) {
      this.log('error', `Failed to clear auth: ${error.message}`);
      }
  }

  logout(): void {
    this.log('info', 'Logging out...');
    try {
      this.authService.logout();
      this.log('success', 'Logout initiated');
    } catch (error: any) {
      this.log('error', `Logout failed: ${error.message}`);
      }
  }

  clearLogs(): void {
    this.logs = [];
  }

  testAuthenticationFlow(): void {
    this.log('info', '🔍 Testing complete authentication flow on port ' + window.location.port);
    
    // Log current configuration
    this.log('info', 'Current URL: ' + window.location.origin);
  const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '/';
  this.log('info', `Expected redirect URI in Azure AD: ${origin}`);
    
    // Check if we're on the correct port
    if (window.location.port === '4200' || window.location.port === '') {
      this.log('success', '✅ Running on correct port 4200');
    } else {
      this.log('warning', '⚠️ Not running on expected port 4200, current port: ' + window.location.port);
      }
    
    // Test authentication state
    const isAuthenticated = this.isAuthenticated;
    if (isAuthenticated) {
      this.log('success', '✅ User is authenticated');
      this.log('info', 'User: ' + this.userProfile?.email);
    } else {
      this.log('warning', '⚠️ User is not authenticated');
      this.log('info', 'Click "Test Popup Login" to authenticate');
    }
  }

  private log(type: string, message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift({ type, message, timestamp });
    
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(0, 50);
    }
    
    // Also log to browser console
    console.log(`[Auth Test] ${message}`);
  }
} 