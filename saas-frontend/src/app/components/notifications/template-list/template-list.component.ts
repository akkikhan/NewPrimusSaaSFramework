import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { DialogService } from '../../../shared/services/dialog.service';

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  subject: string;
  content: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="template-list-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Notification Templates</h1>
          <p>Manage email, SMS, and notification templates for consistent messaging</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="createTemplate()">
            ➕ Create Template
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-bar">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="onSearch()"
            placeholder="Search templates by name or content..."
            class="search-input">
          <button class="search-btn" (click)="loadTemplates()">🔍</button>
        </div>
        <div class="filters">
          <select [(ngModel)]="typeFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Types</option>
            <option value="email">📧 Email</option>
            <option value="sms">📱 SMS</option>
            <option value="push">🔔 Push</option>
            <option value="webhook">🔗 Webhook</option>
          </select>
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-select">
            <option value="">All Status</option>
            <option value="Active">🟢 Active</option>
            <option value="Draft">📝 Draft</option>
            <option value="Archived">📦 Archived</option>
          </select>
        </div>
      </div>

      <!-- Templates Grid -->
      <div class="templates-grid">
        <div *ngFor="let template of templates" class="template-card">
          <div class="template-header">
            <div class="template-type">
              <span class="type-icon">{{getTypeIcon(template.type)}}</span>
              <span class="type-text">{{template.type | titlecase}}</span>
            </div>
            <div class="template-status">
              <span class="status-badge" [class]="'status-' + template.status.toLowerCase()">
                {{template.status}}
              </span>
            </div>
          </div>

          <div class="template-content">
            <h3 class="template-name">{{template.name}}</h3>
            <p class="template-description">{{template.description}}</p>
            
            <div class="template-preview">
              <div class="preview-subject" *ngIf="template.subject">
                <strong>Subject:</strong> {{template.subject}}
              </div>
              <div class="preview-body">
                <strong>Content:</strong>
                <div class="content-preview">{{getPreviewContent(template.content)}}</div>
              </div>
            </div>

            <div class="template-metadata">
              <div class="metadata-item">
                <span class="metadata-label">Created:</span>
                <span class="metadata-value">{{formatDate(template.createdAt)}}</span>
              </div>
              <div class="metadata-item">
                <span class="metadata-label">Last Used:</span>
                <span class="metadata-value">{{formatDate(template.lastUsedAt) || 'Never'}}</span>
              </div>
              <div class="metadata-item">
                <span class="metadata-label">Usage Count:</span>
                <span class="metadata-value">{{template.usageCount}} times</span>
              </div>
            </div>
          </div>

          <div class="template-actions">
            <button class="btn-icon" (click)="previewTemplateModal(template)" title="Preview">
              👁️ Preview
            </button>
            <button class="btn-icon" (click)="editTemplate(template)" title="Edit">
              ✏️ Edit
            </button>
            <button class="btn-icon" (click)="duplicateTemplate(template)" title="Duplicate">
              📋 Duplicate
            </button>
            <button class="btn-icon" (click)="testTemplateModal(template)" title="Test Send">
              🧪 Test
            </button>
            <button class="btn-icon delete" (click)="confirmDelete(template)" title="Delete">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="templates.length === 0" class="empty-state">
          <div class="empty-icon">📄</div>
          <h3>No Templates Found</h3>
          <p>{{searchTerm ? 'No templates match your search criteria.' : 'Create your first template to get started.'}}</p>
          <button class="btn-primary" (click)="createTemplate()">Create Template</button>
        </div>
      </div>

      <!-- Template Creation/Edit Modal -->
      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{editingTemplate ? 'Edit Template' : 'Create New Template'}}</h3>
            <button class="modal-close" (click)="closeModal()">×</button>
          </div>
          
          <form (ngSubmit)="saveTemplate()" #templateForm="ngForm" class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label for="templateName">Template Name *</label>
                <input 
                  type="text" 
                  id="templateName"
                  [(ngModel)]="currentTemplate.name"
                  name="templateName"
                  required
                  class="form-input"
                  placeholder="Enter template name">
              </div>

              <div class="form-group">
                <label for="templateType">Type *</label>
                <select 
                  id="templateType"
                  [(ngModel)]="currentTemplate.type"
                  name="templateType"
                  required
                  class="form-select">
                  <option value="email">📧 Email</option>
                  <option value="sms">📱 SMS</option>
                  <option value="push">🔔 Push Notification</option>
                  <option value="webhook">🔗 Webhook</option>
                </select>
              </div>

              <div class="form-group full-width">
                <label for="templateDescription">Description</label>
                <input 
                  type="text" 
                  id="templateDescription"
                  [(ngModel)]="currentTemplate.description"
                  name="templateDescription"
                  class="form-input"
                  placeholder="Brief description of the template">
              </div>

              <div class="form-group full-width" *ngIf="currentTemplate.type === 'email'">
                <label for="templateSubject">Email Subject *</label>
                <input 
                  type="text" 
                  id="templateSubject"
                  [(ngModel)]="currentTemplate.subject"
                  name="templateSubject"
                  class="form-input"
                  placeholder="Email subject line">
              </div>

              <div class="form-group full-width">
                <label for="templateContent">Content *</label>
                <textarea 
                  id="templateContent"
                  [(ngModel)]="currentTemplate.content"
                  name="templateContent"
                  required
                  rows="8"
                  class="form-textarea"
                  placeholder="Template content with variables like: name, company, date"></textarea>
                <div class="variables-help">
                  <strong>Available Variables:</strong>
                  <span class="variable-tag" *ngFor="let variable of availableVariables">{{variable}}</span>
                </div>
              </div>

              <div class="form-group">
                <label for="templateStatus">Status</label>
                <select 
                  id="templateStatus"
                  [(ngModel)]="currentTemplate.status"
                  name="templateStatus"
                  class="form-select">
                  <option value="Active">🟢 Active</option>
                  <option value="Draft">📝 Draft</option>
                  <option value="Archived">📦 Archived</option>
                </select>
              </div>
            </div>
          </form>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="saveTemplate()" [disabled]="!templateForm?.valid || saving">
              {{saving ? '💾 Saving...' : (editingTemplate ? '💾 Update' : '🚀 Create')}}
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Modal -->
      <div *ngIf="showPreview" class="modal-overlay" (click)="closePreview()">
        <div class="preview-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Template Preview: {{currentPreviewTemplate?.name}}</h3>
            <button class="modal-close" (click)="closePreview()">×</button>
          </div>
          
          <div class="preview-content">
            <div class="preview-metadata">
              <div class="metadata-row">
                <strong>Type:</strong> {{currentPreviewTemplate?.type | titlecase}}
              </div>
              <div class="metadata-row" *ngIf="currentPreviewTemplate?.subject">
                <strong>Subject:</strong> {{currentPreviewTemplate?.subject}}
              </div>
            </div>
            
            <div class="preview-body">
              <strong>Content:</strong>
              <div class="content-display">{{currentPreviewTemplate?.content}}</div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="closePreview()">Close</button>
            <button class="btn-primary" (click)="testFromPreview()">🧪 Send Test</button>
          </div>
        </div>
      </div>

      <!-- Test Modal -->
      <div *ngIf="showTestModal" class="modal-overlay" (click)="closeTestModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Test Template: {{currentTestTemplate?.name}}</h3>
            <button class="modal-close" (click)="closeTestModal()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label for="testRecipient">Test Recipient *</label>
              <input 
                type="text" 
                id="testRecipient"
                [(ngModel)]="testRecipient"
                class="form-input"
                [placeholder]="getTestPlaceholder(currentTestTemplate?.type || 'email')"
                required>
            </div>
            
            <div class="test-variables">
              <h4>Test Variables</h4>
              <div class="variables-grid">
                <div class="form-group" *ngFor="let variable of testVariables">
                  <label>{{variable.name}}</label>
                  <input 
                    type="text" 
                    [(ngModel)]="variable.value"
                    class="form-input"
                    [placeholder]="variable.placeholder">
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeTestModal()">Cancel</button>
            <button class="btn-primary" (click)="sendTest()" [disabled]="!testRecipient || testing">
              {{testing ? '📤 Sending...' : '📤 Send Test'}}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .template-list-container {
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

    .search-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      margin-bottom: 2rem;
    }

    .search-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
    }

    .search-btn {
      background: #2196f3;
      color: white;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .filters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .template-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .template-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      border-color: #2196f3;
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .template-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .type-icon {
      font-size: 1.2rem;
    }

    .type-text {
      font-weight: 500;
      color: #2c3e50;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-active {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-draft {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-archived {
      background: #f5f5f5;
      color: #757575;
    }

    .template-content {
      padding: 1.5rem;
    }

    .template-name {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
    }

    .template-description {
      color: #7f8c8d;
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
    }

    .template-preview {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .preview-subject {
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .preview-body {
      font-size: 0.9rem;
    }

    .content-preview {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 0.75rem;
      margin-top: 0.25rem;
      font-family: monospace;
      font-size: 0.85rem;
      color: #2c3e50;
      white-space: pre-wrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .template-metadata {
      display: grid;
      gap: 0.25rem;
      font-size: 0.85rem;
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
    }

    .metadata-label {
      color: #7f8c8d;
    }

    .metadata-value {
      color: #2c3e50;
      font-weight: 500;
    }

    .template-actions {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .btn-icon {
      background: none;
      border: 1px solid #ddd;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.3s ease;
    }

    .btn-icon:hover {
      background: #f0f0f0;
      transform: translateY(-1px);
    }

    .btn-icon.delete:hover {
      background: #ffebee;
      border-color: #e74c3c;
      color: #e74c3c;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content, .preview-modal {
      background: white;
      border-radius: 12px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      color: #2c3e50;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-input, .form-select, .form-textarea {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .variables-help {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #7f8c8d;
    }

    .variable-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin: 0 0.25rem;
      font-family: monospace;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      border: none;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976d2;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      background: #bbb;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .preview-content {
      padding: 1.5rem;
    }

    .preview-metadata {
      margin-bottom: 1.5rem;
    }

    .metadata-row {
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .content-display {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 0.5rem;
      white-space: pre-wrap;
      font-family: system-ui;
      line-height: 1.5;
    }

    .test-variables {
      margin-top: 1.5rem;
    }

    .test-variables h4 {
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    .variables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .template-list-container {
        padding: 1rem;
      }
      
      .templates-grid {
        grid-template-columns: 1fr;
      }
      
      .template-actions {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .btn-icon {
        flex: 1;
        text-align: center;
      }
    }
  `]
})
export class TemplateListComponent implements OnInit {
  searchTerm = '';
  typeFilter = '';
  statusFilter = '';
  showModal = false;
  showPreview = false;
  showTestModal = false;
  editingTemplate = false;
  saving = false;
  testing = false;
  loading = false;

  templates: Template[] = [
    {
      id: 'tpl-1',
      name: 'Welcome Email',
      description: 'Welcome new users to the platform',
      type: 'email',
      status: 'Active',
      subject: 'Welcome to {{company}}!',
      content: 'Hi {{name}},\n\nWelcome to {{company}}! We\'re excited to have you on board.\n\nGet started by logging into your account and exploring our features.\n\nBest regards,\nThe {{company}} Team',
      createdAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(),
      lastUsedAt: new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)).toISOString(),
      usageCount: 45
    },
    {
      id: 'tpl-2',
      name: 'Password Reset SMS',
      description: 'SMS for password reset requests',
      type: 'sms',
      status: 'Active',
      subject: '',
      content: 'Your {{company}} password reset code is: {{code}}. Valid for 10 minutes.',
      createdAt: new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)).toISOString(),
      lastUsedAt: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(),
      usageCount: 123
    },
    {
      id: 'tpl-3',
      name: 'System Alert',
      description: 'Push notification for system alerts',
      type: 'push',
      status: 'Active',
      subject: '',
      content: 'System Alert: {{message}}',
      createdAt: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString(),
      lastUsedAt: null,
      usageCount: 0
    }
  ];

  currentTemplate: Partial<Template> = {
    name: '',
    description: '',
    type: 'email',
    status: 'Active',
    subject: '',
    content: ''
  };

  currentPreviewTemplate: Template | null = null;
  currentTestTemplate: Template | null = null;
  testRecipient = '';
  testVariables = [
    { name: 'name', value: 'John Doe', placeholder: 'User name' },
    { name: 'company', value: 'Acme Corp', placeholder: 'Company name' },
    { name: 'code', value: '123456', placeholder: 'Verification code' },
    { name: 'date', value: new Date().toLocaleDateString(), placeholder: 'Current date' }
  ];

  availableVariables = ['{{name}}', '{{email}}', '{{company}}', '{{date}}', '{{code}}', '{{url}}'];

  constructor(
    private apiService: ApiService,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading = true;
    
    this.apiService.getNotificationTemplates(this.typeFilter, this.statusFilter).subscribe({
      next: (templates) => {
        this.templates = templates || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.loadTemplates();
  }

  onFilterChange() {
    this.loadTemplates();
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'email': return '📧';
      case 'sms': return '📱';
      case 'push': return '🔔';
      case 'webhook': return '🔗';
      default: return '📄';
    }
  }

  getPreviewContent(content: string): string {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }

  createTemplate() {
    this.editingTemplate = false;
    this.currentTemplate = {
      name: '',
      description: '',
      type: 'email',
      status: 'Active',
      subject: '',
      content: ''
    };
    this.showModal = true;
  }

  editTemplate(template: Template) {
    this.editingTemplate = true;
    this.currentTemplate = { ...template };
    this.showModal = true;
  }

  duplicateTemplate(template: Template) {
    this.editingTemplate = false;
    this.currentTemplate = {
      ...template,
      name: template.name + ' (Copy)',
      id: undefined
    };
    this.showModal = true;
  }

  previewTemplateModal(template: Template) {
    this.currentPreviewTemplate = template;
    this.showPreview = true;
  }

  testTemplateModal(template: Template) {
    this.currentTestTemplate = template;
    this.testRecipient = '';
    this.showTestModal = true;
  }

  confirmDelete(template: Template) {
    this.dialogService.confirm(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        this.deleteTemplate(template);
      }
    });
  }

  deleteTemplate(template: Template) {
    this.apiService.deleteNotificationTemplate(template.id).subscribe({
      next: () => {
        this.templates = this.templates.filter(t => t.id !== template.id);
        this.dialogService.success(
          'Template Deleted',
          `"${template.name}" has been deleted successfully.`
        );
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        this.dialogService.error(
          'Error',
          'Failed to delete template. Please try again.'
        );
      }
    });
  }

  saveTemplate() {
    this.saving = true;

    const templateData = {
      name: this.currentTemplate.name,
      description: this.currentTemplate.description,
      type: this.currentTemplate.type,
      status: this.currentTemplate.status,
      subject: this.currentTemplate.subject,
      content: this.currentTemplate.content
    };

    const apiCall = this.editingTemplate && this.currentTemplate.id ?
      this.apiService.updateNotificationTemplate(this.currentTemplate.id, templateData) :
      this.apiService.createNotificationTemplate(templateData);

    apiCall.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.loadTemplates(); // Reload templates
        
        this.dialogService.success(
          'Template Saved',
          `Template "${this.currentTemplate.name}" has been ${this.editingTemplate ? 'updated' : 'created'} successfully.`
        );
      },
      error: (error) => {
        this.saving = false;
        console.error('Error saving template:', error);
        this.dialogService.error(
          'Error',
          'Failed to save template. Please try again.'
        );
      }
    });
  }

  getTestPlaceholder(type: string): string {
    switch (type) {
      case 'email': return 'test@example.com';
      case 'sms': return '+1234567890';
      case 'push': return 'user123';
      default: return 'recipient';
    }
  }

  sendTest() {
    this.testing = true;

    if (!this.currentTestTemplate) {
      this.testing = false;
      return;
    }

    const testData = {
      recipient: this.testRecipient,
      variables: this.testVariables.reduce((acc, v) => {
        acc[v.name] = v.value;
        return acc;
      }, {} as any)
    };

    this.apiService.testNotificationTemplate(this.currentTestTemplate.id, testData).subscribe({
      next: () => {
        this.testing = false;
        this.closeTestModal();
        
        this.dialogService.success(
          'Test Sent',
          `Test ${this.currentTestTemplate?.type} has been sent to ${this.testRecipient}.`
        );
      },
      error: (error) => {
        this.testing = false;
        console.error('Error sending test:', error);
        this.dialogService.error(
          'Error',
          'Failed to send test. Please try again.'
        );
      }
    });
  }

  testFromPreview() {
    this.closePreview();
    if (this.currentPreviewTemplate) {
      this.testTemplateModal(this.currentPreviewTemplate);
    }
  }

  closeModal() {
    this.showModal = false;
    this.saving = false;
  }

  closePreview() {
    this.showPreview = false;
    this.currentPreviewTemplate = null;
  }

  closeTestModal() {
    this.showTestModal = false;
    this.currentTestTemplate = null;
    this.testRecipient = '';
    this.testing = false;
  }
} 