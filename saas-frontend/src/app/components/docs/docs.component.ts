import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="docs-container">
      <!-- Header -->
      <header class="docs-header">
        <div class="docs-header-content">
          <div class="docs-brand">
            <div class="docs-logo">
              <span class="factory-icon">🏭</span>
              <span class="brand-name">SaaS Factory</span>
            </div>
            <h1>Developer Documentation</h1>
          </div>
          <div class="docs-actions">
            <a [routerLink]="'/'" class="back-to-platform">
              <span class="back-icon">←</span>
              Back to Platform
            </a>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="docs-layout">
        <!-- Sidebar Navigation -->
        <nav class="docs-sidebar">
          <div class="docs-nav">
            <div class="nav-section">
              <h3>Getting Started</h3>
              <ul>
                <li><a (click)="selectSection('overview')" [class.active]="activeSection === 'overview'">Overview</a></li>
                <li><a (click)="selectSection('quickstart')" [class.active]="activeSection === 'quickstart'">Quick Start</a></li>
                <li><a (click)="selectSection('authentication')" [class.active]="activeSection === 'authentication'">Authentication</a></li>
              </ul>
            </div>
            
            <div class="nav-section">
              <h3>API Reference</h3>
              <ul>
                <li><a (click)="selectSection('auth-api')" [class.active]="activeSection === 'auth-api'">Authentication API</a></li>
                <li><a (click)="selectSection('rbac-api')" [class.active]="activeSection === 'rbac-api'">RBAC API</a></li>
                <li><a (click)="selectSection('analytics-api')" [class.active]="activeSection === 'analytics-api'">Analytics API</a></li>
                <li><a (click)="selectSection('audit-api')" [class.active]="activeSection === 'audit-api'">Audit Logs API</a></li>
                <li><a (click)="selectSection('notifications-api')" [class.active]="activeSection === 'notifications-api'">Notifications API</a></li>
                <li><a (click)="selectSection('ai-api')" [class.active]="activeSection === 'ai-api'">AI Copilot API</a></li>
              </ul>
            </div>
            
            <div class="nav-section">
              <h3>Integration Guides</h3>
              <ul>
                <li><a (click)="selectSection('web-integration')" [class.active]="activeSection === 'web-integration'">Web Applications</a></li>
                <li><a (click)="selectSection('mobile-integration')" [class.active]="activeSection === 'mobile-integration'">Mobile Apps</a></li>
                <li><a (click)="selectSection('backend-integration')" [class.active]="activeSection === 'backend-integration'">Backend Services</a></li>
                <li><a (click)="selectSection('webhooks')" [class.active]="activeSection === 'webhooks'">Webhooks</a></li>
              </ul>
            </div>
            
            <div class="nav-section">
              <h3>SDKs & Libraries</h3>
              <ul>
                <li><a (click)="selectSection('javascript-sdk')" [class.active]="activeSection === 'javascript-sdk'">JavaScript SDK</a></li>
                <li><a (click)="selectSection('python-sdk')" [class.active]="activeSection === 'python-sdk'">Python SDK</a></li>
                <li><a (click)="selectSection('csharp-sdk')" [class.active]="activeSection === 'csharp-sdk'">C# SDK</a></li>
                <li><a (click)="selectSection('rest-api')" [class.active]="activeSection === 'rest-api'">REST API</a></li>
              </ul>
            </div>
            
            <div class="nav-section">
              <h3>Examples</h3>
              <ul>
                <li><a (click)="selectSection('code-examples')" [class.active]="activeSection === 'code-examples'">Code Examples</a></li>
                <li><a (click)="selectSection('demo-apps')" [class.active]="activeSection === 'demo-apps'">Demo Applications</a></li>
                <li><a (click)="selectSection('use-cases')" [class.active]="activeSection === 'use-cases'">Use Cases</a></li>
              </ul>
            </div>
          </div>
        </nav>

        <!-- Content Area -->
        <main class="docs-content">
          <div class="docs-article">
            <!-- Overview Section -->
            <div *ngIf="activeSection === 'overview'" class="content-section">
              <h1>SaaS Factory Platform Overview</h1>
              <p class="lead">
                SaaS Factory is a comprehensive multi-tenant SaaS platform that provides authentication, 
                RBAC, analytics, audit logging, notifications, and AI-powered features for modern applications.
              </p>
              
              <h2>🏗️ Architecture</h2>
              <div class="architecture-diagram">
                <div class="architecture-layer">
                  <h4>Frontend Applications</h4>
                  <div class="layer-items">
                    <span class="layer-item">Angular Admin Portal</span>
                    <span class="layer-item">React Demo Apps</span>
                    <span class="layer-item">Your Application</span>
                  </div>
                </div>
                
                <div class="architecture-layer">
                  <h4>API Gateway</h4>
                  <div class="layer-items">
                    <span class="layer-item">YARP Gateway (Port 8080)</span>
                  </div>
                </div>
                
                <div class="architecture-layer">
                  <h4>Microservices</h4>
                  <div class="layer-items">
                    <span class="layer-item">Authentication (7001)</span>
                    <span class="layer-item">RBAC (7002)</span>
                    <span class="layer-item">Analytics (7003)</span>
                    <span class="layer-item">Audit Logs (7004)</span>
                    <span class="layer-item">Notifications (7005)</span>
                    <span class="layer-item">AI Copilot (7006)</span>
                  </div>
                </div>
                
                <div class="architecture-layer">
                  <h4>Data Layer</h4>
                  <div class="layer-items">
                    <span class="layer-item">Azure Cosmos DB</span>
                    <span class="layer-item">Azure Blob Storage</span>
                  </div>
                </div>
              </div>
              
              <h2>🚀 Key Features</h2>
              <div class="features-grid">
                <div class="feature-card">
                  <div class="feature-icon">🔐</div>
                  <h3>Multi-tenant Authentication</h3>
                  <p>Azure AD integration with tenant-aware JWT tokens and RBAC permissions.</p>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">👥</div>
                  <h3>Role-Based Access Control</h3>
                  <p>Granular permissions system with customizable roles and tenant isolation.</p>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">📊</div>
                  <h3>Real-time Analytics</h3>
                  <p>Track user behavior, API usage, and business metrics with live dashboards.</p>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">📋</div>
                  <h3>Comprehensive Audit Logs</h3>
                  <p>Complete activity tracking for compliance and security monitoring.</p>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">🔔</div>
                  <h3>Multi-channel Notifications</h3>
                  <p>Email, SMS, and in-app notifications with template management.</p>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">🤖</div>
                  <h3>AI-Powered Features</h3>
                  <p>Azure OpenAI integration for intelligent assistance and automation.</p>
                </div>
              </div>
            </div>

            <!-- Quick Start Section -->
            <div *ngIf="activeSection === 'quickstart'" class="content-section">
              <h1>Quick Start Guide</h1>
              <p class="lead">Get up and running with SaaS Factory in minutes.</p>
              
              <h2>📋 Prerequisites</h2>
              <ul>
                <li>Valid tenant credentials (provided during onboarding)</li>
                <li>Development environment (Node.js, .NET, or Python)</li>
                <li>API testing tool (Postman, curl, or similar)</li>
              </ul>
              
              <h2>🔑 Your Tenant Credentials</h2>
              <div class="code-block">
                <pre><code>Tenant ID: your-tenant-id
API Key: sk_live_xxxxxxxxxxxxxxxx
Base URL: https://api.saasfactory.com
Portal URL: https://portal.saasfactory.com/tenant/your-tenant-id</code></pre>
              </div>
              
              <h2>🚀 First API Call</h2>
              <p>Test your connection with a simple API call:</p>
              
              <div class="code-tabs">
                              <div class="tab-headers">
                <button class="tab-header" [class.active]="activeTab === 'curl'" (click)="selectTab('curl')">cURL</button>
                <button class="tab-header" [class.active]="activeTab === 'javascript'" (click)="selectTab('javascript')">JavaScript</button>
                <button class="tab-header" [class.active]="activeTab === 'python'" (click)="selectTab('python')">Python</button>
              </div>
                
                <div class="tab-content">
                  <div *ngIf="activeTab === 'curl'" class="code-block">
                    <pre><code>curl -X GET "https://api.saasfactory.com/auth/profile" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-Id: YOUR_TENANT_ID"</code></pre>
                  </div>
                  
                  <div *ngIf="activeTab === 'javascript'" class="code-block">
                    <pre><code>const response = await fetch('https://api.saasfactory.com/auth/profile', {{ '{' }}
  headers: {{ '{' }}
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-Tenant-Id': 'YOUR_TENANT_ID'
  {{ '}' }}
{{ '}' }});

const profile = await response.json();
console.log(profile);</code></pre>
                  </div>
                  
                  <div *ngIf="activeTab === 'python'" class="code-block">
                    <pre><code>import requests

headers = {{ '{' }}
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-Tenant-Id': 'YOUR_TENANT_ID'
{{ '}' }}

response = requests.get('https://api.saasfactory.com/auth/profile', headers=headers)
profile = response.json()
print(profile)</code></pre>
                  </div>
                </div>
              </div>
              
              <h2>📱 Next Steps</h2>
              <div class="next-steps">
                <div class="step-card">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <h3>Explore the API</h3>
                    <p>Browse the API reference to understand available endpoints.</p>
                    <a (click)="selectSection('auth-api')" class="step-link">View API Reference →</a>
                  </div>
                </div>
                
                <div class="step-card">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <h3>Try the Demo</h3>
                    <p>Use our demo application to see SaaS Factory in action.</p>
                    <a href="/demo/setup" class="step-link">Launch Demo →</a>
                  </div>
                </div>
                
                <div class="step-card">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <h3>Integrate Your App</h3>
                    <p>Follow our integration guides for your preferred platform.</p>
                    <a (click)="selectSection('web-integration')" class="step-link">Integration Guides →</a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Authentication Section -->
            <div *ngIf="activeSection === 'authentication'" class="content-section">
              <h1>Authentication</h1>
              <p class="lead">
                SaaS Factory uses API keys for service-to-service authentication and JWT tokens for user sessions.
              </p>
              
              <h2>🔑 API Key Authentication</h2>
              <p>For server-to-server API calls, use your tenant API key:</p>
              
              <div class="code-block">
                <pre><code>Authorization: Bearer sk_live_your_api_key_here
X-Tenant-Id: your-tenant-id</code></pre>
              </div>
              
              <h2>👤 User Authentication</h2>
              <p>For user sessions, authenticate users and receive JWT tokens:</p>
              
              <div class="api-endpoint">
                <div class="endpoint-header">
                  <span class="method post">POST</span>
                  <span class="url">/auth/login</span>
                </div>
                <div class="endpoint-body">
                  <h4>Request Body:</h4>
                  <div class="code-block">
                    <pre><code>{{ '{' }}
  "email": "user&#64;example.com",
  "password": "password123",
  "tenantId": "your-tenant-id"
{{ '}' }}</code></pre>
                  </div>
                  
                  <h4>Response:</h4>
                  <div class="code-block">
                    <pre><code>{{ '{' }}
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {{ '{' }}
    "id": "user-id",
    "email": "user&#64;example.com",
    "name": "John Doe",
    "roles": ["user"]
  {{ '}' }},
  "expiresAt": "2024-12-01T10:00:00Z"
{{ '}' }}</code></pre>
                  </div>
                </div>
              </div>
              
              <h2>🛡️ Token Usage</h2>
              <p>Include the JWT token in subsequent requests:</p>
              
              <div class="code-block">
                <pre><code>Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-Id: your-tenant-id</code></pre>
              </div>
            </div>

            <!-- Default/Placeholder Content -->
            <div *ngIf="!['overview', 'quickstart', 'authentication'].includes(activeSection)" class="content-section">
              <h1>{{getSectionTitle(activeSection)}}</h1>
              
              <!-- Authentication API -->
              <div *ngIf="activeSection === 'auth-api'">
                <p class="lead">Complete authentication API reference for user management and session control.</p>
                
                <h2>🔐 Endpoints</h2>
                <div class="api-endpoints">
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/auth/login</span>
                    </div>
                    <p>Authenticate user and receive JWT token</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/auth/profile</span>
                    </div>
                    <p>Get current user profile information</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/auth/logout</span>
                    </div>
                    <p>Invalidate current session token</p>
                  </div>
                </div>
              </div>
              
              <!-- RBAC API -->
              <div *ngIf="activeSection === 'rbac-api'">
                <p class="lead">Role-based access control API for managing permissions and user roles.</p>
                
                <h2>🛡️ Endpoints</h2>
                <div class="api-endpoints">
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/rbac/roles</span>
                    </div>
                    <p>List all available roles for the tenant</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/rbac/roles</span>
                    </div>
                    <p>Create a new role with permissions</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/rbac/permissions</span>
                    </div>
                    <p>List all available permissions</p>
                  </div>
                </div>
              </div>
              
              <!-- Analytics API -->
              <div *ngIf="activeSection === 'analytics-api'">
                <p class="lead">Analytics and reporting API for tracking user activity and system metrics.</p>
                
                <h2>📊 Endpoints</h2>
                <div class="api-endpoints">
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/analytics/dashboard</span>
                    </div>
                    <p>Get dashboard analytics and key metrics</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/analytics/events</span>
                    </div>
                    <p>Retrieve event tracking data</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/analytics/track</span>
                    </div>
                    <p>Track custom events and user actions</p>
                  </div>
                </div>
              </div>
              
              <!-- Audit API -->
              <div *ngIf="activeSection === 'audit-api'">
                <p class="lead">Audit logging API for compliance and security monitoring.</p>
                
                <h2>📋 Endpoints</h2>
                <div class="api-endpoints">
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/audit/logs</span>
                    </div>
                    <p>Retrieve audit logs with filtering options</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/audit/log</span>
                    </div>
                    <p>Create a custom audit log entry</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/audit/reports</span>
                    </div>
                    <p>Generate compliance and security reports</p>
                  </div>
                </div>
              </div>
              
              <!-- Notifications API -->
              <div *ngIf="activeSection === 'notifications-api'">
                <p class="lead">Multi-channel notification system for email, SMS, and in-app messaging.</p>
                
                <h2>📧 Endpoints</h2>
                <div class="api-endpoints">
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/notifications/send</span>
                    </div>
                    <p>Send notifications via email, SMS, or in-app</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/notifications/templates</span>
                    </div>
                    <p>List available notification templates</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/notifications/history</span>
                    </div>
                    <p>Get notification delivery history</p>
                  </div>
                </div>
              </div>
              
              <!-- AI API -->
              <div *ngIf="activeSection === 'ai-api'">
                <p class="lead">AI-powered copilot features for intelligent assistance and automation.</p>
                
                <h2>🤖 Endpoints</h2>
                <div class="api-endpoints">
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/ai/chat</span>
                    </div>
                    <p>Chat with the AI copilot for assistance</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method post">POST</span>
                      <span class="url">/ai/analyze</span>
                    </div>
                    <p>Analyze data and get AI insights</p>
                  </div>
                  
                  <div class="api-endpoint">
                    <div class="endpoint-header">
                      <span class="method get">GET</span>
                      <span class="url">/ai/suggestions</span>
                    </div>
                    <p>Get AI-powered suggestions and recommendations</p>
                  </div>
                </div>
              </div>
              
              <!-- Integration Guides -->
              <div *ngIf="['web-integration', 'mobile-integration', 'backend-integration'].includes(activeSection)">
                <p class="lead">Step-by-step integration guides for your platform.</p>
                
                <h2>🔧 Quick Setup</h2>
                <div class="integration-steps">
                  <div class="step">
                    <h3>1. Install SDK</h3>
                    <div class="code-block">
                      <pre><code>npm install &#64;saasfactory/sdk</code></pre>
                    </div>
                  </div>
                  
                  <div class="step">
                    <h3>2. Initialize Client</h3>
                    <div class="code-block">
                      <pre><code>import SaaSFactory from '&#64;saasfactory/sdk';

const client = new SaaSFactory({{ '{' }}
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id'
{{ '}' }});</code></pre>
                    </div>
                  </div>
                  
                  <div class="step">
                    <h3>3. Start Using</h3>
                    <div class="code-block">
                      <pre><code>// Authenticate user
const user = await client.auth.login(email, password);

// Check permissions
const canAccess = await client.rbac.hasPermission('resource.read');</code></pre>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- SDKs -->
              <div *ngIf="['javascript-sdk', 'python-sdk', 'csharp-sdk'].includes(activeSection)">
                <p class="lead">Official SDK documentation and examples.</p>
                
                <h2>📦 Installation</h2>
                <div class="installation-tabs">
                  <div class="code-block" *ngIf="activeSection === 'javascript-sdk'">
                    <pre><code>npm install &#64;saasfactory/sdk
# or
yarn add &#64;saasfactory/sdk</code></pre>
                  </div>
                  
                  <div class="code-block" *ngIf="activeSection === 'python-sdk'">
                    <pre><code>pip install saasfactory-sdk</code></pre>
                  </div>
                  
                  <div class="code-block" *ngIf="activeSection === 'csharp-sdk'">
                    <pre><code>dotnet add package SaaSFactory.SDK</code></pre>
                  </div>
                </div>
                
                <h2>🚀 Quick Start</h2>
                <p>Get started with the SDK in minutes.</p>
                <a (click)="selectSection('quickstart')" class="quick-start-link">View Quick Start Guide →</a>
              </div>
              
              <!-- Examples and Use Cases -->
              <div *ngIf="['code-examples', 'demo-apps', 'use-cases'].includes(activeSection)">
                <p class="lead">Real-world examples and implementation patterns.</p>
                
                <div class="examples-grid">
                  <div class="example-card">
                    <h3>User Authentication</h3>
                    <p>Complete login/logout flow with session management</p>
                    <a (click)="selectSection('auth-api')" class="example-link">View Example →</a>
                  </div>
                  
                  <div class="example-card">
                    <h3>Role-Based Access</h3>
                    <p>Implement RBAC with custom permissions</p>
                    <a (click)="selectSection('rbac-api')" class="example-link">View Example →</a>
                  </div>
                  
                  <div class="example-card">
                    <h3>Analytics Dashboard</h3>
                    <p>Build analytics dashboards with real-time data</p>
                    <a (click)="selectSection('analytics-api')" class="example-link">View Example →</a>
                  </div>
                  
                  <div class="example-card">
                    <h3>AI Integration</h3>
                    <p>Add AI copilot features to your application</p>
                    <a (click)="selectSection('ai-api')" class="example-link">View Example →</a>
                  </div>
                </div>
              </div>
              
              <!-- Fallback for remaining sections -->
              <div *ngIf="!['auth-api', 'rbac-api', 'analytics-api', 'audit-api', 'notifications-api', 'ai-api', 'web-integration', 'mobile-integration', 'backend-integration', 'javascript-sdk', 'python-sdk', 'csharp-sdk', 'code-examples', 'demo-apps', 'use-cases', 'webhooks', 'rest-api'].includes(activeSection)">
                <div class="coming-soon">
                  <div class="coming-soon-icon">🚧</div>
                  <h2>Coming Soon</h2>
                  <p>This section is currently under development. Check back soon for detailed documentation.</p>
                  <div class="help-section">
                    <h3>Need Help Now?</h3>
                    <p>Contact our support team for immediate assistance:</p>
                    <a href="mailto:support@saasfactory.com" class="support-link">
                      <span class="support-icon">📧</span>
                      support&#64;saasfactory.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Footer -->
      <footer class="docs-footer">
        <div class="docs-footer-content">
          <div class="footer-section">
            <h4>SaaS Factory</h4>
            <ul>
              <li><a href="/docs">Documentation</a></li>
              <li><a href="/demo/setup">Demo</a></li>
              <li><a href="mailto:support@saasfactory.com">Email Support</a></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a (click)="selectSection('code-examples')">Code Examples</a></li>
              <li><a (click)="selectSection('demo-apps')">Demo Apps</a></li>
              <li><a (click)="selectSection('use-cases')">Use Cases</a></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>API Reference</h4>
            <ul>
              <li><a (click)="selectSection('auth-api')">Authentication</a></li>
              <li><a (click)="selectSection('rbac-api')">RBAC</a></li>
              <li><a (click)="selectSection('analytics-api')">Analytics</a></li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:support@saasfactory.com">Email Support</a></li>
              <li><a href="/docs">Documentation</a></li>
              <li><a href="https://github.com/saasfactory">GitHub</a></li>
            </ul>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p>&copy; 2024 SaaS Factory Platform. All rights reserved.</p>
          <div class="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">API Status</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    /* Global Styles */
    .docs-container {
      min-height: 100vh;
      background: #fafafa;
      display: flex;
      flex-direction: column;
    }

    /* Header Styles */
    .docs-header {
      background: white;
      border-bottom: 1px solid #e1e5e9;
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .docs-header-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .docs-brand {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .docs-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .factory-icon {
      font-size: 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .docs-brand h1 {
      margin: 0;
      font-size: 1.3rem;
      color: #6c757d;
      font-weight: 400;
    }

    .back-to-platform {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: 1px solid #667eea;
      transition: all 0.3s ease;
    }

    .back-to-platform:hover {
      background: #667eea;
      color: white;
      transform: translateY(-1px);
    }

    /* Layout Styles */
    .docs-layout {
      display: flex;
      flex: 1;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    /* Sidebar Styles */
    .docs-sidebar {
      width: 280px;
      background: white;
      border-right: 1px solid #e1e5e9;
      height: calc(100vh - 80px);
      position: sticky;
      top: 80px;
      overflow-y: auto;
    }

    .docs-nav {
      padding: 2rem 0;
    }

    .nav-section {
      margin-bottom: 2rem;
    }

    .nav-section h3 {
      font-size: 0.9rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 1rem 0;
      padding: 0 1.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .nav-section ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-section li {
      margin: 0;
    }

    .nav-section a {
      display: block;
      padding: 0.75rem 1.5rem;
      color: #6c757d;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }

    .nav-section a:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .nav-section a.active {
      background: #e3f2fd;
      color: #1976d2;
      border-left-color: #1976d2;
      font-weight: 500;
    }

    /* Content Styles */
    .docs-content {
      flex: 1;
      padding: 2rem;
      background: white;
      margin: 1rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .docs-article {
      max-width: 800px;
    }

    .content-section h1 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .lead {
      font-size: 1.2rem;
      color: #6c757d;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .content-section h2 {
      color: #2c3e50;
      margin: 2rem 0 1rem 0;
      font-size: 1.8rem;
      font-weight: 600;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 0.5rem;
    }

    .content-section h3 {
      color: #495057;
      margin: 1.5rem 0 0.75rem 0;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .content-section p {
      line-height: 1.6;
      margin-bottom: 1rem;
      color: #495057;
    }

    /* Architecture Diagram */
    .architecture-diagram {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 2rem 0;
      padding: 2rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .architecture-layer {
      text-align: center;
    }

    .architecture-layer h4 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #495057;
    }

    .layer-items {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .layer-item {
      background: white;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.9rem;
      border: 1px solid #e9ecef;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .feature-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s ease;
    }

    .feature-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .feature-card h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      color: #2c3e50;
    }

    .feature-card p {
      margin: 0;
      color: #6c757d;
      line-height: 1.5;
    }

    /* Code Blocks */
    .code-block {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
      overflow-x: auto;
    }

    .code-block pre {
      margin: 0;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .code-block code {
      color: #495057;
    }

    /* Code Tabs */
    .code-tabs {
      margin: 1.5rem 0;
    }

    .tab-headers {
      display: flex;
      border-bottom: 1px solid #e9ecef;
      margin-bottom: 0;
    }

    .tab-header {
      background: none;
      border: none;
      padding: 0.75rem 1rem;
      cursor: pointer;
      color: #6c757d;
      font-size: 0.9rem;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .tab-header:hover {
      color: #495057;
      background: #f8f9fa;
    }

    .tab-header.active {
      color: #1976d2;
      border-bottom-color: #1976d2;
      background: white;
    }

    .tab-content {
      background: white;
    }

    /* API Endpoint */
    .api-endpoint {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin: 1.5rem 0;
      overflow: hidden;
    }

    .endpoint-header {
      background: #f8f9fa;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .method {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .method.post {
      background: #28a745;
      color: white;
    }

    .url {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: 500;
      color: #495057;
    }

    .endpoint-body {
      padding: 1.5rem;
    }

    .endpoint-body h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      color: #495057;
    }

    /* Next Steps */
    .next-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 2rem 0;
    }

    .step-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .step-number {
      background: #667eea;
      color: white;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-content h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
    }

    .step-content p {
      margin: 0 0 0.75rem 0;
      color: #6c757d;
    }

    .step-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
    }

    .step-link:hover {
      text-decoration: underline;
    }

    /* Coming Soon */
    .coming-soon {
      text-align: center;
      padding: 4rem 2rem;
      background: #f8f9fa;
      border-radius: 12px;
      margin: 2rem 0;
    }

    .coming-soon-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .coming-soon h2 {
      margin: 0 0 1rem 0;
      color: #495057;
    }

    .coming-soon p {
      color: #6c757d;
      margin-bottom: 2rem;
    }

    .help-section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      margin-top: 2rem;
    }

    .help-section h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
    }

    .support-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      padding: 0.75rem 1rem;
      border: 1px solid #667eea;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .support-link:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* API Documentation Styles */
    .api-endpoints {
      display: grid;
      gap: 1rem;
      margin: 2rem 0;
    }

    .api-endpoint {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .method {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .method.get {
      background: #e7f3ff;
      color: #0969da;
    }

    .method.post {
      background: #fff2e5;
      color: #bc4c00;
    }

    .method.put {
      background: #fff8e1;
      color: #e65100;
    }

    .method.delete {
      background: #ffebee;
      color: #c62828;
    }

    .url {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9rem;
      color: #24292f;
      background: #f6f8fa;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    /* Integration Steps */
    .integration-steps {
      display: grid;
      gap: 2rem;
      margin: 2rem 0;
    }

    .step {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 2rem;
    }

    .step h3 {
      margin: 0 0 1rem 0;
      color: #667eea;
      font-size: 1.3rem;
    }

    /* Examples Grid */
    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .example-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .example-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      border-color: #667eea;
    }

    .example-card h3 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
      font-size: 1.2rem;
    }

    .example-card p {
      margin: 0 0 1rem 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .example-link, .quick-start-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }

    .example-link:hover, .quick-start-link:hover {
      color: #5a67d8;
      text-decoration: underline;
    }

    /* Installation Tabs */
    .installation-tabs {
      margin: 1rem 0;
    }

    /* Footer Styles */
    .docs-footer {
      background: #2c3e50;
      color: white;
      margin-top: auto;
    }

    .docs-footer-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 3rem 2rem 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
    }

    .footer-section h4 {
      margin: 0 0 1rem 0;
      color: #ecf0f1;
      font-size: 1.1rem;
    }

    .footer-section ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .footer-section li {
      margin-bottom: 0.5rem;
    }

    .footer-section a {
      color: #bdc3c7;
      text-decoration: none;
      cursor: pointer;
    }

    .footer-section a:hover {
      color: #ecf0f1;
    }

    .footer-bottom {
      border-top: 1px solid #34495e;
      padding: 1.5rem 2rem;
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-bottom p {
      margin: 0;
      color: #bdc3c7;
    }

    .footer-links {
      display: flex;
      gap: 2rem;
    }

    .footer-links a {
      color: #bdc3c7;
      text-decoration: none;
    }

    .footer-links a:hover {
      color: #ecf0f1;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .docs-layout {
        flex-direction: column;
      }
      
      .docs-sidebar {
        width: 100%;
        height: auto;
        position: static;
      }
      
      .docs-content {
        margin: 0;
        border-radius: 0;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
      }
      
      .footer-bottom {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      
      .footer-links {
        justify-content: center;
      }
    }
  `]
})
export class DocsComponent implements OnInit {
  activeSection = 'overview';
  activeTab = 'curl';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for section in URL fragment
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        this.activeSection = fragment;
      }
    });
  }

  selectSection(section: string): void {
    this.activeSection = section;
    // Update URL without navigation
    this.router.navigate([], {
      fragment: section,
      replaceUrl: true
    });
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
  }

  getSectionTitle(section: string): string {
    const titles: { [key: string]: string } = {
      'auth-api': 'Authentication API',
      'rbac-api': 'RBAC API',
      'analytics-api': 'Analytics API',
      'audit-api': 'Audit Logs API',
      'notifications-api': 'Notifications API',
      'ai-api': 'AI Copilot API',
      'web-integration': 'Web Application Integration',
      'mobile-integration': 'Mobile App Integration',
      'backend-integration': 'Backend Service Integration',
      'webhooks': 'Webhooks',
      'javascript-sdk': 'JavaScript SDK',
      'python-sdk': 'Python SDK',
      'csharp-sdk': 'C# SDK',
      'rest-api': 'REST API Reference',
      'code-examples': 'Code Examples',
      'demo-apps': 'Demo Applications',
      'use-cases': 'Use Cases'
    };
    
    return titles[section] || section.charAt(0).toUpperCase() + section.slice(1);
  }
} 