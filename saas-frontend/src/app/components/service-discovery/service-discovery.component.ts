import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  responseTime?: number;
  lastChecked?: Date;
  endpoints: { [key: string]: string };
  uiAvailable: boolean;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-service-discovery',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="service-discovery-container">
      <div class="header-section">
        <h1 class="main-title">🏢 SaaS Framework Service Discovery</h1>
        <p class="subtitle">Comprehensive UI and API Integration Dashboard</p>
        
        <div class="status-overview">
          <div class="status-card online">
            <span class="count">{{ onlineServices }}</span>
            <span class="label">Online Services</span>
          </div>
          <div class="status-card offline">
            <span class="count">{{ offlineServices }}</span>
            <span class="label">Offline Services</span>
          </div>
          <div class="status-card total">
            <span class="count">{{ totalServices }}</span>
            <span class="label">Total Services</span>
          </div>
        </div>
      </div>

      <div class="services-grid">
        <div *ngFor="let service of services" 
             class="service-card"
             [class.online]="service.status === 'online'"
             [class.offline]="service.status === 'offline'"
             [class.checking]="service.status === 'checking'">
          
          <div class="service-header">
            <div class="service-icon">{{ service.icon }}</div>
            <div class="service-info">
              <h3>{{ service.name }}</h3>
              <p>{{ service.description }}</p>
            </div>
            <div class="status-indicator" [attr.data-status]="service.status">
              {{ service.status | titlecase }}
            </div>
          </div>

          <div class="service-details">
            <div class="url-section">
              <strong>Base URL:</strong>
              <a [href]="service.url" target="_blank" class="url-link">
                {{ service.url }}
              </a>
            </div>

            <div class="response-time" *ngIf="service.responseTime">
              <strong>Response Time:</strong> {{ service.responseTime }}ms
            </div>

            <div class="last-checked" *ngIf="service.lastChecked">
              <strong>Last Checked:</strong> {{ service.lastChecked | date:'medium' }}
            </div>
          </div>

          <div class="endpoints-section" *ngIf="service.status === 'online'">
            <h4>Available Endpoints:</h4>
            <div class="endpoints-grid">
              <a *ngFor="let endpoint of getEndpointEntries(service.endpoints)" 
                 [href]="service.url + endpoint.value" 
                 target="_blank"
                 class="endpoint-link">
                <span class="endpoint-name">{{ endpoint.key }}</span>
                <span class="endpoint-path">{{ endpoint.value }}</span>
              </a>
            </div>
          </div>

          <div class="action-buttons">
            <button *ngIf="service.status === 'online' && service.uiAvailable" 
                    class="btn btn-primary"
                    (click)="openServiceUI(service)">
              🚀 Open UI
            </button>
            
            <button *ngIf="service.status === 'online'" 
                    class="btn btn-secondary"
                    (click)="testService(service)">
              🔧 Test API
            </button>
            
            <button class="btn btn-refresh"
                    (click)="checkServiceStatus(service)">
              🔄 Refresh
            </button>
          </div>

          <!-- Demo Scenarios for TenantPortal -->
          <div *ngIf="service.name === 'TenantPortal' && service.status === 'online'" 
               class="demo-scenarios">
            <h4>🎯 Demo Scenarios:</h4>
            <div class="demo-buttons">
              <button class="btn btn-demo" (click)="runDemoScenario('dashboard')">
                📊 Dashboard Demo
              </button>
              <button class="btn btn-demo" (click)="runDemoScenario('onboard')">
                📝 Onboarding Demo  
              </button>
              <button class="btn btn-demo" (click)="runDemoScenario('users')">
                👥 Users Demo
              </button>
              <button class="btn btn-demo" (click)="runDemoScenario('welcome')">
                🏠 Welcome Page
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="integration-guide">
        <h2>🔗 UI Integration Status</h2>
        <div class="integration-status">
          <div class="integration-item completed">
            <span class="status-icon">✅</span>
            <span>Angular UI connected to Configuration API</span>
          </div>
          <div class="integration-item completed">
            <span class="status-icon">✅</span>
            <span>TenantPortal Demo endpoints working</span>
          </div>
          <div class="integration-item in-progress">
            <span class="status-icon">🔄</span>
            <span>Multi-service health monitoring active</span>
          </div>
          <div class="integration-item pending">
            <span class="status-icon">⏳</span>
            <span>Cross-service authentication integration</span>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <button class="btn btn-action" (click)="refreshAllServices()">
          🔄 Refresh All Services
        </button>
        <button class="btn btn-action" (click)="runFullDemo()">
          🎬 Run Complete Demo
        </button>
        <button class="btn btn-action" (click)="exportServiceStatus()">
          📊 Export Status Report
        </button>
      </div>
    </div>
  `,
  styles: [`
    .service-discovery-container {
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: white;
    }

    .header-section {
      text-align: center;
      margin-bottom: 32px;
    }

    .main-title {
      font-size: 2.5rem;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-bottom: 24px;
    }

    .status-overview {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 32px;
    }

    .status-card {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 24px;
      text-align: center;
      backdrop-filter: blur(10px);
    }

    .status-card .count {
      display: block;
      font-size: 2rem;
      font-weight: bold;
    }

    .status-card .label {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .service-card {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .service-card.online {
      border-color: #4ade80;
      background: rgba(74, 222, 128, 0.1);
    }

    .service-card.offline {
      border-color: #f87171;
      background: rgba(248, 113, 113, 0.1);
    }

    .service-card.checking {
      border-color: #fbbf24;
      background: rgba(251, 191, 36, 0.1);
    }

    .service-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .service-icon {
      font-size: 2rem;
      margin-right: 16px;
    }

    .service-info {
      flex: 1;
    }

    .service-info h3 {
      margin: 0 0 4px 0;
      font-size: 1.2rem;
    }

    .service-info p {
      margin: 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }

    .status-indicator {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .status-indicator[data-status="online"] {
      background: #4ade80;
      color: #000;
    }

    .status-indicator[data-status="offline"] {
      background: #f87171;
      color: #fff;
    }

    .status-indicator[data-status="checking"] {
      background: #fbbf24;
      color: #000;
    }

    .service-details {
      margin-bottom: 16px;
      font-size: 0.9rem;
    }

    .service-details > div {
      margin-bottom: 8px;
    }

    .url-link {
      color: #60a5fa;
      text-decoration: none;
    }

    .url-link:hover {
      text-decoration: underline;
    }

    .endpoints-section {
      margin-bottom: 16px;
    }

    .endpoints-section h4 {
      margin: 0 0 8px 0;
      font-size: 1rem;
    }

    .endpoints-grid {
      display: grid;
      gap: 8px;
    }

    .endpoint-link {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      text-decoration: none;
      color: white;
      transition: background 0.2s;
    }

    .endpoint-link:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .endpoint-name {
      font-weight: 500;
    }

    .endpoint-path {
      opacity: 0.8;
      font-family: monospace;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-refresh {
      background: #10b981;
      color: white;
    }

    .btn-demo {
      background: #8b5cf6;
      color: white;
      font-size: 0.8rem;
      padding: 6px 12px;
    }

    .btn-action {
      background: #f59e0b;
      color: white;
      padding: 12px 24px;
      font-size: 1rem;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .demo-scenarios {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .demo-scenarios h4 {
      margin: 0 0 12px 0;
    }

    .demo-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
    }

    .integration-guide, .quick-actions {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }

    .integration-guide h2, .quick-actions h2 {
      margin: 0 0 16px 0;
    }

    .integration-status {
      display: grid;
      gap: 12px;
    }

    .integration-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .status-icon {
      font-size: 1.2rem;
    }

    .quick-actions {
      text-align: center;
    }

    .quick-actions .btn {
      margin: 0 8px 8px 0;
    }

    @media (max-width: 768px) {
      .services-grid {
        grid-template-columns: 1fr;
      }
      
      .status-overview {
        flex-direction: column;
        align-items: center;
      }
    }
  `]
})
export class ServiceDiscoveryComponent implements OnInit {
  services: ServiceStatus[] = [];
  
  get onlineServices(): number {
    return this.services.filter(s => s.status === 'online').length;
  }
  
  get offlineServices(): number {
    return this.services.filter(s => s.status === 'offline').length;
  }
  
  get totalServices(): number {
    return this.services.length;
  }

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.initializeServices();
    this.checkAllServices();
  }

  initializeServices() {
    this.services = [
      {
        name: 'Configuration API',
        url: environment.services.configurationApi.url,
        status: 'checking',
        endpoints: environment.services.configurationApi.endpoints,
        uiAvailable: true,
        description: 'Service configuration and management API',
        icon: '⚙️'
      },
      {
        name: 'Authentication API',
        url: environment.services.authenticationApi.url,
        status: 'checking',
        endpoints: environment.services.authenticationApi.endpoints,
        uiAvailable: true,
        description: 'Azure AD authentication and authorization',
        icon: '🔐'
      },
      {
        name: 'Gateway API',
        url: environment.services.gatewayApi.url,
        status: 'checking',
        endpoints: environment.services.gatewayApi.endpoints,
        uiAvailable: true,
        description: 'API Gateway for microservices',
        icon: '🌐'
      },
      {
        name: 'Demo Inventory App',
        url: environment.services.inventoryDemo.url,
        status: 'checking',
        endpoints: environment.services.inventoryDemo.endpoints,
        uiAvailable: true,
        description: 'Demo inventory management application for tenants',
        icon: '📦'
      },
      {
        name: 'Product Catalog',
        url: environment.services.productCatalog.url,
        status: 'checking',
        endpoints: environment.services.productCatalog.endpoints,
        uiAvailable: true,
        description: 'AkkiTech product management demo application',
        icon: '🛍️'
      },
      {
        name: 'Expense Tracker',
        url: environment.services.expenseTracker.url,
        status: 'checking',
        endpoints: environment.services.expenseTracker.endpoints,
        uiAvailable: true,
        description: 'Contoso expense tracking demo application',
        icon: '💰'
      }
    ];
  }

  checkAllServices() {
    this.services.forEach(service => {
      this.checkServiceStatus(service);
    });
  }

  checkServiceStatus(service: ServiceStatus) {
    service.status = 'checking';
    const startTime = Date.now();
    
    this.http.get(service.url + (service.endpoints['health'] || '/api/health'), { observe: 'response' })
      .pipe(
        catchError(() => of(null))
      )
      .subscribe(response => {
        const endTime = Date.now();
        service.responseTime = endTime - startTime;
        service.lastChecked = new Date();
        service.status = response?.status === 200 ? 'online' : 'offline';
      });
  }

  getEndpointEntries(endpoints: { [key: string]: string }) {
    return Object.entries(endpoints).map(([key, value]) => ({ key, value }));
  }

  openServiceUI(service: ServiceStatus) {
    window.open(service.url, '_blank');
  }

  testService(service: ServiceStatus) {
    window.open(service.url + (service.endpoints['swagger'] || service.endpoints['api'] || ''), '_blank');
  }

  runDemoScenario(scenario: string) {
    const tenantPortal = this.services.find(s => s.name === 'TenantPortal');
    if (tenantPortal && tenantPortal.status === 'online') {
      const url = tenantPortal.url + tenantPortal.endpoints[scenario];
      window.open(url, '_blank');
    }
  }

  refreshAllServices() {
    this.checkAllServices();
  }

  runFullDemo() {
    // Open multiple demo scenarios in sequence
    const scenarios = ['welcome', 'dashboard', 'onboard', 'users'];
    scenarios.forEach((scenario, index) => {
      setTimeout(() => {
        this.runDemoScenario(scenario);
      }, index * 1000);
    });
  }

  exportServiceStatus() {
    const report = {
      timestamp: new Date(),
      services: this.services.map(s => ({
        name: s.name,
        url: s.url,
        status: s.status,
        responseTime: s.responseTime,
        lastChecked: s.lastChecked
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saas-framework-status-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
