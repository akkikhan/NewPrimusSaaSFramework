import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TenantService } from '../../services/tenant.service';
import { TenantAuthService } from '../../services/tenant-auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tenant-portal-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenant-portal-redirect">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">
          <h2>Accessing {{ tenantId ? companyName || tenantId : 'Tenant Portal' }}</h2>
          <p>{{ statusMessage }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-portal-redirect {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .loading-container {
      text-align: center;
      padding: 2rem;
    }
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text h2 {
      margin: 1rem 0;
      font-size: 1.5rem;
      font-weight: 300;
    }
    
    .loading-text p {
      margin: 0.5rem 0;
      opacity: 0.8;
    }
  `]
})
export class TenantPortalRedirectComponent implements OnInit {
  tenantId: string | null = null;
  companyName: string | null = null;
  statusMessage = 'Loading tenant configuration...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantService: TenantService,
    private tenantAuthService: TenantAuthService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Get tenant ID from route
      this.tenantId = this.route.snapshot.params['tenantId'];
      
      if (!this.tenantId) {
        this.router.navigate(['/']);
        return;
      }

      if (environment.features?.enableDebugLogs) {
        console.log(`🔄 [TenantPortalRedirect] Processing redirect for tenant: ${this.tenantId}`);
      }

      // Step 1: Load tenant configuration
      this.statusMessage = 'Loading tenant configuration...';
      
      try {
        const tenantConfig = await this.tenantService.loadTenantConfig(this.tenantId);
        this.companyName = tenantConfig.companyName;
        
        // Step 2: Check authentication status
        this.statusMessage = 'Checking authentication status...';
        const isAuthenticated = await this.tenantAuthService.isAuthenticated(this.tenantId);
        
        if (isAuthenticated) {
          // User is authenticated, redirect to dashboard
          if (environment.features?.enableDebugLogs) {
            console.log(`✅ [TenantPortalRedirect] User authenticated for ${this.tenantId}, redirecting to dashboard`);
          }
          this.statusMessage = 'Redirecting to dashboard...';
          this.router.navigate(['/tenants', this.tenantId, 'dashboard']);
        } else {
          // User not authenticated, initiate Azure AD login
          if (environment.features?.enableDebugLogs) {
            console.log(`🔐 [TenantPortalRedirect] User not authenticated for ${this.tenantId}, initiating Azure AD login`);
          }
          this.statusMessage = 'Redirecting to Azure AD for authentication...';
          await this.tenantAuthService.initiateAzureAdLogin(tenantConfig);
        }
        
      } catch (tenantError) {
        console.error(`❌ [TenantPortalRedirect] Failed to load tenant ${this.tenantId}:`, tenantError);
        this.statusMessage = 'Tenant not found or configuration error';
        
        // Wait a moment then redirect to error page
        setTimeout(() => {
          this.router.navigate(['/'], {
            queryParams: {
              error: 'tenant_not_found',
              tenantId: this.tenantId
            }
          });
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ [TenantPortalRedirect] Unexpected error:', error);
      this.statusMessage = 'An unexpected error occurred';
      
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    }
  }
}
