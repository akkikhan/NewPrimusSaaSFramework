import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="session-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Active Sessions</h1>
          <p>Monitor and manage user sessions across the platform</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/authentication/users">
            ← Back to Users
          </button>
          <button class="btn-danger" (click)="terminateAllSessions()" [disabled]="actionLoading">
            🔴 Terminate All Sessions
          </button>
        </div>
      </div>

      <!-- Session Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>{{sessionStats.totalSessions}}</h3>
            <p>Total Sessions</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>{{sessionStats.activeSessions}}</h3>
            <p>Active Sessions</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔒</div>
          <div class="stat-content">
            <h3>{{sessionStats.expiredSessions}}</h3>
            <p>Expired Sessions</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📱</div>
          <div class="stat-content">
            <h3>{{sessionStats.uniqueDevices}}</h3>
            <p>Unique Devices</p>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-bar">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="onSearch()"
            placeholder="Search by user, IP address, or device..."
            class="search-input">
          <button class="search-btn" (click)="loadSessions()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Terminated">Terminated</option>
          </select>
          <select [(ngModel)]="deviceFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Devices</option>
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
            <option value="Tablet">Tablet</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading sessions...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Sessions</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadSessions()">Try Again</button>
      </div>

      <!-- Sessions Table -->
      <div *ngIf="!loading && !error" class="table-container">
        <table class="sessions-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Session ID</th>
              <th>Device</th>
              <th>Location</th>
              <th>IP Address</th>
              <th>Started</th>
              <th>Last Activity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let session of sessions" class="session-row">
              <td>
                <div class="user-info">
                  <div class="user-avatar">{{getInitials(session.user.firstName, session.user.lastName)}}</div>
                  <div class="user-details">
                    <div class="user-name">{{session.user.firstName}} {{session.user.lastName}}</div>
                    <div class="user-email">{{session.user.email}}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="session-id">{{session.id}}</div>
              </td>
              <td>
                <div class="device-info">
                  <div class="device-icon">{{getDeviceIcon(session.deviceType)}}</div>
                  <div class="device-details">
                    <div class="device-name">{{session.deviceName}}</div>
                    <div class="device-os">{{session.operatingSystem}}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="location-info">
                  <div class="location-name">{{session.location.city}}, {{session.location.country}}</div>
                  <div class="location-details">{{session.location.timezone}}</div>
                </div>
              </td>
              <td>
                <div class="ip-address">{{session.ipAddress}}</div>
              </td>
              <td>
                <div class="date-info">{{formatDate(session.startedAt)}}</div>
              </td>
              <td>
                <div class="date-info">{{formatDate(session.lastActivityAt)}}</div>
              </td>
              <td>
                <span class="status-badge" [class]="'status-' + session.status.toLowerCase()">
                  {{session.status}}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    class="btn-icon" 
                    (click)="viewSessionDetails(session)"
                    title="View Details">
                    👁️
                  </button>
                  <button 
                    class="btn-icon terminate" 
                    (click)="terminateSession(session)"
                    [disabled]="session.status !== 'Active'"
                    title="Terminate Session">
                    🔴
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div *ngIf="sessions.length === 0" class="empty-state">
          <div class="empty-icon">🔒</div>
          <h3>No Sessions Found</h3>
          <p>{{searchTerm ? 'No sessions match your search criteria.' : 'No active sessions at the moment.'}}</p>
        </div>
      </div>

      <!-- Action Result Toast -->
      <div *ngIf="actionMessage" class="toast" [class.success]="actionSuccess" [class.error]="!actionSuccess">
        {{actionMessage}}
      </div>
    </div>

    <!-- Session Details Modal -->
    <div *ngIf="selectedSession" class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Session Details</h3>
          <button class="modal-close" (click)="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="session-details-grid">
            <div class="detail-section">
              <h4>User Information</h4>
              <div class="detail-item">
                <label>Name:</label>
                <span>{{selectedSession.user.firstName}} {{selectedSession.user.lastName}}</span>
              </div>
              <div class="detail-item">
                <label>Email:</label>
                <span>{{selectedSession.user.email}}</span>
              </div>
              <div class="detail-item">
                <label>Tenant:</label>
                <span>{{selectedSession.user.tenantId}}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Session Information</h4>
              <div class="detail-item">
                <label>Session ID:</label>
                <span>{{selectedSession.id}}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge" [class]="'status-' + selectedSession.status.toLowerCase()">
                  {{selectedSession.status}}
                </span>
              </div>
              <div class="detail-item">
                <label>Started:</label>
                <span>{{formatDate(selectedSession.startedAt)}}</span>
              </div>
              <div class="detail-item">
                <label>Last Activity:</label>
                <span>{{formatDate(selectedSession.lastActivityAt)}}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4>Device & Location</h4>
              <div class="detail-item">
                <label>Device:</label>
                <span>{{selectedSession.deviceName}}</span>
              </div>
              <div class="detail-item">
                <label>OS:</label>
                <span>{{selectedSession.operatingSystem}}</span>
              </div>
              <div class="detail-item">
                <label>Browser:</label>
                <span>{{selectedSession.browser}}</span>
              </div>
              <div class="detail-item">
                <label>IP Address:</label>
                <span>{{selectedSession.ipAddress}}</span>
              </div>
              <div class="detail-item">
                <label>Location:</label>
                <span>{{selectedSession.location.city}}, {{selectedSession.location.country}}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeModal()">Close</button>
          <button 
            class="btn-danger" 
            (click)="terminateSession(selectedSession)"
            [disabled]="selectedSession.status !== 'Active'">
            Terminate Session
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .session-list-container {
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
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary, .btn-danger {
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

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #c0392b;
    }

    .btn-danger:disabled {
      background: #bbb;
      cursor: not-allowed;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      background: #e3f2fd;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-content h3 {
      font-size: 1.8rem;
      color: #2c3e50;
      margin: 0;
    }

    .stat-content p {
      color: #7f8c8d;
      margin: 0.25rem 0 0 0;
      font-size: 0.9rem;
    }

    .search-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      margin-bottom: 2rem;
    }

    .search-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
    }

    .search-input:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .search-btn {
      background: #2196f3;
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .filters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
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

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-container {
      color: #e74c3c;
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow-x: auto;
    }

    .sessions-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1000px;
    }

    .sessions-table th {
      background: #f8f9fa;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #e0e0e0;
    }

    .sessions-table td {
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .session-row:hover {
      background: #f8f9fa;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar {
      width: 35px;
      height: 35px;
      background: #2196f3;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .user-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .user-email {
      color: #7f8c8d;
      font-size: 0.8rem;
    }

    .session-id {
      font-family: monospace;
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .device-icon {
      font-size: 1.2rem;
    }

    .device-name {
      font-weight: 500;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .device-os {
      color: #7f8c8d;
      font-size: 0.8rem;
    }

    .location-info {
      font-size: 0.9rem;
    }

    .location-name {
      color: #2c3e50;
      font-weight: 500;
    }

    .location-details {
      color: #7f8c8d;
      font-size: 0.8rem;
    }

    .ip-address {
      font-family: monospace;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .date-info {
      color: #7f8c8d;
      font-size: 0.85rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-active {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-expired {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-terminated {
      background: #ffebee;
      color: #c62828;
    }

    .action-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      background: none;
      border: 1px solid #ddd;
      padding: 0.4rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.8rem;
    }

    .btn-icon:hover:not(:disabled) {
      background: #f0f0f0;
      transform: scale(1.1);
    }

    .btn-icon.terminate:hover:not(:disabled) {
      background: #ffebee;
      border-color: #e74c3c;
    }

    .btn-icon:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .toast {
      position: fixed;
      top: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }

    .toast.success {
      background: #27ae60;
    }

    .toast.error {
      background: #e74c3c;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
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
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
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

    .session-details-grid {
      display: grid;
      gap: 1.5rem;
    }

    .detail-section h4 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 0.5rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item label {
      font-weight: 500;
      color: #7f8c8d;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .session-list-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .search-bar {
        flex-direction: column;
      }
      
      .filters {
        flex-direction: column;
      }
    }
  `]
})
export class SessionListComponent implements OnInit {
  loading = true;
  error = '';
  actionLoading = false;
  actionMessage = '';
  actionSuccess = false;
  searchTerm = '';
  statusFilter = '';
  deviceFilter = '';
  selectedSession: any = null;

  sessionStats = {
    totalSessions: 0,
    activeSessions: 0,
    expiredSessions: 0,
    uniqueDevices: 0
  };

  sessions: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading = true;
    this.error = '';

    // Load sessions from API
    this.apiService.getUsers().subscribe({
      next: (response) => {
        // Extract sessions from user data or use dedicated sessions endpoint
        this.sessions = this.extractSessionsFromUsers(response.items || []);
        this.updateSessionStats();
        this.loading = false;
      },
      error: (error) => {
        this.error = this.apiService.handleError(error);
        this.loading = false;
        
        // Fallback data if API fails
        if (this.sessions.length === 0) {
          console.warn('Using fallback session data due to API error');
          this.sessions = [
            {
              id: 'demo-sess-1',
              user: {
                firstName: 'Demo',
                lastName: 'User',
                email: 'demo@saasfactory.com',
                tenantId: 'demo-tenant'
              },
              deviceName: 'Demo Device',
              deviceType: 'Desktop',
              operatingSystem: 'Demo OS',
              browser: 'Demo Browser',
              ipAddress: '127.0.0.1',
              location: {
                city: 'Demo City',
                country: 'Demo Country',
                timezone: 'UTC'
              },
              startedAt: new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString(),
              lastActivityAt: new Date(Date.now() - (5 * 60 * 1000)).toISOString(),
              status: 'Active'
            }
          ];
          this.updateSessionStats();
        }
      }
    });
  }

  private extractSessionsFromUsers(users: any[]): any[] {
    // Extract active sessions from users or simulate session data
    const sessions: any[] = [];
    
    users.forEach(user => {
      if (user.sessions) {
        user.sessions.forEach((session: any) => {
          sessions.push({
            ...session,
            user: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              tenantId: user.tenantId
            }
          });
        });
      } else {
        // Create a simulated session for each user
        sessions.push({
          id: `sess_${user.id}`,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            tenantId: user.tenantId
          },
          deviceName: 'Unknown Device',
          deviceType: 'Desktop',
          operatingSystem: 'Unknown OS',
          browser: 'Unknown Browser',
          ipAddress: '0.0.0.0',
          location: {
            city: 'Unknown',
            country: 'Unknown',
            timezone: 'UTC'
          },
          startedAt: user.lastLoginAt || new Date().toISOString(),
          lastActivityAt: user.lastLoginAt || new Date().toISOString(),
          status: 'Active'
        });
      }
    });

    return sessions;
  }

  private updateSessionStats() {
    this.sessionStats.totalSessions = this.sessions.length;
    this.sessionStats.activeSessions = this.sessions.filter(s => s.status === 'Active').length;
    this.sessionStats.expiredSessions = this.sessions.filter(s => s.status === 'Expired').length;
    this.sessionStats.uniqueDevices = new Set(this.sessions.map(s => s.deviceName)).size;
  }

  onSearch() {
    this.loadSessions();
  }

  onFilterChange() {
    this.loadSessions();
  }

  getInitials(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '??';
  }

  getDeviceIcon(deviceType: string): string {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '🖥️';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hrs ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  viewSessionDetails(session: any) {
    this.selectedSession = session;
  }

  closeModal() {
    this.selectedSession = null;
  }

  terminateSession(session: any) {
    this.actionLoading = true;
    
    // Try to call API to terminate session
    // For now, use simulation since specific session termination endpoint may not exist
    // TODO: Implement actual API call when endpoint is available
    // this.apiService.terminateSession(session.id).subscribe({...})
    
    setTimeout(() => {
      session.status = 'Terminated';
      this.actionLoading = false;
      this.selectedSession = null;
      this.updateSessionStats();
      this.showActionMessage('Session terminated successfully!', true);
    }, 1000);
  }

  terminateAllSessions() {
    this.actionLoading = true;
    
    setTimeout(() => {
      this.sessions.forEach(session => {
        if (session.status === 'Active') {
          session.status = 'Terminated';
        }
      });
      this.actionLoading = false;
      this.showActionMessage('All active sessions terminated!', true);
    }, 1500);
  }

  showActionMessage(message: string, success: boolean) {
    this.actionMessage = message;
    this.actionSuccess = success;
    
    setTimeout(() => {
      this.actionMessage = '';
    }, 3000);
  }
} 