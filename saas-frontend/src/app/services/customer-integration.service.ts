import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from './api.service';

export interface CustomerIntegrationRequest {
  id?: string;
  customerName: string;
  domain: string;
  adminEmail: string;
  techContact: string;
  estimatedUsers: number;
  industry: string;
  useCase: string;
  requiredModules: string[];
  timeline: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: Date;
  credentials?: {
    tenantId: string;
    apiKey: string;
    clientId: string;
    clientSecret: string;
    webhookSecret: string;
  };
}

export interface CustomerIntegrationResponse {
  tenant: {
    id: string;
    name: string;
    domain: string;
    status: string;
  };
  credentials: {
    tenantId: string;
    apiKey: string;
    clientId: string;
    clientSecret: string;
    webhookSecret: string;
  };
  selectedModules: string[];
  adminUser: {
    email: string;
    tempPassword: string;
  };
  welcomeEmailSent: boolean;
  loginUrl: string;
  apiEndpoint: string;
  setupComplete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerIntegrationService {

  constructor(private apiService: ApiService) {}

  /**
   * Process a new customer integration request
   */
  processIntegrationRequest(request: CustomerIntegrationRequest): Observable<CustomerIntegrationResponse> {
    // Try to use the existing API service onboard method
    try {
      return this.apiService.onboardTenant({
        companyName: request.customerName,
        domain: request.domain,
        adminEmail: request.adminEmail,
        techContact: request.techContact,
        estimatedUsers: request.estimatedUsers,
        industry: request.industry,
        useCase: request.useCase,
        selectedModules: request.requiredModules,
        timeline: request.timeline
      });
    } catch (error) {
      // Fallback to mock response for demo
      return of(this.generateMockResponse(request));
    }
  }

  /**
   * Generate API credentials for a customer
   */
  generateCredentials(customerName: string): {
    tenantId: string;
    apiKey: string;
    clientId: string;
    clientSecret: string;
    webhookSecret: string;
  } {
    const timestamp = Date.now();
    const cleanName = customerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    return {
      tenantId: `${cleanName}-${timestamp}`,
      apiKey: `sk_live_${this.generateRandomString(32)}`,
      clientId: `client_${this.generateRandomString(16)}`,
      clientSecret: `secret_${this.generateRandomString(32)}`,
      webhookSecret: `whsec_${this.generateRandomString(24)}`
    };
  }

  /**
   * Send welcome email to customer
   */
  sendWelcomeEmail(request: CustomerIntegrationRequest): Observable<boolean> {
    const emailContent = this.generateWelcomeEmailContent(request);
    console.log('Welcome Email Content:', emailContent);
    
    // In a real implementation, this would call an email service
    // For now, we'll simulate success
    return of(true);
  }

  /**
   * Generate integration package for download
   */
  generateIntegrationPackage(request: CustomerIntegrationRequest): Blob {
    const packageData = {
      customer: {
        name: request.customerName,
        domain: request.domain,
        adminEmail: request.adminEmail,
        techContact: request.techContact
      },
      credentials: request.credentials,
      modules: request.requiredModules,
      quickStart: this.generateQuickStartGuide(request),
      exampleCode: this.generateExampleCode(request),
      apiDocumentation: this.generateApiDocumentation(request),
      sdkDownloads: this.generateSdkInfo()
    };

    return new Blob([JSON.stringify(packageData, null, 2)], { 
      type: 'application/json' 
    });
  }

  /**
   * Get customer integration statistics
   */
  getIntegrationStats(): Observable<{
    totalCustomers: number;
    pendingIntegrations: number;
    activeIntegrations: number;
    inProgressIntegrations: number;
    monthlyGrowth: number;
  }> {
    // In real implementation, this would call the API
    const stats = {
      totalCustomers: this.getTotalCustomers(),
      pendingIntegrations: this.getPendingIntegrations(),
      activeIntegrations: this.getActiveIntegrations(),
      inProgressIntegrations: this.getInProgressIntegrations(),
      monthlyGrowth: 15.8
    };

    return of(stats);
  }

  // Private helper methods

  private generateMockResponse(request: CustomerIntegrationRequest): CustomerIntegrationResponse {
    const credentials = this.generateCredentials(request.customerName);
    
    return {
      tenant: {
        id: credentials.tenantId,
        name: request.customerName,
        domain: request.domain,
        status: 'Active'
      },
      credentials,
      selectedModules: request.requiredModules,
      adminUser: {
        email: request.adminEmail,
        tempPassword: this.generateTempPassword()
      },
      welcomeEmailSent: true,
      loginUrl: `https://portal.saasfactory.com/${credentials.tenantId}`,
      apiEndpoint: `https://api.saasfactory.com/v1`,
      setupComplete: true
    };
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private generateWelcomeEmailContent(request: CustomerIntegrationRequest): string {
    return `
Subject: 🚀 Welcome to SaaS Factory - Your Integration is Ready!

Dear ${request.customerName} Team,

Welcome to SaaS Factory! Your integration has been approved and your credentials are ready.

🔑 Your Credentials:
Tenant ID: ${request.credentials?.tenantId}
API Key: ${request.credentials?.apiKey}
Client ID: ${request.credentials?.clientId}
Client Secret: ${request.credentials?.clientSecret}
Webhook Secret: ${request.credentials?.webhookSecret}

📦 Selected Modules:
${request.requiredModules.map(module => `• ${this.getModuleName(module)}`).join('\n')}

🚀 Next Steps:
1. Download your integration package from the customer portal
2. Review the API documentation and code examples
3. Test the API connectivity using the provided credentials
4. Schedule a technical review call with our integration team

📚 Resources:
• API Documentation: https://docs.saasfactory.com
• SDK Downloads: https://sdk.saasfactory.com
• Support Portal: https://support.saasfactory.com

📞 Support:
Email: support@saasfactory.com
Phone: +1-555-SAAS-HELP
Live Chat: Available 24/7 in your customer portal

Best regards,
The SaaS Factory Integration Team

---
This email contains sensitive information. Please keep your credentials secure.
    `;
  }

  private generateQuickStartGuide(request: CustomerIntegrationRequest): string {
    return `
# ${request.customerName} - SaaS Factory Quick Start Guide

## 🚀 Getting Started

### 1. Authentication Setup
Use your provided credentials to authenticate API calls:

\`\`\`javascript
const client = new SaaSFactoryClient({
  apiKey: '${request.credentials?.apiKey}',
  tenantId: '${request.credentials?.tenantId}',
  baseUrl: 'https://api.saasfactory.com'
});
\`\`\`

### 2. Test Connectivity
\`\`\`javascript
const health = await client.health.check();
console.log('Health status:', health);
\`\`\`

### 3. Your Enabled Modules
${request.requiredModules.map(module => `- **${this.getModuleName(module)}**: Ready for integration`).join('\n')}

### 4. Next Steps
1. Review the complete API documentation
2. Implement your first API call
3. Set up webhook endpoints (optional)
4. Contact support for any questions

## 📞 Support
- Email: support@saasfactory.com
- Phone: +1-555-SAAS-HELP
- Documentation: https://docs.saasfactory.com
    `;
  }

  private generateExampleCode(request: CustomerIntegrationRequest): string {
    return `
// ${request.customerName} - SaaS Factory Integration Examples

// 1. Initialize the client
const SaaSFactoryClient = require('@saasfactory/sdk');

const client = new SaaSFactoryClient({
  apiKey: '${request.credentials?.apiKey}',
  tenantId: '${request.credentials?.tenantId}',
  baseUrl: 'https://api.saasfactory.com'
});

// 2. Health check
async function testConnection() {
  try {
    const health = await client.health.check();
    console.log('✅ Connection successful:', health);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

// 3. User management example (if enabled)
${request.requiredModules.includes('authentication') ? `
async function createUser() {
  const newUser = await client.users.create({
    email: 'john.doe@${request.domain}',
    name: 'John Doe',
    role: 'user'
  });
  console.log('Created user:', newUser);
}
` : '// User management not enabled'}

// 4. Analytics example (if enabled)
${request.requiredModules.includes('analytics') ? `
async function getAnalytics() {
  const analytics = await client.analytics.getDashboard({
    timeRange: '7d'
  });
  console.log('Analytics data:', analytics);
}
` : '// Analytics not enabled'}

// 5. Notifications example (if enabled)
${request.requiredModules.includes('notifications') ? `
async function sendNotification() {
  await client.notifications.send({
    to: 'admin@${request.domain}',
    template: 'welcome',
    data: { name: 'New User' }
  });
  console.log('Notification sent');
}
` : '// Notifications not enabled'}

// Run examples
testConnection();
    `;
  }

  private generateApiDocumentation(request: CustomerIntegrationRequest): string {
    return `
# SaaS Factory API Documentation

## Base URL
https://api.saasfactory.com/v1

## Authentication
All API requests require your API key in the Authorization header:
\`Authorization: Bearer ${request.credentials?.apiKey}\`

## Available Endpoints

${request.requiredModules.map(module => this.getModuleEndpoints(module)).join('\n\n')}

## Rate Limits
- 1000 requests per minute per API key
- 10,000 requests per hour per tenant

## Error Handling
All errors return JSON with error details:
\`\`\`json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Description of the error"
  }
}
\`\`\`

For complete documentation, visit: https://docs.saasfactory.com
    `;
  }

  private getModuleEndpoints(moduleId: string): string {
    const endpoints = {
      authentication: `### User Management
- GET /users - List users
- POST /users - Create user
- GET /users/{id} - Get user
- PUT /users/{id} - Update user
- DELETE /users/{id} - Delete user`,
      
      rbac: `### RBAC
- GET /roles - List roles
- POST /roles - Create role
- GET /permissions - List permissions`,
      
      analytics: `### Analytics
- GET /analytics/dashboard - Get dashboard data
- GET /analytics/users - User analytics
- GET /analytics/usage - Usage statistics`,
      
      notifications: `### Notifications
- POST /notifications/send - Send notification
- GET /notifications/templates - List templates
- POST /notifications/templates - Create template`,
      
      audit: `### Audit Logs
- GET /audit/logs - List audit logs
- GET /audit/reports - Generate reports`,
      
      copilot: `### AI Copilot
- POST /copilot/chat - Chat with AI
- GET /copilot/suggestions - Get suggestions`
    };

    return endpoints[moduleId as keyof typeof endpoints] || `### ${moduleId}\nEndpoints for ${moduleId} module`;
  }

  private generateSdkInfo(): object {
    return {
      javascript: {
        npm: '@saasfactory/sdk',
        github: 'https://github.com/saasfactory/sdk-js',
        docs: 'https://docs.saasfactory.com/sdk/javascript'
      },
      python: {
        pip: 'saasfactory-sdk',
        github: 'https://github.com/saasfactory/sdk-python',
        docs: 'https://docs.saasfactory.com/sdk/python'
      },
      csharp: {
        nuget: 'SaaSFactory.SDK',
        github: 'https://github.com/saasfactory/sdk-csharp',
        docs: 'https://docs.saasfactory.com/sdk/csharp'
      }
    };
  }

  private getModuleName(moduleId: string): string {
    const moduleNames = {
      authentication: 'User Management',
      rbac: 'Role-Based Access Control',
      analytics: 'Analytics & Reporting',
      notifications: 'Notifications',
      audit: 'Audit Logs',
      copilot: 'AI Copilot'
    };
    return moduleNames[moduleId as keyof typeof moduleNames] || moduleId;
  }

  // Stats helper methods (would typically come from API)
  private getTotalCustomers(): number {
    const stored = localStorage.getItem('customerIntegrationRequests');
    return stored ? JSON.parse(stored).length : 0;
  }

  private getPendingIntegrations(): number {
    const stored = localStorage.getItem('customerIntegrationRequests');
    if (!stored) return 0;
    const requests = JSON.parse(stored);
    return requests.filter((r: CustomerIntegrationRequest) => r.status === 'pending').length;
  }

  private getActiveIntegrations(): number {
    const stored = localStorage.getItem('customerIntegrationRequests');
    if (!stored) return 0;
    const requests = JSON.parse(stored);
    return requests.filter((r: CustomerIntegrationRequest) => r.status === 'completed').length;
  }

  private getInProgressIntegrations(): number {
    const stored = localStorage.getItem('customerIntegrationRequests');
    if (!stored) return 0;
    const requests = JSON.parse(stored);
    return requests.filter((r: CustomerIntegrationRequest) => r.status === 'in-progress').length;
  }
} 