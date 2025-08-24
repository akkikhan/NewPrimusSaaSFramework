import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="copilot-container">
      <div class="copilot-header">
        <div class="header-content">
          <h1>🤖 AI Copilot</h1>
          <p>Your intelligent assistant for the SaaS Factory platform</p>
        </div>
        <div class="header-actions">
          <button class="btn-outline" (click)="clearConversation()">
            Clear Chat
          </button>
          <button class="btn-secondary" (click)="showHelp = !showHelp">
            {{ showHelp ? 'Hide Help' : 'Show Help' }}
          </button>
        </div>
      </div>

      <!-- Help Panel -->
      <div class="help-panel" *ngIf="showHelp">
        <h3>What can I help you with?</h3>
        <div class="help-categories">
          <div class="help-category">
            <h4>👥 User Management</h4>
            <ul>
              <li>"Create a new user for tenant ABC"</li>
              <li>"Show me all users with admin roles"</li>
              <li>"What permissions does user&#64;example.com have?"</li>
            </ul>
          </div>
          <div class="help-category">
            <h4>📊 Analytics & Reports</h4>
            <ul>
              <li>"Show me platform usage statistics"</li>
              <li>"Generate a security report"</li>
              <li>"What's the user activity trend?"</li>
            </ul>
          </div>
          <div class="help-category">
            <h4>🔍 Audit & Security</h4>
            <ul>
              <li>"Show recent audit logs"</li>
              <li>"Analyze security events for this week"</li>
              <li>"Who accessed the system yesterday?"</li>
            </ul>
          </div>
          <div class="help-category">
            <h4>⚙️ Configuration</h4>
            <ul>
              <li>"Help me configure user roles"</li>
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
                Hello! I'm your AI assistant for SaaS Factory. I can help you with user management, 
                analytics, audit logs, and platform configuration. What would you like to know?
              </div>
              <div class="message-suggestions">
                <button 
                  class="suggestion-chip" 
                  *ngFor="let suggestion of welcomeSuggestions"
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
            [class.error-message]="message.role === 'error'">
            
            <div class="message-avatar">
              {{ message.role === 'user' ? '👤' : message.role === 'error' ? '⚠️' : '🤖' }}
            </div>
            
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              
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
              placeholder="Ask me anything about your SaaS platform..."
              class="message-input"
              rows="1"
              [disabled]="isLoading"
              (keydown)="onKeyDown($event)"
              (input)="onInputChange()">
            </textarea>
            
            <button 
              class="send-button"
              [disabled]="!currentMessage.trim() || isLoading"
              (click)="sendMessage()">
              <span *ngIf="!isLoading">Send</span>
              <span *ngIf="isLoading" class="loading-spinner"></span>
            </button>
          </div>
          
          <div class="input-help">
            <span class="char-counter" [class.warning]="currentMessage.length > 3500">
              {{ currentMessage.length }}/4000
            </span>
            <span class="shortcut-hint">Press Ctrl+Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .copilot-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
      box-sizing: border-box;
    }

    .copilot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e0e0e0;
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

    .help-panel {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border: 1px solid #e0e0e0;
    }

    .help-panel h3 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
    }

    .help-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .help-category h4 {
      color: #34495e;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .help-category ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .help-category li {
      padding: 0.25rem 0;
      color: #7f8c8d;
      font-style: italic;
    }

    .chat-interface {
      display: flex;
      flex-direction: column;
      flex: 1;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
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
      background: #2196f3;
      color: white;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-text {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .user-message .message-text {
      background: #2196f3;
      color: white;
    }

    .error-message .message-text {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }

    .tool-executions {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tool-execution {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: #e3f2fd;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    .tool-name {
      color: #1976d2;
      font-weight: 500;
    }

    .tool-status.success {
      color: #2e7d32;
    }

    .tool-status.failed {
      color: #d32f2f;
    }

    .reasoning {
      margin-top: 0.5rem;
    }

    .reasoning summary {
      cursor: pointer;
      color: #1976d2;
      font-size: 0.9rem;
    }

    .reasoning pre {
      background: #f5f5f5;
      padding: 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-top: 0.5rem;
      white-space: pre-wrap;
    }

    .message-suggestions {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .suggestion-chip {
      background: white;
      border: 1px solid #2196f3;
      color: #2196f3;
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .suggestion-chip:hover {
      background: #2196f3;
      color: white;
    }

    .message-timestamp {
      font-size: 0.7rem;
      color: #bbb;
      margin-top: 0.5rem;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .typing-dots {
      display: flex;
      gap: 0.25rem;
    }

    .typing-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2196f3;
      animation: bounce 1.4s ease-in-out infinite both;
    }

    .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      } 40% {
        transform: scale(1);
      }
    }

    .loading-text {
      color: #7f8c8d;
      font-style: italic;
    }

    .chat-input-area {
      border-top: 1px solid #e0e0e0;
      padding: 1rem;
      background: #fafafa;
    }

    .input-wrapper {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
    }

    .message-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 1rem;
      resize: none;
      max-height: 120px;
      min-height: 40px;
      line-height: 1.4;
    }

    .message-input:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
    }

    .send-button {
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s ease;
      min-width: 80px;
    }

    .send-button:hover:not(:disabled) {
      background: #1976d2;
    }

    .send-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .input-help {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .char-counter.warning {
      color: #f39c12;
    }

    .shortcut-hint {
      color: #bbb;
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

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-outline {
      background: white;
      color: #2196f3;
      border: 1px solid #2196f3;
    }

    @media (max-width: 768px) {
      .copilot-container {
        padding: 0.5rem;
        height: 100vh;
      }
      
      .copilot-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
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
        align-self: stretch;
      }
    }
  `]
})
export class CopilotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  showHelp = false;
  loadingMessage = 'Thinking...';
  conversationId = '';

  welcomeSuggestions = [
    'Show me recent user activity',
    'Create a new user account',
    'Generate a security report',
    'What are the available user roles?'
  ];

  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom = false;

  constructor(private apiService: ApiService) {
    this.conversationId = this.generateConversationId();
  }

  ngOnInit() {
    // Auto-resize textarea
    this.setupTextareaAutoResize();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(message?: string) {
    const messageText = message || this.currentMessage.trim();
    
    if (!messageText || this.isLoading) {
      return;
    }

    // Add user message
    this.addMessage({
      role: 'user',
      content: messageText,
      timestamp: new Date()
    });

    // Clear input
    this.currentMessage = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    // Update loading message
    this.updateLoadingMessage();

    // Send request to API
    const request = {
      prompt: messageText,
      conversationId: this.conversationId,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    };

    const subscription = this.apiService.askCopilot(request).subscribe({
      next: (response) => {
        this.handleCopilotResponse(response);
        this.isLoading = false;
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });

    this.subscriptions.push(subscription);
  }

  clearConversation() {
    this.messages = [];
    this.conversationId = this.generateConversationId();
    this.showHelp = false;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInputChange() {
    this.adjustTextareaHeight();
  }

  trackMessage(index: number, message: ChatMessage): any {
    return message.timestamp.getTime();
  }

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }

  private addMessage(message: ChatMessage) {
    this.messages.push(message);
    this.shouldScrollToBottom = true;
  }

  private handleCopilotResponse(response: any) {
    const message: ChatMessage = {
      role: 'assistant',
      content: response.message || 'I encountered an issue processing your request.',
      timestamp: new Date(),
      reasoning: response.reasoning,
      toolExecutions: response.toolExecutions || [],
      suggestions: this.extractSuggestions(response.message),
      confidence: response.confidence
    };

    this.addMessage(message);
  }

  private handleError(error: any) {
    let errorMessage = 'Sorry, I encountered an error. Please try again.';
    
    if (error.status === 429) {
      errorMessage = 'I\'m receiving too many requests. Please wait a moment and try again.';
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = 'Authentication error. Please refresh the page and try again.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.addMessage({
      role: 'error',
      content: errorMessage,
      timestamp: new Date()
    });
  }

  private extractSuggestions(message: string): string[] {
    // Extract potential follow-up questions from the AI response
    const suggestions: string[] = [];
    
    // Look for common follow-up patterns
    if (message.includes('user') || message.includes('account')) {
      suggestions.push('Show user permissions', 'List all users');
    }
    
    if (message.includes('audit') || message.includes('log')) {
      suggestions.push('Show recent audit logs', 'Analyze security events');
    }
    
    if (message.includes('role') || message.includes('permission')) {
      suggestions.push('Show available roles', 'Update user roles');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private updateLoadingMessage() {
    const messages = [
      'Analyzing your request...',
      'Gathering platform data...',
      'Processing with AI...',
      'Checking permissions...',
      'Generating response...'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (!this.isLoading) {
        clearInterval(interval);
        return;
      }
      
      this.loadingMessage = messages[index % messages.length];
      index++;
    }, 1500);
  }

  private setupTextareaAutoResize() {
    // Will be called after view init
  }

  private adjustTextareaHeight() {
    if (this.messageInput?.nativeElement) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  private scrollToBottom() {
    if (this.chatMessages?.nativeElement) {
      const element = this.chatMessages.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private generateConversationId(): string {
    return 'conv_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  reasoning?: string;
  toolExecutions?: ToolExecution[];
  suggestions?: string[];
  confidence?: number;
}

interface ToolExecution {
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  success: boolean;
  errorMessage?: string;
} 