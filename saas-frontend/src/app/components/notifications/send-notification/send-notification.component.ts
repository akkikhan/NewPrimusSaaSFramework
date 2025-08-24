import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-send-notification',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="send-notification-container">
      <div class="page-header">
        <div class="header-content">
          <h1>Send Notification</h1>
          <p>Send email, SMS, or webhook notifications to users and systems</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/notifications">
            ← Back to Notifications
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loadingTemplates" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading templates...</p>
      </div>

      <form (ngSubmit)="onSubmit()" #notificationForm="ngForm" class="notification-form" *ngIf="!loadingTemplates">
        <div class="form-section">
          <h3>Notification Type & Target</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="type">Notification Type *</label>
              <select 
                id="type" 
                [(ngModel)]="notification.type" 
                name="type" 
                required
                class="form-select"
                (change)="onTypeChange()">
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="webhook">🔗 Webhook</option>
                <option value="push">🔔 Push Notification</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="priority">Priority</label>
              <select id="priority" [(ngModel)]="notification.priority" name="priority" class="form-select">
                <option value="low">🟢 Low</option>
                <option value="normal">🟡 Normal</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>

            <div class="form-group" *ngIf="availableTemplates.length > 0">
              <label for="template">Use Template</label>
              <select id="template" [(ngModel)]="selectedTemplateId" name="template" class="form-select" (change)="onTemplateChange()">
                <option value="">Create from scratch</option>
                <option *ngFor="let template of getFilteredTemplates()" [value]="template.id">
                  {{template.name}} ({{template.type}})
                </option>
              </select>
              <small class="template-help" *ngIf="selectedTemplate">
                <strong>Template:</strong> {{selectedTemplate.description}}
              </small>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Recipients</h3>
          <div class="recipient-section">
            <div class="recipient-type-tabs">
              <button 
                type="button"
                class="tab-btn"
                [class.active]="recipientType === 'individual'"
                (click)="setRecipientType('individual')">
                Individual
              </button>
              <button 
                type="button"
                class="tab-btn"
                [class.active]="recipientType === 'group'"
                (click)="setRecipientType('group')">
                Group
              </button>
              <button 
                type="button"
                class="tab-btn"
                [class.active]="recipientType === 'multiple'"
                (click)="setRecipientType('multiple')">
                Multiple Recipients
              </button>
            </div>

            <div class="recipient-content">
              <div *ngIf="recipientType === 'individual'" class="form-group">
                <label for="recipient">{{getRecipientLabel()}} *</label>
                <input 
                  type="text" 
                  id="recipient" 
                  [(ngModel)]="singleRecipient" 
                  name="recipient" 
                  required
                  [placeholder]="getRecipientPlaceholder()"
                  class="form-input">
              </div>

              <div *ngIf="recipientType === 'group'" class="form-group">
                <label for="userGroup">User Group *</label>
                <select id="userGroup" [(ngModel)]="notification.userGroup" name="userGroup" class="form-select">
                  <option value="">Select Group</option>
                  <option value="administrators">Administrators</option>
                  <option value="managers">Managers</option>
                  <option value="users">All Users</option>
                  <option value="tenant-admins">Tenant Admins</option>
                </select>
              </div>

              <div *ngIf="recipientType === 'multiple'" class="form-group">
                <label for="multipleRecipients">{{getRecipientLabel()}} (one per line) *</label>
                <textarea 
                  id="multipleRecipients"
                  [(ngModel)]="multipleRecipientsText"
                  name="multipleRecipients"
                  rows="4"
                  class="form-textarea"
                  [placeholder]="getMultipleRecipientsPlaceholder()"></textarea>
                <small class="help-text">Enter one {{getRecipientLabel().toLowerCase()}} per line</small>
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Message Content</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label for="subject">Subject / Title *</label>
              <input 
                type="text" 
                id="subject" 
                [(ngModel)]="notification.subject" 
                name="subject" 
                required
                placeholder="Enter notification subject"
                class="form-input">
            </div>
            
            <div class="form-group full-width">
              <label for="message">Message Content *</label>
              <textarea 
                id="message" 
                [(ngModel)]="notification.message" 
                name="message" 
                rows="6" 
                required
                placeholder="Enter your message content here..."
                class="form-textarea"></textarea>
              <div class="character-count">{{notification.message.length}} characters</div>
              <div class="template-variables" *ngIf="selectedTemplate && selectedTemplate.variables.length > 0">
                <strong>Available Variables:</strong>
                <span *ngFor="let variable of selectedTemplate.variables" 
                      class="variable-tag" 
                      (click)="insertVariable(variable)">
                  {{variable}}
                </span>
              </div>
            </div>

            <div class="form-group" *ngIf="notification.type === 'email' && !selectedTemplate">
              <label for="emailTemplate">Email Layout</label>
              <select id="emailTemplate" [(ngModel)]="notification.emailTemplate" name="emailTemplate" class="form-select">
                <option value="basic">Basic Template</option>
                <option value="branded">Branded Template</option>
                <option value="newsletter">Newsletter Template</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section" *ngIf="notification.type === 'webhook'">
          <h3>Webhook Configuration</h3>
          <div class="form-grid">
            <div class="form-group full-width">
              <label for="webhookUrl">Webhook URL *</label>
              <input 
                type="url" 
                id="webhookUrl" 
                [(ngModel)]="notification.webhookUrl" 
                name="webhookUrl"
                placeholder="https://example.com/webhook"
                class="form-input">
            </div>
            <div class="form-group">
              <label for="method">HTTP Method</label>
              <select id="method" [(ngModel)]="notification.method" name="method" class="form-select">
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Delivery Options</h3>
          <div class="options-grid">
            <label class="option-item">
              <input type="checkbox" [(ngModel)]="notification.scheduleDelivery" name="scheduleDelivery">
              <span class="option-label">Schedule Delivery</span>
              <span class="option-description">Send at a specific date and time</span>
            </label>

            <label class="option-item" *ngIf="notification.type === 'email'">
              <input type="checkbox" [(ngModel)]="notification.trackOpens" name="trackOpens">
              <span class="option-label">Track Opens</span>
              <span class="option-description">Monitor when recipients open the email</span>
            </label>

            <label class="option-item">
              <input type="checkbox" [(ngModel)]="notification.requireConfirmation" name="requireConfirmation">
              <span class="option-label">Require Confirmation</span>
              <span class="option-description">Ask recipients to confirm receipt</span>
            </label>
          </div>

          <div *ngIf="notification.scheduleDelivery" class="schedule-section">
            <div class="form-grid">
              <div class="form-group">
                <label for="scheduleDate">Delivery Date</label>
                <input type="date" id="scheduleDate" [(ngModel)]="notification.scheduleDate" name="scheduleDate" class="form-input">
              </div>
              <div class="form-group">
                <label for="scheduleTime">Delivery Time</label>
                <input type="time" id="scheduleTime" [(ngModel)]="notification.scheduleTime" name="scheduleTime" class="form-input">
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" routerLink="/notifications">
            Cancel
          </button>
          <button type="button" class="btn-outline" (click)="previewNotification()" [disabled]="!isFormValid()">
            👁️ Preview
          </button>
          <button type="submit" class="btn-primary" [disabled]="!notificationForm.valid || sending || !isFormValid()">
            {{sending ? '📤 Sending...' : '📤 Send Notification'}}
          </button>
        </div>
      </form>

      <!-- Preview Modal -->
      <div *ngIf="showPreview" class="preview-modal" (click)="closePreview()">
        <div class="preview-content" (click)="$event.stopPropagation()">
          <div class="preview-header">
            <h3>Notification Preview</h3>
            <button class="close-btn" (click)="closePreview()">×</button>
          </div>
          <div class="preview-body">
            <div class="preview-field">
              <strong>Type:</strong> {{notification.type | titlecase}}
            </div>
            <div class="preview-field">
              <strong>Priority:</strong> {{notification.priority | titlecase}}
            </div>
            <div class="preview-field">
              <strong>Recipients ({{getRecipients().length}}):</strong>
              <div class="recipients-list">
                <span *ngFor="let recipient of getRecipients(); let i = index" class="recipient-tag">
                  {{recipient}}<span *ngIf="i < getRecipients().length - 1">,</span>
                </span>
              </div>
            </div>
            <div class="preview-field">
              <strong>Subject:</strong> {{notification.subject}}
            </div>
            <div class="preview-field">
              <strong>Message:</strong>
              <div class="message-preview">{{notification.message}}</div>
            </div>
            <div class="preview-field" *ngIf="selectedTemplate">
              <strong>Template:</strong> {{selectedTemplate.name}}
            </div>
          </div>
          <div class="preview-footer">
            <button class="btn-secondary" (click)="closePreview()">Close</button>
            <button class="btn-primary" (click)="sendFromPreview()">Send Now</button>
          </div>
        </div>
      </div>

      <!-- Success Modal -->
      <div *ngIf="showSuccess" class="modal-overlay" (click)="closeSuccess()">
        <div class="success-modal" (click)="$event.stopPropagation()">
          <div class="success-content">
            <div class="success-icon">✅</div>
            <h3>Notification Sent Successfully!</h3>
            <p>Your {{notification.type}} notification has been sent to {{getRecipients().length}} recipient(s).</p>
            <div class="success-details" *ngIf="lastSendResult">
              <div class="detail-item">
                <strong>Notification ID:</strong> {{lastSendResult.notificationId}}
              </div>
              <div class="detail-item">
                <strong>Status:</strong> {{lastSendResult.status}}
              </div>
              <div class="detail-item">
                <strong>Sent At:</strong> {{formatDate(lastSendResult.sentAt)}}
              </div>
            </div>
          </div>
          <div class="success-actions">
            <button class="btn-secondary" (click)="closeSuccess()">Close</button>
            <button class="btn-primary" routerLink="/notifications">View Notifications</button>
          </div>
        </div>
      </div>

             <!-- Error Toast -->
       <div *ngIf="errorMessage" class="error-toast">
        <div class="error-content">
          <span class="error-icon">❌</span>
          <span class="error-text">{{errorMessage}}</span>
          <button class="error-close" (click)="clearError()">×</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .send-notification-container {
      padding: 2rem;
      max-width: 1000px;
      margin: 0 auto;
      position: relative;
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

    .loading-container {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .notification-form {
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      padding: 2rem;
    }

    .form-section {
      margin-bottom: 2.5rem;
    }

    .form-section:last-child {
      margin-bottom: 0;
    }

    .form-section h3 {
      color: #2c3e50;
      margin: 0 0 1.5rem 0;
      font-size: 1.3rem;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 0.5rem;
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

    .template-help {
      color: #7f8c8d;
      font-style: italic;
      margin-top: 0.25rem;
    }

    .help-text {
      color: #7f8c8d;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .character-count {
      font-size: 0.85rem;
      color: #7f8c8d;
      margin-top: 0.25rem;
      text-align: right;
    }

    .template-variables {
      margin-top: 0.5rem;
      font-size: 0.85rem;
    }

    .variable-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin: 0.25rem 0.25rem 0 0;
      font-family: monospace;
      cursor: pointer;
      display: inline-block;
      transition: all 0.3s ease;
    }

    .variable-tag:hover {
      background: #1976d2;
      color: white;
    }

    .recipient-type-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .tab-btn {
      padding: 0.75rem 1.5rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .tab-btn.active {
      background: #2196f3;
      color: white;
      border-color: #2196f3;
    }

    .options-grid {
      display: grid;
      gap: 1rem;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .option-item:hover {
      border-color: #2196f3;
      background: #f8f9fa;
    }

    .option-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }

    .option-label {
      font-weight: 500;
      color: #2c3e50;
    }

    .option-description {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .schedule-section {
      margin-top: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    .btn-primary, .btn-secondary, .btn-outline {
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

    .btn-outline {
      background: white;
      color: #2196f3;
      border: 1px solid #2196f3;
    }

    .btn-outline:hover:not(:disabled) {
      background: #2196f3;
      color: white;
    }

    .btn-outline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .preview-modal, .modal-overlay {
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

    .preview-content, .success-modal {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .close-btn {
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

    .preview-body {
      padding: 1.5rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .preview-field {
      margin-bottom: 1rem;
    }

    .recipients-list {
      margin-top: 0.5rem;
    }

    .recipient-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-right: 0.25rem;
      font-size: 0.85rem;
    }

    .message-preview {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 0.5rem;
      white-space: pre-wrap;
    }

    .preview-footer, .success-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .success-modal {
      text-align: center;
    }

    .success-content {
      padding: 2rem;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .success-details {
      margin-top: 1.5rem;
      text-align: left;
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
    }

    .detail-item {
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .error-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffebee;
      border: 1px solid #e74c3c;
      border-radius: 8px;
      padding: 1rem;
      z-index: 1100;
      max-width: 400px;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .error-icon {
      font-size: 1.2rem;
    }

    .error-text {
      flex: 1;
      color: #c62828;
    }

    .error-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #c62828;
    }

    @media (max-width: 768px) {
      .send-notification-container {
        padding: 1rem;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .recipient-type-tabs {
        flex-direction: column;
      }
      
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class SendNotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  sending = false;
  loadingTemplates = true;
  showPreview = false;
  showSuccess = false;
  recipientType = 'individual';
  selectedTemplateId = '';
  selectedTemplate: any = null;
  singleRecipient = '';
  multipleRecipientsText = '';
  errorMessage = '';
  lastSendResult: any = null;

  availableTemplates: any[] = [];

  notification = {
    type: 'email',
    priority: 'normal',
    userGroup: '',
    subject: '',
    message: '',
    emailTemplate: 'basic',
    webhookUrl: '',
    method: 'POST',
    scheduleDelivery: false,
    scheduleDate: '',
    scheduleTime: '',
    trackOpens: false,
    requireConfirmation: false
  };

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.loadTemplates();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates() {
    this.loadingTemplates = true;
    
    this.apiService.getNotificationTemplates().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading templates:', error);
        this.showError('Failed to load notification templates');
        return [];
      })
    ).subscribe(templates => {
      this.availableTemplates = templates || [];
      this.loadingTemplates = false;
      
      console.log('✅ Loaded templates:', this.availableTemplates.length);
    });
  }

  getFilteredTemplates() {
    return this.availableTemplates.filter(template => 
      template.type === this.notification.type && 
      template.status === 'active'
    );
  }

  onTypeChange() {
    // Reset type-specific fields when type changes
    if (this.notification.type !== 'webhook') {
      this.notification.webhookUrl = '';
      this.notification.method = 'POST';
    }
    if (this.notification.type !== 'email') {
      this.notification.emailTemplate = 'basic';
      this.notification.trackOpens = false;
    }
    
    // Clear template selection if it doesn't match new type
    if (this.selectedTemplate && this.selectedTemplate.type !== this.notification.type) {
      this.selectedTemplateId = '';
      this.selectedTemplate = null;
    }
  }

  onTemplateChange() {
    if (this.selectedTemplateId) {
      this.selectedTemplate = this.availableTemplates.find(t => t.id === this.selectedTemplateId);
      if (this.selectedTemplate) {
        // Pre-fill form with template data
        this.notification.subject = this.selectedTemplate.subject;
        this.notification.message = this.selectedTemplate.content;
        
        console.log('✅ Template selected:', this.selectedTemplate.name);
      }
    } else {
      this.selectedTemplate = null;
    }
  }

  insertVariable(variable: string) {
    // Insert variable at cursor position in message textarea
    const messageElement = document.getElementById('message') as HTMLTextAreaElement;
    if (messageElement) {
      const start = messageElement.selectionStart;
      const end = messageElement.selectionEnd;
      const message = this.notification.message;
      
      this.notification.message = message.substring(0, start) + variable + message.substring(end);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        messageElement.selectionStart = messageElement.selectionEnd = start + variable.length;
        messageElement.focus();
      });
    } else {
      // Fallback: append to end
      this.notification.message += variable;
    }
  }

  setRecipientType(type: string) {
    this.recipientType = type;
    // Reset recipient fields
    this.singleRecipient = '';
    this.multipleRecipientsText = '';
    this.notification.userGroup = '';
  }

  getRecipientLabel(): string {
    switch (this.notification.type) {
      case 'email': return 'Email Address';
      case 'sms': return 'Phone Number';
      case 'webhook': return 'Webhook URL';
      case 'push': return 'User ID';
      default: return 'Recipient';
    }
  }

  getRecipientPlaceholder(): string {
    switch (this.notification.type) {
      case 'email': return 'user@example.com';
      case 'sms': return '+1234567890';
      case 'webhook': return 'https://example.com/webhook';
      case 'push': return 'user123';
      default: return 'Enter recipient';
    }
  }

  getMultipleRecipientsPlaceholder(): string {
    switch (this.notification.type) {
      case 'email': return 'user1@example.com\nuser2@example.com\nuser3@example.com';
      case 'sms': return '+1234567890\n+0987654321\n+1122334455';
      case 'push': return 'user123\nuser456\nuser789';
      default: return 'Enter recipients, one per line';
    }
  }

  getRecipients(): string[] {
    switch (this.recipientType) {
      case 'individual':
        return this.singleRecipient ? [this.singleRecipient] : [];
      case 'multiple':
        return this.multipleRecipientsText 
          ? this.multipleRecipientsText.split('\n').filter(r => r.trim())
          : [];
      case 'group':
        // For demo purposes, return placeholder emails
        switch (this.notification.userGroup) {
          case 'administrators': return ['admin1@example.com', 'admin2@example.com'];
          case 'managers': return ['manager1@example.com', 'manager2@example.com'];
          case 'users': return ['user1@example.com', 'user2@example.com', 'user3@example.com'];
          default: return [];
        }
      default:
        return [];
    }
  }

  isFormValid(): boolean {
    const hasRecipients = this.getRecipients().length > 0 || !!this.notification.userGroup;
    const hasSubject = this.notification.subject.trim().length > 0;
    const hasMessage = this.notification.message.trim().length > 0;
    const hasWebhookUrl = this.notification.type !== 'webhook' || this.notification.webhookUrl.trim().length > 0;
    
    return hasRecipients && hasSubject && hasMessage && hasWebhookUrl;
  }

  previewNotification() {
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  sendFromPreview() {
    this.closePreview();
    this.sendNotification();
  }

  onSubmit() {
    if (this.isFormValid()) {
      this.sendNotification();
    }
  }

  private sendNotification() {
    this.sending = true;
    this.clearError();

    const recipients = this.getRecipients();
    
    const notificationData = {
      type: this.notification.type,
      recipients: recipients,
      subject: this.notification.subject,
      content: this.notification.message,
      priority: this.notification.priority,
      template: this.selectedTemplateId || undefined
    };

    console.log('📤 Sending notification:', notificationData);

    this.apiService.sendNotification(notificationData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.sending = false;
        this.lastSendResult = result;
        this.showSuccess = true;
        
        console.log('✅ Notification sent successfully:', result);
      },
      error: (error) => {
        this.sending = false;
        console.error('❌ Failed to send notification:', error);
        this.showError(this.apiService.handleError(error));
      }
    });
  }

  closeSuccess() {
    this.showSuccess = false;
    this.lastSendResult = null;
    
    // Reset form
    this.resetForm();
  }

  resetForm() {
    this.notification = {
      type: 'email',
      priority: 'normal',
      userGroup: '',
      subject: '',
      message: '',
      emailTemplate: 'basic',
      webhookUrl: '',
      method: 'POST',
      scheduleDelivery: false,
      scheduleDate: '',
      scheduleTime: '',
      trackOpens: false,
      requireConfirmation: false
    };
    
    this.recipientType = 'individual';
    this.selectedTemplateId = '';
    this.selectedTemplate = null;
    this.singleRecipient = '';
    this.multipleRecipientsText = '';
  }

  showError(message: string) {
    this.errorMessage = message;
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      this.clearError();
    }, 5000);
  }

  clearError() {
    this.errorMessage = '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
} 