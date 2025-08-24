import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <div class="header-content">
          <h1>⚙️ Settings & Configuration</h1>
          <p>Manage platform settings and tenant configuration</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="loadSettings()" [disabled]="loading">
            🔄 Refresh
          </button>
          <button class="btn-danger" (click)="confirmResetSettings()" [disabled]="loading">
            🔄 Reset All
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Settings</h3>
        <p>{{error}}</p>
        <button class="btn-secondary" (click)="loadSettings()">Try Again</button>
      </div>

      <!-- Settings Content -->
      <div *ngIf="!loading && !error" class="settings-content">
        <!-- Category Navigation -->
        <div class="category-nav">
          <button 
            *ngFor="let category of categories"
            class="category-btn"
            [class.active]="selectedCategory === category.name"
            (click)="selectCategory(category.name)">
            <span class="category-icon">{{getCategoryIcon(category.name)}}</span>
            <span class="category-info">
              <strong>{{category.name}}</strong>
              <small>{{category.settingCount}} settings</small>
            </span>
          </button>
        </div>

        <!-- Settings List -->
        <div class="settings-list">
          <div class="settings-header">
            <h3>{{selectedCategory}} Settings</h3>
            <p>{{getCategoryDescription(selectedCategory)}}</p>
          </div>

          <div class="settings-grid">
            <div 
              *ngFor="let setting of filteredSettings" 
              class="setting-card"
              [class.read-only]="setting.isReadOnly">
              
              <div class="setting-header">
                <div class="setting-title">
                  <h4>{{setting.displayName}}</h4>
                  <span *ngIf="setting.isReadOnly" class="readonly-badge">Read Only</span>
                  <span *ngIf="setting.isEncrypted" class="encrypted-badge">🔒</span>
                </div>
                <div class="setting-actions" *ngIf="!setting.isReadOnly">
                  <button 
                    class="btn-icon"
                    (click)="resetSingleSetting(setting)"
                    title="Reset to default">
                    🔄
                  </button>
                </div>
              </div>

              <p class="setting-description">{{setting.description}}</p>

              <div class="setting-control">
                <!-- Boolean Settings -->
                <div *ngIf="setting.type === 'boolean'" class="boolean-control">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      [checked]="setting.value === 'true'"
                      [disabled]="setting.isReadOnly || savingSettings.has(setting.key)"
                      (change)="updateBooleanSetting(setting, $event)">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="toggle-label">
                    {{setting.value === 'true' ? 'Enabled' : 'Disabled'}}
                  </span>
                </div>

                <!-- Number Settings -->
                <div *ngIf="setting.type === 'number'" class="number-control">
                  <input 
                    type="number" 
                    [value]="setting.value"
                    [disabled]="setting.isReadOnly || savingSettings.has(setting.key)"
                    (blur)="updateSetting(setting, $event)"
                    class="setting-input">
                  <small *ngIf="setting.defaultValue" class="default-value">
                    Default: {{setting.defaultValue}}
                  </small>
                </div>

                <!-- String Settings -->
                <div *ngIf="setting.type === 'string'" class="string-control">
                  <input 
                    type="text" 
                    [value]="setting.value"
                    [disabled]="setting.isReadOnly || savingSettings.has(setting.key)"
                    (blur)="updateSetting(setting, $event)"
                    class="setting-input">
                  <small *ngIf="setting.defaultValue" class="default-value">
                    Default: {{setting.defaultValue}}
                  </small>
                </div>

                <!-- Select/Enum Settings -->
                <div *ngIf="setting.type === 'select' && setting.allowedValues" class="select-control">
                  <select 
                    [value]="setting.value"
                    [disabled]="setting.isReadOnly || savingSettings.has(setting.key)"
                    (change)="updateSetting(setting, $event)"
                    class="setting-select">
                    <option *ngFor="let value of setting.allowedValues" [value]="value">
                      {{value}}
                    </option>
                  </select>
                </div>

                <!-- JSON Settings -->
                <div *ngIf="setting.type === 'json'" class="json-control">
                  <textarea 
                    [value]="setting.value"
                    [disabled]="setting.isReadOnly || savingSettings.has(setting.key)"
                    (blur)="updateSetting(setting, $event)"
                    class="setting-textarea"
                    rows="4">
                  </textarea>
                  <small class="json-hint">Enter valid JSON</small>
                </div>
              </div>

              <div class="setting-meta">
                <small class="last-updated">
                  Last updated: {{formatDate(setting.updatedAt)}} by {{setting.updatedBy}}
                </small>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredSettings.length === 0" class="empty-state">
            <div class="empty-icon">⚙️</div>
            <h3>No Settings Found</h3>
            <p>No settings available for the {{selectedCategory}} category.</p>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="success-message">
        <div class="success-icon">✅</div>
        <span>{{successMessage}}</span>
        <button class="close-btn" (click)="successMessage = ''">×</button>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-content h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .header-content p {
      color: #7f8c8d;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-secondary, .btn-danger {
      background: #ecf0f1;
      color: #2c3e50;
      border: 1px solid #bdc3c7;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
      border-color: #c0392b;
    }

    .btn-secondary:hover {
      background: #d5dbdb;
    }

    .btn-danger:hover {
      background: #c0392b;
    }

    .btn-secondary:disabled, .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .loading-container, .error-container {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #ecf0f1;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .settings-content {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 2rem;
    }

    .category-nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .category-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
    }

    .category-btn:hover {
      border-color: #3498db;
      background: #f8fafc;
    }

    .category-btn.active {
      border-color: #3498db;
      background: #e3f2fd;
    }

    .category-icon {
      font-size: 1.5rem;
    }

    .category-info strong {
      display: block;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .category-info small {
      color: #7f8c8d;
    }

    .settings-list {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 2rem;
    }

    .settings-header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .settings-header h3 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .settings-header p {
      color: #7f8c8d;
      margin: 0;
    }

    .settings-grid {
      display: grid;
      gap: 1.5rem;
    }

    .setting-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .setting-card:hover {
      border-color: #3498db;
    }

    .setting-card.read-only {
      background: #f8f9fa;
      opacity: 0.8;
    }

    .setting-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .setting-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .setting-title h4 {
      color: #2c3e50;
      margin: 0;
      font-size: 1.1rem;
    }

    .readonly-badge, .encrypted-badge {
      background: #95a5a6;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .encrypted-badge {
      background: #f39c12;
    }

    .setting-description {
      color: #7f8c8d;
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
    }

    .setting-control {
      margin-bottom: 1rem;
    }

    .boolean-control {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background-color: #2196F3;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(26px);
    }

    .toggle-label {
      font-weight: 500;
      color: #2c3e50;
    }

    .setting-input, .setting-select, .setting-textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .setting-input:focus, .setting-select:focus, .setting-textarea:focus {
      outline: none;
      border-color: #3498db;
    }

    .default-value, .json-hint {
      color: #7f8c8d;
      font-size: 0.8rem;
      margin-top: 0.5rem;
      display: block;
    }

    .setting-meta {
      padding-top: 1rem;
      border-top: 1px solid #f0f0f0;
    }

    .last-updated {
      color: #95a5a6;
      font-size: 0.8rem;
    }

    .btn-icon {
      background: none;
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-icon:hover {
      background: #f0f0f0;
      transform: scale(1.1);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .success-message {
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: #27ae60;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
    }

    @media (max-width: 1024px) {
      .settings-content {
        grid-template-columns: 1fr;
      }
      
      .category-nav {
        flex-direction: row;
        overflow-x: auto;
        gap: 1rem;
      }
      
      .category-btn {
        min-width: 200px;
      }
    }

    @media (max-width: 768px) {
      .settings-container {
        padding: 1rem;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .category-nav {
        flex-direction: column;
      }
      
      .category-btn {
        min-width: auto;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  loading = true;
  error = '';
  successMessage = '';
  
  settings: any[] = [];
  categories: any[] = [];
  selectedCategory = 'Security';
  filteredSettings: any[] = [];
  
  savingSettings = new Set<string>();

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    this.error = '';

    forkJoin({
      settings: this.apiService.getSettings(),
      categories: this.apiService.getSettingCategories()
    }).subscribe({
      next: (result) => {
        this.settings = result.settings || [];
        this.categories = result.categories || [];
        
        if (this.categories.length > 0 && !this.categories.find(c => c.name === this.selectedCategory)) {
          this.selectedCategory = this.categories[0].name;
        }
        
        this.filterSettings();
        this.loading = false;
        
        console.log('Successfully loaded settings:', this.settings.length, 'settings,', this.categories.length, 'categories');
      },
      error: (error) => {
        this.error = this.apiService.handleError(error);
        this.loading = false;
        console.error('Failed to load settings:', error);
      }
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.filterSettings();
  }

  filterSettings() {
    this.filteredSettings = this.settings.filter(s => s.category === this.selectedCategory);
  }

  updateSetting(setting: any, event: any) {
    const newValue = event.target.value;
    if (newValue === setting.value) return; // No change

    this.savingSettings.add(setting.key);
    
    this.apiService.updateSetting(setting.key, { value: newValue }).subscribe({
      next: (updatedSetting) => {
        // Update the setting in our local array
        const index = this.settings.findIndex(s => s.key === setting.key);
        if (index !== -1) {
          this.settings[index] = updatedSetting;
          this.filterSettings();
        }
        
        this.savingSettings.delete(setting.key);
        this.showSuccess(`Updated ${setting.displayName}`);
        
        console.log('Successfully updated setting:', setting.key);
      },
      error: (error) => {
        this.savingSettings.delete(setting.key);
        console.error('Failed to update setting:', error);
        // Revert the UI value
        event.target.value = setting.value;
      }
    });
  }

  updateBooleanSetting(setting: any, event: any) {
    const newValue = event.target.checked ? 'true' : 'false';
    
    this.savingSettings.add(setting.key);
    
    this.apiService.updateSetting(setting.key, { value: newValue }).subscribe({
      next: (updatedSetting) => {
        // Update the setting in our local array
        const index = this.settings.findIndex(s => s.key === setting.key);
        if (index !== -1) {
          this.settings[index] = updatedSetting;
          this.filterSettings();
        }
        
        this.savingSettings.delete(setting.key);
        this.showSuccess(`${setting.displayName} ${newValue === 'true' ? 'enabled' : 'disabled'}`);
        
        console.log('Successfully updated boolean setting:', setting.key, '=', newValue);
      },
      error: (error) => {
        this.savingSettings.delete(setting.key);
        console.error('Failed to update boolean setting:', error);
        // Revert the UI value
        event.target.checked = setting.value === 'true';
      }
    });
  }

  resetSingleSetting(setting: any) {
    if (!setting.defaultValue) return;
    
    this.savingSettings.add(setting.key);
    
    this.apiService.updateSetting(setting.key, { value: setting.defaultValue }).subscribe({
      next: (updatedSetting) => {
        // Update the setting in our local array
        const index = this.settings.findIndex(s => s.key === setting.key);
        if (index !== -1) {
          this.settings[index] = updatedSetting;
          this.filterSettings();
        }
        
        this.savingSettings.delete(setting.key);
        this.showSuccess(`Reset ${setting.displayName} to default`);
        
        console.log('Successfully reset setting:', setting.key);
      },
      error: (error) => {
        this.savingSettings.delete(setting.key);
        console.error('Failed to reset setting:', error);
      }
    });
  }

  confirmResetSettings() {
    if (confirm(`Are you sure you want to reset all ${this.selectedCategory} settings to their default values? This action cannot be undone.`)) {
      this.resetCategorySettings();
    }
  }

  resetCategorySettings() {
    this.loading = true;
    
    this.apiService.resetSettings(this.selectedCategory).subscribe({
      next: (result) => {
        this.showSuccess(`Reset ${result.resetCount} ${this.selectedCategory} settings`);
        this.loadSettings(); // Reload to get updated values
        
        console.log('Successfully reset category settings:', this.selectedCategory);
      },
      error: (error) => {
        this.loading = false;
        console.error('Failed to reset category settings:', error);
      }
    });
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Security': '🔒',
      'Notifications': '📧',
      'System': '⚙️',
      'General': '🏢',
      'Analytics': '📊',
      'Integration': '🔗',
      'Appearance': '🎨'
    };
    return icons[category] || '⚙️';
  }

  getCategoryDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      'Security': 'Authentication, authorization, and security policies',
      'Notifications': 'Email, SMS, and push notification settings',
      'System': 'Platform-wide configuration and limits',
      'General': 'Basic platform and organizational settings',
      'Analytics': 'Data collection and reporting preferences',
      'Integration': 'Third-party service and API configurations',
      'Appearance': 'UI themes, branding, and display options'
    };
    return descriptions[category] || 'Configuration settings for this category';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  showSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
} 