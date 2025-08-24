import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-tenant-docs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenant-docs">
      <!-- Header -->
      <header class="docs-header">
        <div class="header-content">
          <div class="tenant-brand">
            <div class="tenant-logo">📚</div>
            <div class="tenant-info">
              <h1>{{ tenantDisplayName }} Documentation</h1>
              <span class="tenant-subtitle"
                >Integration Guide & API Reference</span
              >
            </div>
          </div>
          <div class="header-actions">
            <button class="back-btn" (click)="goBackToDashboard()">
              <span class="back-icon">←</span>
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="docs-container">
        <main class="docs-content">
          <!-- Getting Started Section -->
          <section class="docs-section">
            <h2>🚀 Getting Started</h2>
            <p>
              Welcome to the SaaS Factory platform integration guide for
              <strong>{{ tenantDisplayName }}</strong
              >.
            </p>

            <div class="info-card">
              <h3>Your Tenant Information</h3>
              <div class="tenant-details">
                <div class="detail-item">
                  <strong>Tenant ID:</strong> <code>{{ tenantId }}</code>
                </div>
                <div class="detail-item">
                  <strong>API Endpoint:</strong> <code>{{ apiEndpoint }}</code>
                </div>
                <div class="detail-item">
                  <strong>Environment:</strong>
                  <span class="env-badge">{{ environment }}</span>
                </div>
              </div>
            </div>

            <h3>Quick Setup Checklist</h3>
            <div class="checklist">
              <div class="checklist-item">
                <span class="checkbox">✅</span>
                <span>Tenant account created and activated</span>
              </div>
              <div class="checklist-item">
                <span class="checkbox">📧</span>
                <span>API credentials received via email</span>
              </div>
              <div class="checklist-item">
                <span class="checkbox">🔑</span>
                <span>Set up environment variables</span>
              </div>
              <div class="checklist-item">
                <span class="checkbox">🔗</span>
                <span>Test API connectivity</span>
              </div>
            </div>
          </section>

          <!-- Authentication Section -->
          <section class="docs-section">
            <h2>🔐 Authentication</h2>
            <p>
              SaaS Factory uses API key-based authentication for secure access
              to tenant-specific resources.
            </p>

            <h3>API Key Authentication</h3>
            <div class="code-block">
              <pre><code># Set your API key in headers
Authorization: Bearer YOUR_API_KEY
X-Tenant-ID: {{tenantId}}
Content-Type: application/json</code></pre>
            </div>

            <h3>Test Authentication</h3>
            <div class="code-block">
              <pre><code>curl -X GET "{{apiEndpoint}}/auth/validate" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: {{tenantId}}"</code></pre>
            </div>
          </section>

          <!-- Configuration Section -->
          <section class="docs-section">
            <h2>⚙️ Configuration</h2>
            <p>
              Configure your application environment to connect with SaaS
              Factory services.
            </p>

            <h3>Environment Variables</h3>
            <div class="code-block">
              <pre><code># Required environment variables
SAAS_FACTORY_TENANT_ID={{tenantId}}
SAAS_FACTORY_API_KEY=your-api-key-here
SAAS_FACTORY_BASE_URL={{apiEndpoint}}

# Optional configuration
SAAS_FACTORY_TIMEOUT=15000
SAAS_FACTORY_RETRY_ATTEMPTS=3</code></pre>
            </div>
          </section>

          <!-- Users API Section -->
          <section class="docs-section">
            <h2>👥 Users API</h2>
            <p>Manage user accounts within your tenant.</p>

            <div class="api-endpoint">
              <h3>Get Users</h3>
              <div class="endpoint-details">
                <span class="method get">GET</span>
                <span class="url">{{ apiEndpoint }}/users</span>
              </div>
              <div class="code-block">
                <pre><code>curl -X GET "{{apiEndpoint}}/users" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: {{tenantId}}"</code></pre>
              </div>
            </div>
          </section>

          <!-- Support Section -->
          <section class="docs-section">
            <h2>🆘 Need Help?</h2>
            <div class="support-grid">
              <div class="support-card">
                <h3>📧 Email Support</h3>
                <p>Get help from our support team</p>
                <a
                  href="mailto:support&#64;saasfactory.com"
                  class="support-link"
                >
                  Contact Support
                </a>
              </div>
              <div class="support-card">
                <h3>🚀 Demo Application</h3>
                <p>Try our working demo</p>
                <a
                  [href]="getBaseUrl() + '/demo/setup?tenantId=' + tenantId"
                  target="_blank"
                  class="support-link"
                >
                  Launch Demo
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .tenant-docs {
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
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .tenant-brand {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .tenant-logo {
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        font-size: 1.5rem;
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tenant-info h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #2c3e50;
        font-weight: 700;
      }

      .tenant-subtitle {
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

      .docs-container {
        display: flex;
        flex: 1;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }

      .docs-content {
        flex: 1;
        padding: 2rem;
        background: white;
        margin: 2rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .docs-section {
        margin-bottom: 4rem;
      }

      .docs-section h2 {
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e9ecef;
      }

      .docs-section h3 {
        color: #495057;
        font-size: 1.3rem;
        font-weight: 600;
        margin: 2rem 0 1rem 0;
      }

      .docs-section p {
        color: #6c757d;
        line-height: 1.6;
        margin-bottom: 1rem;
      }

      .info-card {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 2rem;
        border-radius: 12px;
        margin: 2rem 0;
      }

      .info-card h3 {
        color: white;
        margin: 0 0 1rem 0;
      }

      .tenant-details {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .detail-item {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .detail-item code {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
      }

      .env-badge {
        background: #28a745;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .checklist {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 1rem 0;
      }

      .checklist-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #28a745;
      }

      .checkbox {
        font-size: 1.2rem;
        min-width: 24px;
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

      .api-endpoint {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1.5rem 0;
      }

      .api-endpoint h3 {
        margin: 0 0 1rem 0;
        color: #495057;
      }

      .endpoint-details {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .method {
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .method.get {
        background: #d4edda;
        color: #155724;
      }

      .url {
        font-family: 'Courier New', monospace;
        background: #e9ecef;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.9rem;
      }

      .support-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

      .support-card h3 {
        color: #495057;
        margin: 0 0 1rem 0;
      }

      .support-card p {
        margin-bottom: 1.5rem;
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
          margin: 1rem;
        }

        .support-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TenantDocsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tenantId: string = '';
  tenantDisplayName: string = '';
  apiEndpoint: string =
    (typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '') + '/api/v2';
  environment: string = 'Development';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.tenantId = params['tenantId'];
      this.tenantDisplayName = this.formatTenantName(this.tenantId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private formatTenantName(tenantId: string): string {
    return tenantId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\d+$/, '')
      .trim();
  }

  goBackToDashboard(): void {
    this.router.navigate(['/tenant', this.tenantId, 'dashboard']);
  }

  getBaseUrl(): string {
    return window.location.origin;
  }
}
