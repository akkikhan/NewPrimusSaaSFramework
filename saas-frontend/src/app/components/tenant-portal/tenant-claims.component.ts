import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TenantAuthService as PortalTenantAuthService } from '../../services/tenant-auth.service';

@Component({
  selector: 'app-tenant-claims',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="claims-container">
      <h2>Tenant Claims Debug</h2>
      <div class="meta">
        <div><strong>Tenant:</strong> {{ tenantId }}</div>
        <div><strong>Active Account:</strong> {{ activeAccount?.username || 'None' }}</div>
      </div>
      <div class="grid">
        <div class="card" *ngIf="idTokenClaims">
          <h3>ID Token Claims</h3>
          <pre>{{ idTokenClaims | json }}</pre>
        </div>
        <div class="card" *ngIf="accessTokenClaims">
          <h3>Access Token Claims</h3>
          <pre>{{ accessTokenClaims | json }}</pre>
        </div>
        <div class="card">
          <h3>Derived Roles</h3>
          <pre>{{ derivedRoles | json }}</pre>
        </div>
      </div>
      <p class="hint">Note: Roles may come from 'roles', 'groups', or custom 'extension_*' claims depending on your app setup.</p>
    </div>
  `,
  styles: [`
    .claims-container { padding: 1.5rem; }
    .meta { margin-bottom: 1rem; color: #555; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
    .card { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 1rem; }
    pre { white-space: pre-wrap; word-break: break-word; }
    h2, h3 { margin: 0 0 0.75rem; }
    .hint { margin-top: 1rem; font-size: 0.9rem; color: #666; }
  `]
})
export class TenantClaimsComponent implements OnInit {
  tenantId!: string;
  activeAccount: any = null;
  idTokenClaims: any = null;
  accessTokenClaims: any = null;
  derivedRoles: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private portalAuth: PortalTenantAuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.tenantId = this.route.snapshot.params['tenantId'];
    // Ensure MSAL instance for this tenant is initialized and handle any pending redirects
    const tenantConfig = await (this.portalAuth as any)['tenantService'].loadTenantConfig(this.tenantId);
    await this.portalAuth.ensureInitializedAndProcessRedirect(tenantConfig);

    const msal = this.portalAuth.getTenantMsalInstance(this.tenantId);
    if (!msal) return;
    this.activeAccount = msal.getActiveAccount();

    // Try to read cached tokens from sessionStorage via MSAL cache keys
    const tokens = this.readCachedTokens();
    this.idTokenClaims = tokens.idToken;
    this.accessTokenClaims = tokens.accessToken;
    this.derivedRoles = this.deriveRoles(this.idTokenClaims, this.accessTokenClaims);
  }

  private readCachedTokens(): { idToken: any, accessToken: any } {
    const allKeys = Object.keys(sessionStorage);
    const idKey = allKeys.find(k => k.toLowerCase().includes('idtoken') || k.toLowerCase().includes('id_token'));
    const atKey = allKeys.find(k => k.toLowerCase().includes('accesstoken') || k.toLowerCase().includes('access_token'));
    const parse = (key?: string) => {
      if (!key) return null;
      try {
        const entryRaw = sessionStorage.getItem(key)!;
        const entry = JSON.parse(entryRaw);
        const jwt = (entry && (entry as any).secret) ? (entry as any).secret : entryRaw;
        const parts = (jwt || '').split('.');
        if (parts.length === 3) return JSON.parse(atob(parts[1]));
      } catch {}
      return null;
    };
    return { idToken: parse(idKey), accessToken: parse(atKey) };
  }

  private deriveRoles(id: any, at: any): string[] {
    const roles = new Set<string>();
    const pull = (obj: any) => {
      if (!obj) return;
      const maybe = [obj.roles, obj.groups, obj.extension_Role, obj.extension_roles, obj.custom_roles];
      maybe.forEach((v: any) => {
        if (Array.isArray(v)) v.forEach(r => roles.add(String(r)));
        else if (typeof v === 'string') roles.add(v);
      });
    };
    pull(id); pull(at);
    return Array.from(roles);
  }
}
