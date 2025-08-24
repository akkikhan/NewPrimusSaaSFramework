import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CopilotService, ChatContext } from '../../services/copilot.service';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../shared/services/dialog.service';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: any;
}

interface ContextInfo {
  currentModule: string;
  currentRoute: string;
  userRole: string;
  tenantId: string;
  userName: string;
}

@Component({
  selector: 'app-copilot-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="copilot-container">
      <!-- Header -->
      <div class="copilot-header">
        <div class="header-left">
          <h1>🤖 AI Assistant</h1>
          <p class="header-subtitle">Context-aware development assistant for {{currentContext?.currentModule || 'your platform'}}</p>
        </div>
        <div class="header-actions">
          <button class="action-btn" (click)="clearChat()" title="Clear Chat">
            <span class="icon">🗑️</span>
            Clear
          </button>
          <button class="action-btn" (click)="exportChat()" title="Export Chat">
            <span class="icon">📤</span>
            Export
          </button>
        </div>
      </div>

      <!-- Context Banner -->
      <div class="context-banner" *ngIf="currentContext">
        <div class="context-info">
          <span class="context-label">Current Context:</span>
          <span class="context-value">{{currentContext.currentModule}}</span>
          <span class="context-separator">•</span>
          <span class="context-role">{{currentContext.userRole}}</span>
          <span class="context-separator">•</span>
          <span class="context-tenant">{{currentContext.tenantId}}</span>
        </div>
      </div>

      <!-- Suggestions (shown when no messages) -->
      <div class="suggestions-area" *ngIf="messages.length === 0">
        <div class="welcome-section">
          <div class="welcome-icon">🤖</div>
          <h3>How can I help you today?</h3>
          <p>I'm your AI assistant for the SaaS Framework. I can help with code generation, best practices, troubleshooting, and more.</p>
        </div>

        <div class="suggestion-grid">
          <button *ngFor="let prompt of suggestedPrompts" 
                  class="suggestion-card" 
                  (click)="selectPrompt(prompt)">
            <div class="suggestion-icon">{{prompt.icon || '💡'}}</div>
            <div class="suggestion-content">
              <div class="suggestion-title">{{prompt.title}}</div>
              <div class="suggestion-description">{{prompt.category}}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-content" *ngIf="messages.length > 0" #chatContainer>
        <div class="messages-container">
          <div *ngFor="let message of messages; trackBy: trackMessage" 
               class="message-wrapper" 
               [class.user-message]="message.type === 'user'"
               [class.assistant-message]="message.type === 'assistant'"
               [class.system-message]="message.type === 'system'">
            
            <div class="message-content">
              <div class="message-header">
                <div class="message-avatar">
                  <span *ngIf="message.type === 'user'">{{getUserInitials()}}</span>
                  <span *ngIf="message.type === 'assistant'">🤖</span>
                  <span *ngIf="message.type === 'system'">ℹ️</span>
                </div>
                <div class="message-info">
                  <span class="message-sender">
                    {{message.type === 'user' ? currentContext?.userName : 'AI Assistant'}}
                  </span>
                  <span class="message-time">{{formatTime(message.timestamp)}}</span>
                </div>
              </div>
              
              <div class="message-body">
                <div class="message-text" [innerHTML]="formatMessage(message.content)" #messageText></div>
              </div>

              <!-- Message Actions -->
              <div class="message-actions" *ngIf="message.type === 'assistant'">
                <button class="action-btn small" (click)="copyMessage(message.content)" title="Copy">
                  📋
                </button>
                <button class="action-btn small" (click)="regenerateResponse(message)" title="Regenerate">
                  🔄
                </button>
              </div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div *ngIf="isTyping" class="message-wrapper assistant-message typing">
            <div class="message-content">
              <div class="message-header">
                <div class="message-avatar">🤖</div>
                <div class="message-info">
                  <span class="message-sender">AI Assistant</span>
                </div>
              </div>
              <div class="message-body">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <div class="input-container">
          <div class="input-wrapper">
            <textarea #messageInput
                      [(ngModel)]="currentMessage" 
                      placeholder="Message AI Assistant..."
                      (keydown)="onKeyDown($event)"
                      [disabled]="isTyping"
                      rows="1"
                      class="message-input"
                      (input)="adjustTextareaHeight()"></textarea>
            <button class="send-btn" 
                    (click)="sendMessage()" 
                    [disabled]="!currentMessage.trim() || isTyping"
                    [title]="isTyping ? 'AI is responding...' : 'Send message'">
              <span *ngIf="!isTyping" class="icon">➤</span>
              <span *ngIf="isTyping" class="loading-spinner">⟳</span>
            </button>
          </div>
          <div class="input-footer">
            <span class="context-info">
              Context: {{currentContext?.currentModule}} • {{currentContext?.userRole}} • 
              AI can make mistakes. Consider checking important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./copilot-page.component.scss']
})
export class CopilotPageComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  currentMessage = '';
  messages: ChatMessage[] = [];
  isTyping = false;
  currentContext: ContextInfo | null = null;
  suggestedPrompts: any[] = [];
  private shouldScrollToBottom = false;

  constructor(
    private copilotService: CopilotService,
    private authService: AuthService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.initializeContext();
    this.loadSuggestedPrompts();
    this.addWelcomeMessage();
    this.setupGlobalCopyFunction();
  }

  ngOnDestroy() {}

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private initializeContext() {
    const currentUser = this.authService.getCurrentUser();
    const currentRoute = this.router.url;
    
    this.currentContext = {
      currentModule: this.extractModuleFromRoute(currentRoute),
      currentRoute: currentRoute,
      userRole: currentUser?.roles?.[0] || 'User',
      tenantId: currentUser?.tenantId || 'demo-tenant',
      userName: currentUser?.name || 'Demo User'
    };
  }

  private extractModuleFromRoute(route: string): string {
    if (route.includes('/authentication')) return 'Authentication';
    if (route.includes('/rbac')) return 'RBAC';
    if (route.includes('/tenants')) return 'Tenant Management';
    if (route.includes('/notifications')) return 'Notifications';
    if (route.includes('/audit')) return 'Audit Logs';
    if (route.includes('/analytics')) return 'Analytics';
    if (route.includes('/settings')) return 'Settings';
    if (route.includes('/dashboard')) return 'Dashboard';
    if (route.includes('/copilot')) return 'AI Assistant';
    return 'General';
  }

  private loadSuggestedPrompts() {
    // Use static prompts since getSuggestedPrompts doesn't exist
    const module = this.currentContext?.currentModule || 'General';
    this.suggestedPrompts = [
      { text: `How do I use ${module}?`, category: 'help' },
      { text: `Show me ${module} features`, category: 'features' },
      { text: `What's new in ${module}?`, category: 'updates' },
      { text: `Best practices for ${module}`, category: 'guidance' }
    ];
  }

  selectPrompt(prompt: any) {
    this.currentMessage = prompt.text;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  adjustTextareaHeight() {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  async sendMessage() {
    if (!this.currentMessage.trim() || this.isTyping) return;

    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: this.currentMessage.trim(),
      timestamp: new Date(),
      context: this.currentContext
    };

    this.messages.push(userMessage);
    this.shouldScrollToBottom = true;
    
    const messageToSend = this.currentMessage.trim();
    this.currentMessage = '';
    this.adjustTextareaHeight();
    this.isTyping = true;

    try {
      const chatContext: ChatContext = this.currentContext ? {
        currentModule: this.currentContext.currentModule,
        currentRoute: this.currentContext.currentRoute,
        userRole: this.currentContext.userRole
      } : {};
      const response = await this.copilotService.sendMessage(messageToSend, chatContext);
      
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      this.messages.push(assistantMessage);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Copilot error:', error);
      
      const errorMessage: ChatMessage = {
        id: this.generateId(),
        type: 'system',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date()
      };

      this.messages.push(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isTyping = false;
    }
  }

  private addWelcomeMessage() {
    const welcomeMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: `Hello! I'm your SaaS Framework AI assistant. I'm here to help you with:

• **Code Generation** - .NET, Angular, and API snippets
• **Architecture Guidance** - Best practices and design patterns
• **Integration Help** - Step-by-step implementation guides
• **Troubleshooting** - Debug issues and find solutions
• **Security Advice** - Multi-tenant security recommendations

I'm currently aware that you're working in the **${this.currentContext?.currentModule}** module. How can I help you today?`,
      timestamp: new Date()
    };

    this.messages.push(welcomeMessage);
  }

  clearChat() {
    this.dialogService.confirm(
      'Clear Conversation',
      'Are you sure you want to clear this conversation?',
      'Clear',
      'Cancel'
    ).subscribe({
      next: (result) => {
        if (result.confirmed) {
          this.messages = [];
          this.addWelcomeMessage();
        }
      },
      error: (error) => {
        console.error('❌ Dialog error:', error);
      }
    });
  }

  exportChat() {
    const conversation = this.messages.map(m => 
      `[${m.timestamp.toLocaleString()}] ${m.type === 'user' ? 'You' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  copyMessage(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Message copied to clipboard');
    });
  }

  regenerateResponse(message: ChatMessage) {
    const messageIndex = this.messages.findIndex(m => m.id === message.id);
    if (messageIndex > 0) {
      const userMessage = this.messages[messageIndex - 1];
      if (userMessage.type === 'user') {
        this.messages.splice(messageIndex, 1);
        this.currentMessage = userMessage.content;
        this.sendMessage();
      }
    }
  }

  getUserInitials(): string {
    const user = this.currentContext?.userName || 'User';
    return user.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatMessage(content: string): string {
    // First handle code blocks with copy functionality
    let formattedContent = content.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
      const lang = language || 'text';
      const codeId = this.generateId();
      const highlightedCode = this.highlightCode(code.trim(), lang);
      
      return `<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${lang}</span>
          <button class="copy-code-btn" onclick="window.copyCodeBlock('${codeId}', this)" title="Copy code">
            <span class="copy-icon">📋</span>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <pre><code id="${codeId}" class="language-${lang}">${highlightedCode}</code></pre>
      </div>`;
    });

    // Handle inline formatting
    return formattedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/^#{3}\s(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#{1}\s(.+)$/gm, '<h1>$1</h1>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  private highlightCode(code: string, language: string): string {
    // Basic syntax highlighting for common languages
    switch (language.toLowerCase()) {
      case 'csharp':
      case 'c#':
        return code
          .replace(/\b(public|private|protected|internal|static|virtual|override|abstract|sealed|readonly|const|var|class|interface|struct|enum|namespace|using|if|else|while|for|foreach|switch|case|break|continue|return|try|catch|finally|throw|new|this|base|null|true|false|async|await|void|int|string|bool|double|float|decimal|DateTime|Guid|Task|IActionResult|ActionResult)\b/g, '<span class="keyword">$1</span>')
          .replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>')
          .replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>')
          .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
          .replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
          .replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>')
          .replace(/\b([A-Z][a-zA-Z0-9]*)\s*\(/g, '<span class="function">$1</span>(')
          .replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="class">$1</span>');
      
      case 'typescript':
      case 'javascript':
        return code
          .replace(/\b(class|interface|function|const|let|var|if|else|while|for|switch|case|break|continue|return|try|catch|finally|throw|new|this|null|undefined|true|false|async|await|export|import|from|default|public|private|protected|readonly|static|implements|extends)\b/g, '<span class="keyword">$1</span>')
          .replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>')
          .replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>')
          .replace(/`([^`\\]|\\.)*`/g, '<span class="string">$&</span>')
          .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
          .replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
          .replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>')
          .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '<span class="function">$1</span>(');
      
      case 'html':
        return code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&lt;(\/?[a-zA-Z][^&gt;]*)&gt;/g, '<span class="keyword">&lt;$1&gt;</span>')
          .replace(/="([^"]*)"/g, '=<span class="string">"$1"</span>');
      
      default:
        return code;
    }
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackMessage(index: number, message: ChatMessage): string {
    return message.id;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      const element = this.chatContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private setupGlobalCopyFunction() {
    // Setup global copy function for code blocks
    (window as any).copyCodeBlock = (codeId: string, button: HTMLElement) => {
      const codeElement = document.getElementById(codeId);
      if (codeElement) {
        const code = codeElement.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          const copyText = button.querySelector('.copy-text');
          const originalText = copyText?.textContent || 'Copy';
          if (copyText) {
            copyText.textContent = 'Copied!';
            setTimeout(() => {
              copyText.textContent = originalText;
            }, 2000);
          }
        }).catch(err => {
          console.error('Failed to copy code:', err);
        });
      }
    };
  }
} 