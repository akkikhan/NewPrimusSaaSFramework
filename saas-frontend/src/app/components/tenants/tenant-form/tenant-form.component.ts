import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';

interface ModuleCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  features: string[];
  isSelected?: boolean;
  isActive?: boolean;
}

interface TenantFormData {
  name: string;
  domain: string;
  plan: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  status: string;
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  selectedModules: string[];
}

interface ProvisioningResult {
  tenant?: {
    id?: string;
    name?: string;
    domain?: string;
    plan?: string;
  };
  apiKey?: {
    key?: string;
    keyId?: string;
    permissions?: string[];
  };
  adminUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    status?: string;
  };
  loginUrl?: string;
  apiEndpoint?: string;
  welcomeEmailSent?: boolean;
  welcomeEmailId?: string;
}

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.css']
})
export class TenantFormComponent implements OnInit, OnDestroy {

  // Injected services using inject() pattern
  private apiService = inject(ApiService);
  private dialogService = inject(DialogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Component state properties
  loading = false;
  error: string | null = null;
  isEditMode = false;
  tenantId: string | null = null;
  submitted = false;
  currentStep = 1;
  saving = false;

  // Module catalog and selection
  modules: ModuleCatalogItem[] = [];
  filteredModules: ModuleCatalogItem[] = [];
  selectedModules: ModuleCatalogItem[] = [];
  activeCategory: string = 'all';
  selectedCategory: string = 'all';
  totalPrice = 0;
  modulesLoading = false;
  modulesError: string | null = null;
  
  // Success state
  provisioningResult: ProvisioningResult | null = null;
  apiKeyHidden = true;
  apiKeyCopied = false;

  // Form data
  tenant: TenantFormData = {
    name: '',
    domain: '',
    plan: 'basic',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    status: 'active',
    adminUser: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'Admin'
    },
    selectedModules: []
  };

  categories = [
    { id: 'all', name: 'All Modules', count: 0 },
    { id: 'core', name: 'Core Services', count: 0 },
    { id: 'analytics', name: 'Analytics', count: 0 },
    { id: 'communication', name: 'Communication', count: 0 },
    { id: 'integration', name: 'Integration', count: 0 },
    { id: 'security', name: 'Security', count: 0 },
    { id: 'ai', name: 'AI & ML', count: 0 }
  ];

  async ngOnInit(): Promise<void> {
    this.tenantId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.tenantId;
    
    await this.loadModules();
    
    if (this.isEditMode && this.tenantId) {
      await this.loadTenant(this.tenantId);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  async loadModules(): Promise<void> {
    try {
      this.modulesLoading = true;
      this.modulesError = null;
      
      // Using a placeholder method - will need to be implemented in ApiService
      const response = await fetch('/api/v2/tenants/modules/catalog');
      const data = await response.json();
      
      // API returns data in data.data array, not data.modules
      this.modules = data.data || [];
      this.filteredModules = [...this.modules];
      this.updateCategoryCounts();
      
    } catch (error: any) {
      this.modulesError = 'Failed to load modules: ' + (error.message || 'Unknown error');
      console.error('Error loading modules:', error);
    } finally {
      this.modulesLoading = false;
    }
  }

  async loadTenant(tenantId: string): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      
      // Placeholder implementation
      const response = await fetch(`/api/v2/tenants/${tenantId}`);
      const data = await response.json();
      
      if (data.tenant) {
        this.tenant = { ...this.tenant, ...data.tenant };
        this.selectedModules = this.modules.filter(m => 
          data.tenant.selectedModules?.includes(m.id)
        );
        this.calculateTotalPrice();
      }
      
    } catch (error: any) {
      this.error = 'Failed to load tenant: ' + (error.message || 'Unknown error');
      console.error('Error loading tenant:', error);
    } finally {
      this.loading = false;
    }
  }

  updateCategoryCounts(): void {
    this.categories.forEach(category => {
      if (category.id === 'all') {
        category.count = this.modules.length;
      } else {
        category.count = this.modules.filter(m => m.category === category.id).length;
      }
    });
  }

  filterByCategory(categoryId: string): void {
    this.activeCategory = categoryId;
    if (categoryId === 'all') {
      this.filteredModules = [...this.modules];
    } else {
      this.filteredModules = this.modules.filter(m => m.category === categoryId);
    }
  }

  toggleModule(module: ModuleCatalogItem): void {
    const index = this.selectedModules.findIndex(m => m.id === module.id);
    if (index >= 0) {
      this.selectedModules.splice(index, 1);
      module.isSelected = false;
    } else {
      this.selectedModules.push({ ...module, isSelected: true });
      module.isSelected = true;
    }
    this.calculateTotalPrice();
  }

  isModuleSelected(moduleId: string): boolean {
    return this.selectedModules.some(m => m.id === moduleId);
  }

  calculateTotalPrice(): void {
    this.totalPrice = this.selectedModules.reduce((total, module) => total + module.price, 0);
  }

  // Form validation methods
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]$/;
    return domainRegex.test(domain);
  }

  onDomainChange(): void {
    // Real-time domain validation feedback
    if (this.tenant.domain && !this.isValidDomain(this.tenant.domain)) {
      console.log('Invalid domain format');
    }
  }

  // Step navigation
  nextStep(): void {
    if (this.currentStep < 5) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    this.currentStep = step;
  }

  // Form submission
  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    if (!this.isFormValid()) {
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    try {
      this.loading = true;
      this.error = null;
      
      const formData = {
        ...this.tenant,
        selectedModules: this.selectedModules.map(m => m.id),
        totalPrice: this.totalPrice
      };

      let response;
      if (this.isEditMode && this.tenantId) {
        response = await fetch(`/api/v2/tenants/${this.tenantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        response = await fetch('/api/v2/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const result = await response.json();
      
      if (response.ok) {
        this.provisioningResult = result;
        this.currentStep = 5; // Go to success step
      } else {
        throw new Error(result.message || 'Failed to save tenant');
      }
      
    } catch (error: any) {
      this.error = 'Failed to save tenant: ' + (error.message || 'Unknown error');
      console.error('Error saving tenant:', error);
    } finally {
      this.loading = false;
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.tenant.name?.trim() &&
      this.tenant.domain?.trim() &&
      this.isValidDomain(this.tenant.domain) &&
      this.tenant.adminUser.firstName?.trim() &&
      this.tenant.adminUser.lastName?.trim() &&
      this.tenant.adminUser.email?.trim() &&
      this.isValidEmail(this.tenant.adminUser.email) &&
      this.selectedModules.length > 0
    );
  }

  // API Key management
  toggleApiKey(): void {
    this.apiKeyHidden = !this.apiKeyHidden;
  }

  async copyApiKey(): Promise<void> {
    if (this.provisioningResult?.apiKey?.key) {
      try {
        await navigator.clipboard.writeText(this.provisioningResult.apiKey.key);
        this.apiKeyCopied = true;
        setTimeout(() => this.apiKeyCopied = false, 2000);
      } catch (error) {
        console.error('Failed to copy API key:', error);
      }
    }
  }

  // Navigation actions
  createAnother(): void {
    this.resetForm();
    this.currentStep = 1;
    this.provisioningResult = null;
  }

  private resetForm(): void {
    this.tenant = {
      name: '',
      domain: '',
      plan: 'basic',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      status: 'active',
      adminUser: {
        firstName: '',
        lastName: '',
        email: '',
        role: 'Admin'
      },
      selectedModules: []
    };
    
    this.selectedModules = [];
    this.modules.forEach(m => m.isSelected = false);
    this.calculateTotalPrice();
    this.submitted = false;
    this.error = null;
  }

  // Template helper methods
  getSelectedModulesCount(): number {
    return this.selectedModules.length;
  }

  getCategoryDisplayName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }

  // Methods needed by template
  getUniqueCategories(): string[] {
    const categories = [...new Set(this.modules.map(m => m.category))];
    return ['all', ...categories];
  }

  setSelectedCategory(category: string): void {
    this.selectedCategory = category;
    this.activeCategory = category;
    this.updateFilteredModules();
  }

  getFilteredModules(): ModuleCatalogItem[] {
    return this.filteredModules;
  }

  selectAllModules(): void {
    const filtered = this.getFilteredModules();
    filtered.forEach(module => {
      if (!this.selectedModules.find(m => m.id === module.id)) {
        this.toggleModule(module);
      }
    });
  }

  clearAllModules(): void {
    this.selectedModules = [];
    this.modules.forEach(m => m.isSelected = false);
    this.calculateTotalPrice();
    this.tenant.selectedModules = [];
  }

  private updateFilteredModules(): void {
    if (this.activeCategory === 'all') {
      this.filteredModules = [...this.modules];
    } else {
      this.filteredModules = this.modules.filter(m => m.category === this.activeCategory);
    }
  }
}