import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-api-reference',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="api-reference">
      <header class="api-header">
        <div class="header-content">
          <div class="brand">
            <div class="logo">📖</div>
            <div class="brand-info">
              <h1>SaaS Factory API Reference</h1>
              <span class="subtitle">Complete REST API Documentation</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="back-btn" (click)="goBack()">
              <span class="back-icon">←</span>
              Back to Docs
            </button>
          </div>
        </div>
      </header>

      <div class="api-content">
        <main class="content">
          <section class="api-section">
            <h2>🌐 Base URL</h2>
            <div class="base-url">
              <code>{{ baseUrl }}</code>
            </div>
            <p>
              All API requests should be made to the base URL above with the
              appropriate endpoint path.
            </p>
          </section>

          <section class="api-section">
            <h2>👥 Users API</h2>
            <div class="endpoint">
              <div class="endpoint-header">
                <span class="method get">GET</span>
                <span class="path">/users</span>
                <span class="description">Get all users for the tenant</span>
              </div>
              <div class="endpoint-content">
                <h4>Example Request</h4>
                <div class="code-block">
                  <pre><code>curl -X GET "{{ baseUrl + '/users?page=1&pageSize=10' }}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: your-tenant-id"</code></pre>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .api-reference {
        min-height: 100vh;
        background: #f8f9fa;
        display: flex;
        flex-direction: column;
      }

      .api-header {
        background: white;
        border-bottom: 1px solid #e9ecef;
        padding: 1rem 0;
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

      .api-content {
        flex: 1;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        padding: 2rem;
      }

      .content {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .api-section {
        margin-bottom: 2rem;
      }

      .api-section h2 {
        color: #2c3e50;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e9ecef;
      }

      .base-url {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        text-align: center;
      }

      .base-url code {
        font-size: 1.1rem;
        font-weight: 600;
        color: #495057;
      }

      .endpoint {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin: 1rem 0;
        overflow: hidden;
      }

      .endpoint-header {
        background: white;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e9ecef;
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
        min-width: 60px;
        text-align: center;
      }

      .method.get {
        background: #d4edda;
        color: #155724;
      }

      .path {
        font-family: 'Courier New', monospace;
        font-weight: 600;
        color: #495057;
      }

      .description {
        color: #6c757d;
        flex: 1;
      }

      .endpoint-content {
        padding: 1.5rem;
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

      @media (max-width: 768px) {
        .header-content {
          flex-direction: column;
          gap: 1rem;
          padding: 0 1rem;
        }

        .api-content {
          padding: 1rem;
        }

        .content {
          padding: 2rem;
        }

        .endpoint-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .params-table,
        .response-codes {
          font-size: 0.85rem;
        }
      }
    `,
  ],
})
export class ApiReferenceComponent {
  baseUrl =
    (typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '') + '/api/v2';

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/docs']);
  }
}
