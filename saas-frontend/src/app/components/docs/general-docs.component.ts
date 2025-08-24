import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-general-docs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="docs-container">
      <!-- Header -->
      <header class="docs-header">
        <div class="header-content">
          <div class="brand">
            <div class="logo">📚</div>
            <div class="brand-info">
              <h1>SaaS Factory Documentation</h1>
              <span class="subtitle"
                >Complete Integration Guide & Developer Resources</span
              >
            </div>
          </div>
          <div class="header-actions">
            <button class="back-btn" (click)="goHome()">
              <span class="back-icon">←</span>
              Back to Platform
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="docs-content">
        <main class="content">
          <!-- Getting Started Section -->
          <section class="docs-section">
            <h2>🚀 Getting Started</h2>
            <p>
              Welcome to SaaS Factory - the comprehensive multi-tenant SaaS
              platform that accelerates your application development.
            </p>

            <div class="feature-grid">
              <div class="feature-card">
                <div class="feature-icon">🏢</div>
                <h3>Multi-Tenant Architecture</h3>
                <p>
                  Built-in tenant isolation, data segregation, and customizable
                  branding per tenant.
                </p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🔐</div>
                <h3>Enterprise Security</h3>
                <p>
                  Azure AD integration, RBAC, JWT authentication, and
                  comprehensive audit trails.
                </p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3>Analytics & Reporting</h3>
                <p>
                  Real-time analytics, customizable dashboards, and detailed
                  usage metrics.
                </p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">🤖</div>
                <h3>AI-Powered Features</h3>
                <p>
                  Integrated AI copilot, smart notifications, and automated
                  workflows.
                </p>
              </div>
            </div>
          </section>

          <!-- Quick Start Section -->
          <section class="docs-section">
            <h2>⚡ Quick Start</h2>

            <div class="steps-container">
              <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Create Your Tenant</h3>
                  <p>
                    Set up your organization's isolated environment with custom
                    configuration.
                  </p>
                  <div class="code-block">
                    <pre><code>POST /api/v2/tenants/onboard
&#123;
  "companyName": "Your Company",
  "adminEmail": "admin&#64;yourcompany.com",
  "adminName": "Admin User"
&#125;</code></pre>
                  </div>
                </div>
              </div>

              <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Configure Authentication</h3>
                  <p>
                    Use your API key for secure access to tenant-specific
                    resources.
                  </p>
                  <div class="code-block">
                    <pre><code># Required headers for all API calls
Authorization: Bearer YOUR_API_KEY
X-Tenant-ID: your-tenant-id
Content-Type: application/json</code></pre>
                  </div>
                </div>
              </div>

              <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Start Building</h3>
                  <p>
                    Integrate our APIs into your application using our
                    comprehensive endpoints.
                  </p>
                  <div class="action-buttons">
                    <a href="/api/reference" class="action-btn primary"
                      >View API Reference</a
                    >
                    <a href="/demo/setup" class="action-btn secondary"
                      >Try Demo</a
                    >
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Core Services Section -->
          <section class="docs-section">
            <h2>🛠️ Core Services</h2>

            <div class="services-grid">
              <div class="service-card">
                <h3>👥 User Management</h3>
                <p>
                  Complete user lifecycle management with roles and permissions.
                </p>
                <div class="endpoints">
                  <span class="endpoint">GET /api/v2/users</span>
                  <span class="endpoint">POST /api/v2/users</span>
                </div>
              </div>

              <div class="service-card">
                <h3>🛡️ RBAC & Permissions</h3>
                <p>Role-based access control with fine-grained permissions.</p>
                <div class="endpoints">
                  <span class="endpoint">GET /api/v2/roles</span>
                  <span class="endpoint">POST /api/v2/roles</span>
                </div>
              </div>

              <div class="service-card">
                <h3>📊 Analytics</h3>
                <p>
                  Real-time analytics and customizable reporting dashboards.
                </p>
                <div class="endpoints">
                  <span class="endpoint">GET /api/v2/analytics</span>
                  <span class="endpoint">GET /api/v2/analytics/reports</span>
                </div>
              </div>

              <div class="service-card">
                <h3>📨 Notifications</h3>
                <p>
                  Multi-channel notifications with templates and automation.
                </p>
                <div class="endpoints">
                  <span class="endpoint">POST /api/v2/notifications</span>
                  <span class="endpoint"
                    >GET /api/v2/notifications/templates</span
                  >
                </div>
              </div>

              <div class="service-card">
                <h3>🤖 AI Copilot</h3>
                <p>AI-powered assistance and automated workflows.</p>
                <div class="endpoints">
                  <span class="endpoint">POST /api/v2/copilot/chat</span>
                  <span class="endpoint">GET /api/v2/copilot/suggestions</span>
                </div>
              </div>

              <div class="service-card">
                <h3>📋 Audit Logs</h3>
                <p>Comprehensive activity tracking and compliance reporting.</p>
                <div class="endpoints">
                  <span class="endpoint">GET /api/v2/audit-logs</span>
                  <span class="endpoint">GET /api/v2/audit-logs/reports</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Integration Examples Section -->
          <section class="docs-section">
            <h2>🔗 Integration Examples</h2>

            <div class="integration-tabs">
              <div class="tab-content">
                <h3>JavaScript/TypeScript</h3>
                <div class="code-block">
                  <pre><code>// Install the SDK
npm install &#64;saasfactory/client

// Initialize client
const client = new SaaSFactoryClient(&#123;
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
  baseUrl: (typeof window !== 'undefined' && window.location ? window.location.origin : '') + '/api/v2'
&#125;);

// Get users
const users = await client.users.getAll();</code></pre>
                </div>
              </div>
            </div>
          </section>

          <!-- Support Section -->
          <section class="docs-section">
            <h2>🆘 Support & Resources</h2>

            <div class="support-grid">
              <div class="support-card">
                <h3>📧 Email Support</h3>
                <p>Get help from our engineering team</p>
                <a href="mailto:support@saasfactory.com" class="support-link"
                  >Contact Support</a
                >
              </div>

              <div class="support-card">
                <h3>📚 API Reference</h3>
                <p>Complete API documentation with examples</p>
                <a href="/api/reference" class="support-link">Browse APIs</a>
              </div>

              <div class="support-card">
                <h3>🚀 Live Demo</h3>
                <p>Try our platform with sample data</p>
                <a href="/demo/setup" class="support-link">Launch Demo</a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .docs-container {
        min-height: 100vh;
        background: #f8f9fa;
        display: flex;
        flex-direction: column;
      }

      .docs-header {
        background: white;
        border-bottom: 1px solid #e9ecef;
        padding: 1rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .header-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .logo {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        font-size: 1.5rem;
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .brand-info h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #2c3e50;
        font-weight: 700;
      }

      .subtitle {
        color: #6c757d;
        font-size: 0.9rem;
      }

      .back-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #667eea;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .back-btn:hover {
        background: #5a6fd8;
        transform: translateY(-1px);
      }

      .docs-content {
        flex: 1;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        padding: 2rem;
      }

      .content {
        background: white;
        border-radius: 12px;
        padding: 3rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .docs-section {
        margin-bottom: 4rem;
      }

      .docs-section h2 {
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e9ecef;
      }

      .docs-section h3 {
        color: #495057;
        font-size: 1.3rem;
        font-weight: 600;
        margin: 1.5rem 0 1rem 0;
      }

      .docs-section p {
        color: #6c757d;
        line-height: 1.6;
        margin-bottom: 1rem;
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        margin: 2rem 0;
      }

      .feature-card {
        background: #f8f9fa;
        padding: 2rem;
        border-radius: 12px;
        border: 1px solid #e9ecef;
        text-align: center;
      }

      .feature-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }

      .steps-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin: 2rem 0;
      }

      .step {
        display: flex;
        gap: 1.5rem;
        align-items: flex-start;
      }

      .step-number {
        background: #667eea;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        flex-shrink: 0;
      }

      .step-content {
        flex: 1;
      }

      .code-block {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        overflow-x: auto;
      }

      .code-block pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        color: #495057;
      }

      .action-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }

      .action-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .action-btn.primary {
        background: #667eea;
        color: white;
      }

      .action-btn.secondary {
        background: #f8f9fa;
        color: #495057;
        border: 1px solid #e9ecef;
      }

      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
      }

      .service-card {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }

      .endpoints {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .endpoint {
        background: #e9ecef;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        display: inline-block;
      }

      .integration-tabs {
        margin: 2rem 0;
      }

      .tab-content h3 {
        margin: 0 0 1rem 0;
        color: #495057;
      }

      .support-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        margin: 2rem 0;
      }

      .support-card {
        background: #f8f9fa;
        padding: 2rem;
        border-radius: 12px;
        border: 1px solid #e9ecef;
        text-align: center;
      }

      .support-link {
        display: inline-block;
        background: #667eea;
        color: white;
        text-decoration: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        transition: all 0.3s ease;
      }

      .support-link:hover {
        background: #5a6fd8;
        transform: translateY(-1px);
      }

      @media (max-width: 768px) {
        .header-content {
          flex-direction: column;
          gap: 1rem;
          padding: 0 1rem;
        }

        .docs-content {
          padding: 1rem;
        }

        .content {
          padding: 2rem;
        }

        .feature-grid,
        .services-grid,
        .support-grid {
          grid-template-columns: 1fr;
        }

        .step {
          flex-direction: column;
          text-align: center;
        }

        .action-buttons {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class GeneralDocsComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }
}
