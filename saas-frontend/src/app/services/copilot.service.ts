import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EnhancedCopilotRequest {
  message: string;
  context?: ChatContext;
  conversationId?: string;
}

export interface ChatContext {
  currentModule?: string;
  currentRoute?: string;
  userRole?: string;
  tenantId?: string;
  additionalContext?: { [key: string]: any };
}

export interface EnhancedCopilotResponse {
  id: string;
  message: string;
  response?: string;
  timestamp: string;
  confidence: number;
  intent?: UserIntent;
  suggestions: string[];
  actions: ActionableItem[];
  dataInsights: DataInsight[];
  conversationId: string;
  reasoning?: string;
  toolExecutions?: any[];
}

export interface UserIntent {
  primaryIntent: string;
  entities: string[];
  currentModule?: string;
  currentRoute?: string;
  userRole?: string;
}

export interface ActionableItem {
  id: string;
  title: string;
  description: string;
  actionType: string;
  icon: string;
  difficulty: string;
}

export interface DataInsight {
  title: string;
  value: string;
  type: string;
  icon: string;
}

export interface ContextualSuggestion {
  id: string;
  text: string;
  category: string;
  module: string;
  relevance: number;
}

export interface ActionableInsight {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  actions: string[];
}

export interface IntelligentAnalysis {
  id: string;
  type: string;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  confidence: number;
  generatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CopilotService {
  private baseUrl = environment.apiUrl || '/api';
  private conversationId: string = '';
  private currentContext: ChatContext = {};

  // Reactive state management
  private contextSubject = new BehaviorSubject<ChatContext>({});
  public context$ = this.contextSubject.asObservable();

  private suggestionsSubject = new BehaviorSubject<ContextualSuggestion[]>([]);
  public suggestions$ = this.suggestionsSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.initializeContextTracking();
  }

  private initializeContextTracking() {
    // Track route changes for context awareness
    this.router.events.subscribe(() => {
      this.updateContext();
    });

    // Initial context setup
    this.updateContext();
  }

  private updateContext() {
    const currentRoute = this.router.url;
    const module = this.extractModuleFromRoute(currentRoute);

    this.currentContext = {
      currentModule: module,
      currentRoute: currentRoute,
      userRole: this.getUserRole(),
      additionalContext: this.gatherAdditionalContext(),
    };

    this.contextSubject.next(this.currentContext);
    this.loadContextualSuggestions();
  }

  private extractModuleFromRoute(route: string): string {
    const routeSegments = route.split('/').filter((segment) => segment);

    if (routeSegments.length === 0) return 'Dashboard';

    const moduleMap: { [key: string]: string } = {
      dashboard: 'Dashboard',
      users: 'User Management',
      roles: 'RBAC',
      analytics: 'Analytics',
      audit: 'Audit Logs',
      notifications: 'Notifications',
      settings: 'Settings',
      copilot: 'AI Copilot',
      tenants: 'Tenant Management',
      logs: 'System Logs',
    };

    const firstSegment = routeSegments[0].toLowerCase();
    return moduleMap[firstSegment] || 'Platform';
  }

  private getUserRole(): string {
    // Get user role from authentication context
    const userInfo = this.getCurrentUser();
    return userInfo?.role || 'User';
  }

  private getCurrentUser(): any {
    // Implementation to get current user from auth service
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private gatherAdditionalContext(): { [key: string]: any } {
    return {
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      tenantId: this.getTenantId(),
      platform: 'SaaS Factory',
      version: '1.0.0',
    };
  }

  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }

  private getTenantId(): string {
    return localStorage.getItem('tenantId') || 'default-tenant';
  }

  private getTenantDisplayName(tenantId: string): string {
    // Convert tenant ID to display name (capitalize first letter)
    return tenantId.charAt(0).toUpperCase() + tenantId.slice(1);
  }

  // Enhanced chat with intelligent backend
  async sendMessage(
    message: string,
    customContext?: ChatContext
  ): Promise<EnhancedCopilotResponse> {
    try {
      const context = customContext || this.currentContext;

      // Enhance context with tenant-specific information
      const enhancedContext = {
        ...context,
        ...this.gatherAdditionalContext(),
        // Add tenant-specific context if available
        ...(context?.tenantId && {
          tenantContext: {
            tenantId: context.tenantId,
            tenantName: this.getTenantDisplayName(context.tenantId),
            portalType: context.currentModule?.includes('Tenant')
              ? 'tenant_portal'
              : 'platform_admin',
          },
        }),
      };

      const requestPayload: EnhancedCopilotRequest = {
        message: message,
        context: enhancedContext,
        conversationId: this.conversationId,
      };

      const headers = this.getHeaders();

      const response = await this.http
        .post<EnhancedCopilotResponse>(
          `${this.baseUrl}/api/v2/copilot/chat`,
          requestPayload,
          { headers }
        )
        .toPromise();

      if (response?.conversationId) {
        this.conversationId = response.conversationId;
      }

      // Update suggestions based on response
      if (response?.suggestions) {
        this.processSuggestions(response.suggestions);
      }

      return response || this.generateFallbackResponse(message);
    } catch (error) {
      console.error('Enhanced Copilot API error:', error);
      return this.generateEnhancedFallbackResponse(message);
    }
  }

  // Get contextual suggestions
  async getContextualSuggestions(
    module?: string,
    activity?: string
  ): Promise<ContextualSuggestion[]> {
    try {
      const params = new URLSearchParams();
      if (module) params.append('module', module);
      if (activity) params.append('activity', activity);

      const headers = this.getHeaders();

      const response = await this.http
        .get<ContextualSuggestion[]>(
          `${this.baseUrl}/api/v2/copilot/suggestions?${params.toString()}`,
          { headers }
        )
        .toPromise();

      const suggestions = response || this.getDefaultSuggestions();
      this.suggestionsSubject.next(suggestions);
      return suggestions;
    } catch (error) {
      console.error('Error fetching contextual suggestions:', error);
      const defaultSuggestions = this.getDefaultSuggestions();
      this.suggestionsSubject.next(defaultSuggestions);
      return defaultSuggestions;
    }
  }

  // Analyze platform data
  async analyzePlatformData(
    type: string,
    parameters: { [key: string]: any }
  ): Promise<IntelligentAnalysis> {
    try {
      const requestPayload = { type, parameters };
      const headers = this.getHeaders();

      const response = await this.http
        .post<IntelligentAnalysis>(
          `${this.baseUrl}/api/v2/copilot/analyze`,
          requestPayload,
          { headers }
        )
        .toPromise();

      return response || this.generateDefaultAnalysis(type);
    } catch (error) {
      console.error('Error analyzing platform data:', error);
      return this.generateDefaultAnalysis(type);
    }
  }

  // Get actionable insights
  async getActionableInsights(): Promise<ActionableInsight[]> {
    try {
      const headers = this.getHeaders();

      const response = await this.http
        .get<ActionableInsight[]>(`${this.baseUrl}/api/v2/copilot/insights`, {
          headers,
        })
        .toPromise();

      return response || this.getDefaultInsights();
    } catch (error) {
      console.error('Error fetching actionable insights:', error);
      return this.getDefaultInsights();
    }
  }

  // Execute an AI-suggested action
  async executeAction(
    actionType: string,
    parameters: { [key: string]: any }
  ): Promise<any> {
    try {
      const requestPayload = { actionType, parameters };
      const headers = this.getHeaders();

      const response = await this.http
        .post(`${this.baseUrl}/api/v2/copilot/execute`, requestPayload, {
          headers,
        })
        .toPromise();

      return response;
    } catch (error) {
      console.error('Error executing action:', error);
      throw error;
    }
  }

  // Context management
  setContext(context: ChatContext) {
    this.currentContext = { ...this.currentContext, ...context };
    this.contextSubject.next(this.currentContext);
    this.loadContextualSuggestions();
  }

  getContext(): ChatContext {
    return this.currentContext;
  }

  // Load contextual suggestions based on current context
  private async loadContextualSuggestions() {
    const module = this.currentContext.currentModule;
    await this.getContextualSuggestions(module);
  }

  private processSuggestions(suggestions: string[]) {
    const contextualSuggestions: ContextualSuggestion[] = suggestions.map(
      (suggestion, index) => ({
        id: `suggestion-${index}`,
        text: suggestion,
        category: this.currentContext.currentModule || 'General',
        module: this.currentContext.currentModule || 'Platform',
        relevance: 0.8,
      })
    );

    this.suggestionsSubject.next(contextualSuggestions);
  }

  private getHeaders(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Add authentication headers
    const token = this.getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Add tenant context
    const tenantId = this.getTenantId();
    if (tenantId) {
      headers.set('X-Tenant-Id', tenantId);
    }

    return headers;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private generateFallbackResponse(message: string): EnhancedCopilotResponse {
    return {
      id: this.generateId(),
      message:
        "I apologize, but I encountered an issue. However, I'm still here to help you with SaaS Factory!",
      timestamp: new Date().toISOString(),
      confidence: 0.5,
      suggestions: this.getContextualFallbackSuggestions(),
      actions: [],
      dataInsights: [],
      conversationId: this.conversationId || this.generateId(),
    };
  }

  private generateEnhancedFallbackResponse(
    message: string
  ): EnhancedCopilotResponse {
    const module = this.currentContext.currentModule || 'Platform';

    return {
      id: this.generateId(),
      message: this.generateIntelligentFallbackMessage(message, module),
      timestamp: new Date().toISOString(),
      confidence: 0.75,
      suggestions: this.getModuleSpecificSuggestions(module),
      actions: this.getModuleSpecificActions(module),
      dataInsights: this.getModuleSpecificInsights(module),
      conversationId: this.conversationId || this.generateId(),
    };
  }

  private generateIntelligentFallbackMessage(
    message: string,
    module: string
  ): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('create') || lowerMessage.includes('add')) {
      return `I can help you create new items in ${module}. Here are the typical steps and requirements...`;
    }

    if (lowerMessage.includes('analyze') || lowerMessage.includes('report')) {
      return `For ${module} analysis, I can help you understand trends, generate reports, and identify insights...`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return `I'm here to help you with ${module}! I can provide guidance on features, best practices, and workflows...`;
    }

    return `I can assist you with ${module}. While I'm having connectivity issues, I can still provide guidance on features, workflows, and best practices.`;
  }

  private getContextualFallbackSuggestions(): string[] {
    const module = this.currentContext.currentModule;
    return this.getModuleSpecificSuggestions(module || 'Platform');
  }

  private getModuleSpecificSuggestions(module: string): string[] {
    const suggestionMap: { [key: string]: string[] } = {
      Dashboard: [
        'Show system overview',
        'Check recent activity',
        'View key metrics',
      ],
      'User Management': [
        'Create new user',
        'Manage user roles',
        'View user activity',
      ],
      RBAC: ['Create custom role', 'Assign permissions', 'Check access levels'],
      Analytics: ['Generate report', 'View trends', 'Export data'],
      'Audit Logs': [
        'Search recent events',
        'Export audit trail',
        'Security analysis',
      ],
      Notifications: [
        'Send notification',
        'Create template',
        'Check delivery status',
      ],
      Settings: [
        'Update configuration',
        'Manage preferences',
        'System settings',
      ],
    };

    return (
      suggestionMap[module] || ['Get help', 'Show features', 'Best practices']
    );
  }

  private getModuleSpecificActions(module: string): ActionableItem[] {
    const actionMap: { [key: string]: ActionableItem[] } = {
      'User Management': [
        {
          id: 'create-user',
          title: 'Create New User',
          description: 'Add a new user to your organization',
          actionType: 'create-user',
          icon: '👤',
          difficulty: 'Easy',
        },
      ],
      Analytics: [
        {
          id: 'generate-report',
          title: 'Generate Report',
          description: 'Create a comprehensive analytics report',
          actionType: 'generate-report',
          icon: '📊',
          difficulty: 'Medium',
        },
      ],
    };

    return actionMap[module] || [];
  }

  private getModuleSpecificInsights(module: string): DataInsight[] {
    const insightMap: { [key: string]: DataInsight[] } = {
      Analytics: [
        {
          title: 'User Growth',
          value: '15% this month',
          type: 'positive',
          icon: '📈',
        },
      ],
      'Audit Logs': [
        {
          title: 'Security Status',
          value: 'All systems secure',
          type: 'neutral',
          icon: '🔒',
        },
      ],
    };

    return insightMap[module] || [];
  }

  private getDefaultSuggestions(): ContextualSuggestion[] {
    return [
      {
        id: 'help-1',
        text: 'Show me around the platform',
        category: 'Getting Started',
        module: 'Platform',
        relevance: 0.9,
      },
      {
        id: 'help-2',
        text: 'What can I do here?',
        category: 'Help',
        module: 'Platform',
        relevance: 0.8,
      },
    ];
  }

  private getDefaultInsights(): ActionableInsight[] {
    return [
      {
        id: 'insight-1',
        title: 'Platform Health',
        description: 'Your platform is running smoothly',
        priority: 'low',
        category: 'System',
        actions: ['View details', 'Check metrics'],
      },
    ];
  }

  private generateDefaultAnalysis(type: string): IntelligentAnalysis {
    return {
      id: this.generateId(),
      type: type,
      summary: `Analysis for ${type} is currently unavailable, but I can still provide general guidance.`,
      keyFindings: ['Service temporarily unavailable'],
      recommendations: ['Please try again later', 'Check system status'],
      confidence: 0.5,
      generatedAt: new Date().toISOString(),
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Utility methods for enhanced functionality
  async getQuickActions(): Promise<ActionableItem[]> {
    const module = this.currentContext.currentModule;
    return this.getModuleSpecificActions(module || 'Platform');
  }

  async getDataInsights(): Promise<DataInsight[]> {
    const module = this.currentContext.currentModule;
    return this.getModuleSpecificInsights(module || 'Platform');
  }

  // Conversation management
  clearConversation() {
    this.conversationId = '';
  }

  getConversationId(): string {
    return this.conversationId;
  }
}
