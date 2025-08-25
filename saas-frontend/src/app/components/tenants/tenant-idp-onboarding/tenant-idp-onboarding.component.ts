import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IdPConfigurationService, OnboardingRequest } from '../../../services/idp-configuration.service';
import { ApiService, IntegrationLink } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { SharedEventsService } from '../../../shared/services/events.service';

interface IdPProvider {
  type: string;
  name: string;
  icon: string;
  description: string;
  status: string;
  features: string[];
  setupComplexity: string;
  estimatedSetupTime: string;
}

@Component({
  selector: 'app-tenant-idp-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tenant-idp-onboarding.component.html',
  styleUrls: ['./tenant-idp-onboarding.component.scss']
})
export class TenantIdpOnboardingComponent implements OnInit {
  onboardingForm!: FormGroup;
  currentStep = 1;
  totalSteps = 5; // 1) Company → 2) Select modules → 3) Configure modules → 4) Review → 5) Provision & enable
  isSubmitting = false;
  showIntegrationGuide = false;
  integrationGuide = '';
  loadingLinks = false;
  linksError: string | null = null;
  
  availableProviders: IdPProvider[] = [];
  selectedProvider: IdPProvider | null = null;
  // Module selection
  availableModules: { id: string; name: string; description?: string }[] = [];
  selectedModules = new Set<string>();
  // Integration links by module after success
  moduleIntegrationLinks: Record<string, Array<{ title: string; url: string; description?: string }>> = {};
  
  onboardingResult: any = null;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private idpService: IdPConfigurationService,
    private api: ApiService,
  private dialogService: DialogService,
  private events: SharedEventsService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadProviders();
  this.loadModules();
  }

  initializeForm() {
    this.onboardingForm = this.fb.group({
      // Company Information
      companyName: ['', [Validators.required, Validators.minLength(3)]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminName: ['', [Validators.required]],
      
      // IdP Selection (only required if 'auth' module is selected)
      idPType: [''],
      
      // IdP Configuration
      tenantId: [''],
      clientId: [''],
      domain: [''],
      // Module Selection
      selectedModules: [[] as string[]],
      
      // Preferences
      preferredLanguages: [['csharp']]
    });

  // Update validation based on provider selection
  this.onboardingForm.get('idPType')?.valueChanges.subscribe((type: string) => {
      this.updateProviderValidation(type);
    });
    // Update validations based on module selection (auth-specific fields only when auth selected)
    this.onboardingForm.get('selectedModules')?.valueChanges.subscribe((mods: string[]) => {
      const hasAuth = Array.isArray(mods) && mods.includes('auth');
      if (!hasAuth) {
        // Clear IdP fields if auth not selected
        this.onboardingForm.patchValue({ idPType: '', tenantId: '', clientId: '', domain: '' });
      }
      this.updateAuthFieldValidators(hasAuth);
    });
  }

  loadProviders() {
    this.idpService.getAvailableProviders().subscribe({
      next: (providers: IdPProvider[]) => {
        this.availableProviders = providers;
      },
      error: (error: any) => {
        console.error('Failed to load providers:', error);
      }
    });
  }

  loadModules() {
    console.log('Loading modules...');
    this.api.getAvailableModules().subscribe({
      next: (mods: any[]) => {
        console.log('Received modules data:', mods);
        // Expecting array of { id, name, description }
        this.availableModules = Array.isArray(mods) ? mods : [];
        console.log('Available modules set to:', this.availableModules);
      },
      error: (err: any) => {
        console.error('Failed to load module catalog:', err);
      }
    });
  }

  updateProviderValidation(providerType: string) {
    const provider = this.availableProviders.find(p => p.type === providerType);
    this.selectedProvider = provider || null;
    // For initial onboarding, keep IdP fields optional; idPType required only if 'auth' module selected
    const hasAuth = this.selectedModules.has('auth') || (this.onboardingForm.get('selectedModules')?.value as string[] || []).includes('auth');
    this.updateAuthFieldValidators(hasAuth);
  }

  private updateAuthFieldValidators(hasAuth: boolean) {
    const idPTypeCtrl = this.onboardingForm.get('idPType');
    const tenantIdCtrl = this.onboardingForm.get('tenantId');
    const domainCtrl = this.onboardingForm.get('domain');
    if (hasAuth) {
      idPTypeCtrl?.setValidators([Validators.required]);
    } else {
      idPTypeCtrl?.clearValidators();
    }
    // Keep tenantId/domain optional for now; providers might require later
    tenantIdCtrl?.clearValidators();
    domainCtrl?.clearValidators();
    idPTypeCtrl?.updateValueAndValidity();
    tenantIdCtrl?.updateValueAndValidity();
    domainCtrl?.updateValueAndValidity();
  }

  // Module selection helpers
  toggleModule(moduleId: string) {
    if (this.selectedModules.has(moduleId)) {
      this.selectedModules.delete(moduleId);
    } else {
      this.selectedModules.add(moduleId);
    }
    this.onboardingForm.patchValue({ selectedModules: Array.from(this.selectedModules) });
  }

  isModuleSelected(moduleId: string): boolean {
    return this.selectedModules.has(moduleId);
  }

  getSelectedModuleCount(): number {
    return this.selectedModules.size;
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Guard: if moving past module config, ensure required fields when auth selected
      if (this.currentStep === 3) {
        const mods: string[] = this.onboardingForm.get('selectedModules')?.value || [];
        const hasAuth = mods.includes('auth');
        if (hasAuth && !this.onboardingForm.get('idPType')?.value) {
          this.dialogService.error('Missing Auth Provider', 'Please select an authentication provider.').subscribe();
          return;
        }
      }
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onSubmit() {
    if (this.onboardingForm.invalid) {
      Object.keys(this.onboardingForm.controls).forEach(key => {
        this.onboardingForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const formValue = this.onboardingForm.value;
    const request: OnboardingRequest = {
      Name: formValue.companyName,
      AdminEmail: formValue.adminEmail,
      AdminFirstName: formValue.adminName?.split(' ')[0] || formValue.adminName,
      AdminLastName: formValue.adminName?.split(' ').slice(1).join(' ') || '',
      Domain: formValue.domain || ''
    };

    this.idpService.onboardTenant(request).subscribe({
      next: (response: any) => {
        this.onboardingResult = response;
        this.isSubmitting = false;
        // Emit onboarding-complete event so lists/menus refresh
        try {
          this.events.emitOnboardingComplete({ tenant: response });
        } catch {}
        
        // If modules selected, enable them for the new tenant
        const tenantId = response?.tenantId;
        const selected = Array.from(this.selectedModules);
        if (tenantId && selected.length > 0) {
          const modulesMap: Record<string, boolean> = {};
          selected.forEach(id => modulesMap[id] = true);
          this.api.updateTenantModules(tenantId, modulesMap).subscribe({
            next: () => {
              // Optional: notify success
              this.dialogService.success('Modules Enabled', `${selected.length} module(s) enabled for ${tenantId}`).subscribe();
              // Fetch module-specific integration links for success screen
              this.fetchIntegrationLinksForModules(tenantId, selected);
            },
            error: (err: any) => {
              console.error('Failed to enable selected modules:', err);
              this.dialogService.error('Module Enable Failed', 'Tenant was onboarded, but enabling selected modules failed. You can enable them from Module Management.').subscribe();
              // Still attempt to fetch links for any that might be available
              this.fetchIntegrationLinksForModules(tenantId, selected);
            }
          });
        }
        
        // Load integration guide (IdP) for tenants choosing auth
        if ((formValue.selectedModules || []).includes('auth') && response.tenantId) {
          this.loadIntegrationGuide(response.tenantId);
        }
      },
      error: (error: any) => {
        this.error = error.message || 'Failed to onboard tenant';
        this.isSubmitting = false;
        this.dialogService.error('Onboarding Failed', this.error || 'Failed to onboard tenant').subscribe();
      }
    });
  }

  private fetchIntegrationLinksForModules(tenantId: string, selected: string[]) {
    this.loadingLinks = true;
    this.linksError = null;
    this.moduleIntegrationLinks = {};
    // Fetch links per module in sequence (simple approach)
    const fetchNext = (index: number) => {
      if (index >= selected.length) {
        this.loadingLinks = false;
        return;
      }
      const moduleId = selected[index];
      this.api.getModuleIntegrationLinks(tenantId, moduleId).subscribe({
        next: (links: IntegrationLink[]) => {
          this.moduleIntegrationLinks[moduleId] = Array.isArray(links) ? links : [];
          fetchNext(index + 1);
        },
        error: (err: any) => {
          console.warn(`Failed to load integration links for ${moduleId}:`, err);
          this.moduleIntegrationLinks[moduleId] = [];
          fetchNext(index + 1);
        }
      });
    };
    fetchNext(0);
  }

  get selectedModulesArray(): string[] {
    return Array.from(this.selectedModules);
  }

  loadIntegrationGuide(tenantId: string) {
    this.idpService.getIntegrationGuide(tenantId).subscribe({
      next: (guide: string) => {
        this.integrationGuide = guide;
      },
      error: (error: any) => {
        console.error('Failed to load integration guide:', error);
      }
    });
  }

  viewIntegrationGuide() {
    if (this.onboardingResult && this.onboardingResult.tenantId) {
      this.router.navigate(['/integration-guide', this.onboardingResult.tenantId]);
    }
  }

  downloadIntegrationGuide() {
    if (this.integrationGuide) {
      const blob = new Blob([this.integrationGuide], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.onboardingResult.tenantId}-integration-guide.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  onboardAnother() {
    this.onboardingResult = null;
    this.currentStep = 1;
    this.initializeForm();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.dialogService.success('Copied!', 'Text copied to clipboard').subscribe();
    });
  }
}
