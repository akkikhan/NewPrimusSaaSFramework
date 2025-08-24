import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CopilotService } from '../../services/copilot.service';
import { TenantAuthService } from '../../core/services/tenant-auth.service';

interface TenantChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tenantId?: string;
  suggestions?: string[];
  reasoning?: string;
  toolExecutions?: any[];
}

@Component({
  selector: 'app-tenant-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tenant-copilot-container">
      <!-- Header -->
      <div class="copilot-header">
        <div class="header-left">
          <div class="tenant-context">
            <h1>AI Assistant for {{tenantDisplayName}}</h1>
            <p class="header-subtitle">
              Your intelligent assistant for {{tenantDisplayName}} tenant management and analytics
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn" (click)="toggleHelp()" title="Toggle Help">
            <span class="icon">❓</span>
            {{ showHelp ? 'Hide Help' : 'Show Help' }}
          </button>
          <button class="action-btn" (click)="clearChat()" title="Clear Chat">
            <span class="icon">🗑️</span>
            Clear
          </button>
        </div>
      </div>

      <!-- Help Panel -->
      <div class="help-panel" *ngIf="showHelp">
        <h3>What can I help you with for {{tenantDisplayName}}?</h3>
        <div class="help-categories">
          <div class="help-category">
            <h4>👥 User Management</h4>
            <ul>
              <li>"Show me all users in {{tenantDisplayName}}"</li>
              <li>"Create a new user for my tenant"</li>
              <li>"What permissions does user&#64;example.com have?"</li>
            </ul>
          </div>
          <div class="help-category">
            <h4>📊 Analytics & Reports</h4>
            <ul>
              <li>"Show me {{tenantDisplayName}} usage statistics"</li>
              <li>"Generate a usage report for this month"</li>
              <li>"What's our user activity trend?"</li>
            </ul>
          </div>
          <div class="help-category">
            <h4>🔍 Audit & Security</h4>
            <ul>
              <li>"Show recent audit logs for {{tenantDisplayName}}"</li>
              <li>"Analyze security events for this week"</li>
              <li>"Who accessed our system yesterday?"</li>
            </ul>
          </div>
          <div class="help-category">
            <h4>⚙️ Configuration</h4>
            <ul>
              <li>"Help me configure user roles for {{tenantDisplayName}}"</li>
              <li>"Show tenant settings"</li>
              <li>"How do I set up notifications?"</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Chat Interface -->
      <div class="chat-interface">
        <div class="chat-messages" #chatMessages>
          <!-- Welcome Message -->
          <div class="message assistant-message" *ngIf="messages.length === 0">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="message-text">
                Hello! I'm your AI assistant for {{tenantDisplayName}}. I can help you with user management, 
                analytics, audit logs, and tenant configuration specific to your organization. 
                What would you like to know?
              </div>
              <div class="message-suggestions">
                <button 
                  class="suggestion-chip" 
                  *ngFor="let suggestion of tenantWelcomeSuggestions"
                  (click)="sendMessage(suggestion)">
                  {{ suggestion }}
                </button>
              </div>
            </div>
          </div>

          <!-- Chat Messages -->
          <div 
            class="message" 
            *ngFor="let message of messages; trackBy: trackMessage"
            [class.user-message]="message.role === 'user'"
            [class.assistant-message]="message.role === 'assistant'"
            [class.error-message]="message.role === 'system'">
            
            <div class="message-avatar">
              {{ message.role === 'user' ? '👤' : message.role === 'system' ? '⚠️' : '🤖' }}
            </div>
            
            <div class="message-content">
              <div class="message-text" [innerHTML]="formatMessage(message.content)"></div>
              
              <!-- Tool Executions -->
              <div class="tool-executions" *ngIf="message.toolExecutions && message.toolExecutions.length > 0">
                <div class="tool-execution" *ngFor="let tool of message.toolExecutions">
                  <span class="tool-name">{{ tool.toolName }}</span>
                  <span class="tool-status" [class.success]="tool.success" [class.failed]="!tool.success">
                    {{ tool.success ? '✅' : '❌' }}
                  </span>
                </div>
              </div>
              
              <!-- Reasoning -->
              <div class="reasoning" *ngIf="message.reasoning">
                <details>
                  <summary>View Analysis</summary>
                  <pre>{{ message.reasoning }}</pre>
                </details>
              </div>
              
              <!-- Response Suggestions -->
              <div class="message-suggestions" *ngIf="message.suggestions && message.suggestions.length > 0">
                <button 
                  class="suggestion-chip" 
                  *ngFor="let suggestion of message.suggestions"
                  (click)="sendMessage(suggestion)">
                  {{ suggestion }}
                </button>
              </div>
              
              <div class="message-timestamp">{{ formatTimestamp(message.timestamp) }}</div>
            </div>
          </div>

          <!-- Loading Message -->
          <div class="message assistant-message" *ngIf="isLoading">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="loading-indicator">
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="loading-text">{{ loadingMessage }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-wrapper">
            <textarea
              #messageInput
              [(ngModel)]="currentMessage"
              placeholder="Ask me anything about {{tenantDisplayName}} tenant management..."
              class="message-input"
              rows="1"
              [disabled]="isLoading"
              (keydown)="onKeyDown($event)"
              (input)="adjustTextareaHeight()"></textarea>
            
            <button 
              class="send-button" 
              (click)="sendMessage()"
              [disabled]="!currentMessage.trim() || isLoading"
              title="Send message">
              <span *ngIf="!isLoading" class="send-icon">➤</span>
              <span *ngIf="isLoading" class="loading-spinner">⟳</span>
            </button>
          </div>
          
          <div class="input-footer">
            <span class="context-info">
              Context: {{tenantDisplayName}} Tenant • Tenant Admin • AI can make mistakes. Consider checking important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-copilot-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .copilot-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-left {
      flex: 1;
    }

    .tenant-context h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .header-subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 1rem;
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .help-panel {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 1.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .help-panel h3 {
      margin: 0 0 1rem 0;
      color: #1e293b;
      font-size: 1.1rem;
    }

    .help-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .help-category {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid #e2e8f0;
    }

    .help-category h4 {
      margin: 0 0 0.75rem 0;
      color: #667eea;
      font-size: 0.9rem;
    }

    .help-category ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .help-category li {
      padding: 0.25rem 0;
      color: #64748b;
      font-size: 0.85rem;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .help-category li:hover {
      color: #667eea;
    }

    .chat-interface {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .message {
      display: flex;
      gap: 1rem;
      max-width: 85%;
    }

    .user-message {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .assistant-message {
      align-self: flex-start;
    }

    .error-message {
      align-self: flex-start;
    }

    .message-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .user-message .message-avatar {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .assistant-message .message-avatar {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-text {
      background: #f8fafc;
      padding: 0.875rem 1.125rem;
      border-radius: 12px;
      line-height: 1.5;
      color: #1e293b;
      word-wrap: break-word;
      margin-bottom: 0.5rem;
    }

    .user-message .message-text {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .message-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .suggestion-chip {
      background: #e2e8f0;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 0.375rem 0.75rem;
      border-radius: 16px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .suggestion-chip:hover {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .message-timestamp {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.5rem;
    }

    .tool-executions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .tool-execution {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }

    .tool-name {
      color: #475569;
      font-weight: 500;
    }

    .tool-status.success {
      color: #059669;
    }

    .tool-status.failed {
      color: #dc2626;
    }

    .reasoning {
      margin-top: 0.75rem;
    }

    .reasoning summary {
      color: #667eea;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .reasoning pre {
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 0.5rem;
      white-space: pre-wrap;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.125rem;
      background: #f8fafc;
      border-radius: 12px;
    }

    .typing-dots {
      display: flex;
      gap: 0.25rem;
    }

    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #667eea;
      animation: typing 1.4s infinite ease-in-out;
    }

    .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes typing {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    .loading-text {
      color: #64748b;
      font-size: 0.9rem;
    }

    .chat-input-area {
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 1rem;
    }

    .input-wrapper {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
    }

    .message-input {
      flex: 1;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      resize: none;
      min-height: 44px;
      max-height: 120px;
      transition: border-color 0.2s ease;
      font-family: inherit;
    }

    .message-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .message-input:disabled {
      background: #f8fafc;
      color: #94a3b8;
    }

    .send-button {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 1.2rem;
    }

    .send-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .loading-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .input-footer {
      margin-top: 0.75rem;
      text-align: center;
    }

    .context-info {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* Scrollbar styling */
    .chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .chat-messages::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }

    .chat-messages::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .chat-messages::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .copilot-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .header-actions {
        justify-content: center;
      }

      .help-categories {
        grid-template-columns: 1fr;
      }

      .message {
        max-width: 95%;
      }

      .input-wrapper {
        flex-direction: column;
        gap: 0.5rem;
      }

      .send-button {
        align-self: flex-end;
      }
    }
  `]
})
export class TenantCopilotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  private destroy$ = new Subject<void>();
  
  tenantId: string = '';
  tenantDisplayName: string = '';
  currentMessage = '';
  messages: TenantChatMessage[] = [];
  isLoading = false;
  showHelp = false;
  loadingMessage = 'AI is thinking...';
  shouldScrollToBottom = false;

  tenantWelcomeSuggestions = [
    'Show me user statistics for this tenant',
    'What are the recent activities in my tenant?',
    'Help me create a new user role',
    'Generate a monthly usage report'
  ];

  constructor(
    private route: ActivatedRoute,
    private copilotService: CopilotService,
    private tenantAuthService: TenantAuthService
  ) {}

  ngOnInit(): void {
    // Get tenant ID from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.tenantId = params['tenantId'] || '';
      this.tenantDisplayName = this.tenantId.charAt(0).toUpperCase() + this.tenantId.slice(1);
      this.initializeTenantContext();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private initializeTenantContext(): void {
    // Set tenant-specific context for the copilot service
    this.copilotService.setContext({
      currentModule: 'Tenant Portal',
      currentRoute: `/tenant/${this.tenantId}`,
      userRole: 'Tenant Admin',
      tenantId: this.tenantId
    });
  }

  trackMessage(index: number, message: TenantChatMessage): string {
    return message.id;
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  clearChat(): void {
    this.messages = [];
    this.currentMessage = '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  adjustTextareaHeight(): void {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  async sendMessage(predefinedMessage?: string): Promise<void> {
    const messageText = predefinedMessage || this.currentMessage.trim();
    if (!messageText || this.isLoading) return;

    // Add user message
    const userMessage: TenantChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      tenantId: this.tenantId
    };

    this.messages.push(userMessage);
    this.shouldScrollToBottom = true;

    // Clear input if not predefined message
    if (!predefinedMessage) {
      this.currentMessage = '';
      this.adjustTextareaHeight();
    }

    this.isLoading = true;
    this.loadingMessage = 'AI is analyzing your request...';

    try {
      // Send message to copilot service with tenant context
      const response = await this.copilotService.sendMessage(messageText, {
        currentModule: 'Tenant Portal',
        currentRoute: `/tenant/${this.tenantId}`,
        userRole: 'Tenant Admin',
        tenantId: this.tenantId
      });

      // Add assistant response
      const assistantMessage: TenantChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: response.message || response.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(),
        tenantId: this.tenantId,
        suggestions: response.suggestions || [],
        reasoning: response.reasoning,
        toolExecutions: response.toolExecutions || []
      };

      this.messages.push(assistantMessage);
      this.shouldScrollToBottom = true;

    } catch (error) {
      console.error('Error sending message to AI Copilot:', error);
      
      // Add error message
      const errorMessage: TenantChatMessage = {
        id: this.generateId(),
        role: 'system',
        content: 'I apologize, but I\'m currently unable to process your request. Please try again later or contact support if the issue persists.',
        timestamp: new Date(),
        tenantId: this.tenantId
      };

      this.messages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
    }
  }

  formatMessage(content: string): string {
    // Basic formatting for markdown-like syntax
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  formatTimestamp(timestamp: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  }

  private scrollToBottom(): void {
    try {
      const element = this.chatMessages.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
} 