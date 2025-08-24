import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DialogService } from '../../shared/services/dialog.service';

interface CustomerLead {
  id?: string;
  customerName: string;
  contactPerson: string;
  contactEmail: string;
  phoneNumber: string;
  company: {
    industry: string;
    size: string;
    website: string;
    description: string;
  };
  businessRequirements: {
    integrationType: string;
    projectScope: string;
    budget: string;
    timeline: string;
    painPoints: string[];
    successCriteria: string;
  };
  interestedModules: string[];
  leadSource: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
  assignedTo: string;
  createdAt: Date;
  lastContact?: Date;
  notes: string;
  proposal?: {
    price: number;
    modules: string[];
    timeline: string;
    terms: string;
  };
}

@Component({
  selector: 'app-customer-integration',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="customer-integration-container">
      <div class="page-header">
        <div class="header-content">
          <h1>🎯 Customer Integration Pipeline</h1>
          <p>Manage sales leads, proposals, and customer acquisition</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="showNewLeadForm = true">
            ➕ New Customer Lead
          </button>
          <!-- Onboarding is platform-admin only; hide public link -->
          <button class="btn-secondary" (click)="exportSalesData()">
            📊 Export Sales Data
          </button>
        </div>
      </div>

      <!-- Sales Pipeline Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🚀</div>
          <div class="stat-content">
            <h3>{{getTotalLeads()}}</h3>
            <p>Total Leads</p>
            <small>+{{getNewLeadsThisMonth()}} this month</small>
          </div>
        </div>
        <div class="stat-card high-priority">
          <div class="stat-icon">🔥</div>
          <div class="stat-content">
            <h3>{{getHotLeads()}}</h3>
            <p>Hot Leads</p>
            <small>High priority prospects</small>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💼</div>
          <div class="stat-content">
            <h3>{{getActiveProposals()}}</h3>
            <p>Active Proposals</p>
            <small>Awaiting decision</small>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>{{getWonDeals()}}</h3>
            <p>Won Deals</p>
            <small>\${{getRevenueThisMonth()}}k this month</small>
          </div>
        </div>
      </div>

      <!-- New Lead Form -->
      <div *ngIf="showNewLeadForm" class="modal-overlay" (click)="closeModal($event)">
        <div class="lead-form-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🎯 New Customer Lead</h2>
            <button class="close-btn" (click)="showNewLeadForm = false">✕</button>
          </div>
          
          <form [formGroup]="leadForm" (ngSubmit)="submitLead()">
            <div class="form-sections">
              <!-- Contact Information -->
              <div class="form-section">
                <h3>👤 Contact Information</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Company Name *</label>
                    <input type="text" formControlName="customerName" placeholder="Acme Corporation">
                  </div>
                  <div class="form-group">
                    <label>Contact Person *</label>
                    <input type="text" formControlName="contactPerson" placeholder="John Smith">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Email *</label>
                    <input type="email" formControlName="contactEmail" placeholder="john@acme.com">
                  </div>
                  <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" formControlName="phoneNumber" placeholder="+1-555-123-4567">
                  </div>
                </div>
              </div>

              <!-- Company Details -->
              <div class="form-section">
                <h3>🏢 Company Details</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Industry *</label>
                    <select formControlName="industry">
                      <option value="">Select Industry</option>
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance</option>
                      <option value="retail">Retail</option>
                      <option value="education">Education</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Company Size</label>
                    <select formControlName="companySize">
                      <option value="">Select Size</option>
                      <option value="startup">Startup (1-10)</option>
                      <option value="small">Small (11-50)</option>
                      <option value="medium">Medium (51-200)</option>
                      <option value="large">Large (201-1000)</option>
                      <option value="enterprise">Enterprise (1000+)</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>Website</label>
                  <input type="url" formControlName="website" placeholder="https://acme.com">
                </div>
                <div class="form-group">
                  <label>Company Description</label>
                  <textarea formControlName="description" 
                           placeholder="Brief description of their business..."></textarea>
                </div>
              </div>

              <!-- Business Requirements -->
              <div class="form-section">
                <h3>💼 Business Requirements</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Integration Type</label>
                    <select formControlName="integrationType">
                      <option value="full-platform">Full Platform Integration</option>
                      <option value="specific-modules">Specific Modules Only</option>
                      <option value="custom-solution">Custom Solution</option>
                      <option value="consultation">Consultation First</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Project Budget</label>
                    <select formControlName="budget">
                      <option value="under-10k">Under \$10k</option>
                      <option value="10k-50k">\$10k - \$50k</option>
                      <option value="50k-100k">\$50k - \$100k</option>
                      <option value="100k-500k">\$100k - \$500k</option>
                      <option value="500k-plus">\$500k+</option>
                      <option value="not-disclosed">Not Disclosed</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Timeline</label>
                    <select formControlName="timeline">
                      <option value="immediate">Immediate (ASAP)</option>
                      <option value="1-month">1 Month</option>
                      <option value="3-months">3 Months</option>
                      <option value="6-months">6 Months</option>
                      <option value="12-months">12+ Months</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Lead Priority</label>
                    <select formControlName="priority">
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>Current Pain Points</label>
                  <div class="pain-points-grid">
                    <div *ngFor="let painPoint of availablePainPoints" class="pain-point-option">
                      <input type="checkbox" 
                             [id]="painPoint.id" 
                             [value]="painPoint.id"
                             (change)="togglePainPoint(painPoint.id, $event)">
                      <label [for]="painPoint.id">{{painPoint.label}}</label>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Success Criteria</label>
                  <textarea formControlName="successCriteria" 
                           placeholder="What would make this project successful for them?"></textarea>
                </div>
              </div>

              <!-- Interested Modules -->
              <div class="form-section">
                <h3>🔧 Interested Modules</h3>
                <div class="modules-grid">
                  <div *ngFor="let module of availableModules" class="module-option">
                    <input type="checkbox" 
                           [id]="module.id" 
                           [value]="module.id"
                           (change)="toggleModule(module.id, $event)">
                    <label [for]="module.id">
                      <span class="module-icon">{{module.icon}}</span>
                      <span class="module-name">{{module.name}}</span>
                      <span class="module-desc">{{module.description}}</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Lead Source & Assignment -->
              <div class="form-section">
                <h3>📊 Lead Details</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Lead Source</label>
                    <select formControlName="leadSource">
                      <option value="website">Website Inquiry</option>
                      <option value="referral">Referral</option>
                      <option value="cold-outreach">Cold Outreach</option>
                      <option value="social-media">Social Media</option>
                      <option value="conference">Conference/Event</option>
                      <option value="partner">Partner Channel</option>
                      <option value="advertising">Advertising</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Assign To</label>
                    <select formControlName="assignedTo">
                      <option value="sales-team">Sales Team</option>
                      <option value="technical-sales">Technical Sales</option>
                      <option value="account-manager">Account Manager</option>
                      <option value="ceo">CEO</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>Initial Notes</label>
                  <textarea formControlName="notes" 
                           placeholder="Any additional notes about this lead..."></textarea>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="showNewLeadForm = false">
                Cancel
              </button>
              <button type="submit" class="btn-primary" [disabled]="!leadForm.valid || isSubmitting">
                <span *ngIf="!isSubmitting">💼 Add to Pipeline</span>
                <span *ngIf="isSubmitting" class="loading">Adding...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Sales Pipeline -->
      <div class="pipeline-section">
        <div class="section-header">
          <h2>Sales Pipeline</h2>
          <div class="pipeline-filters">
            <select [(ngModel)]="statusFilter" (change)="filterLeads()">
              <option value="">All Status</option>
              <option value="new">New Leads</option>
              <option value="contacted">Contacted</option>
              <option value="proposal">Proposal Sent</option>
              <option value="negotiation">In Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <select [(ngModel)]="priorityFilter" (change)="filterLeads()">
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div class="pipeline-grid">
          <div *ngFor="let lead of filteredLeads" class="lead-card">
            <div class="card-header">
              <div class="lead-info">
                <h3>{{lead.customerName}}</h3>
                <p>{{lead.contactPerson}} • {{lead.contactEmail}}</p>
              </div>
              <div class="lead-badges">
                <span class="priority-badge" [class]="'priority-' + lead.priority">
                  {{getPriorityLabel(lead.priority)}}
                </span>
                <span class="status-badge" [class]="'status-' + lead.status">
                  {{getStatusLabel(lead.status)}}
                </span>
              </div>
            </div>

            <div class="card-content">
              <div class="lead-details">
                <div class="detail-item">
                  <label>Industry:</label>
                  <span>{{lead.company.industry}}</span>
                </div>
                <div class="detail-item">
                  <label>Budget:</label>
                  <span>{{getBudgetLabel(lead.businessRequirements.budget)}}</span>
                </div>
                <div class="detail-item">
                  <label>Timeline:</label>
                  <span>{{getTimelineLabel(lead.businessRequirements.timeline)}}</span>
                </div>
                <div class="detail-item">
                  <label>Lead Source:</label>
                  <span>{{getLeadSourceLabel(lead.leadSource)}}</span>
                </div>
              </div>

              <div class="interested-modules">
                <label>Interested Modules:</label>
                <div class="module-tags">
                  <span *ngFor="let moduleId of lead.interestedModules" class="module-tag">
                    {{getModuleName(moduleId)}}
                  </span>
                </div>
              </div>

              <div class="lead-notes" *ngIf="lead.notes">
                <label>Notes:</label>
                <p>{{lead.notes}}</p>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn-action btn-contact" (click)="contactLead(lead)">
                📞 Contact
              </button>
              <button class="btn-action btn-proposal" (click)="createProposal(lead)">
                📄 Proposal
              </button>
              <button class="btn-action btn-convert" (click)="convertToCustomer(lead)">
                🚀 Convert
              </button>
              <div class="action-dropdown">
                <button class="btn-action btn-more" (click)="toggleLeadActions(lead.id!)">⋯</button>
                <div *ngIf="showActionsFor === lead.id" class="dropdown-menu">
                  <button (click)="editLead(lead)">✏️ Edit</button>
                  <button (click)="markAsLost(lead)">❌ Mark Lost</button>
                  <button (click)="deleteLead(lead)">🗑️ Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .customer-integration-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header-content h1 {
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-card.high-priority {
      background: linear-gradient(135deg, #ff6b6b, #ee5a52);
      color: white;
    }

    .stat-card.success {
      background: linear-gradient(135deg, #51cf66, #40c057);
      color: white;
    }

    .stat-icon {
      font-size: 2.5rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.75rem;
      border-radius: 12px;
    }

    .stat-content h3 {
      margin: 0;
      font-size: 2rem;
    }

    .stat-content p {
      margin: 0;
      opacity: 0.9;
    }

    .stat-content small {
      font-size: 0.8rem;
      opacity: 0.7;
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

    .lead-form-modal {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .form-sections {
      padding: 2rem;
    }

    .form-section {
      margin-bottom: 2rem;
    }

    .form-section h3 {
      color: #2c3e50;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }

    .pain-points-grid, .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .pain-point-option, .module-option {
      position: relative;
    }

    .pain-point-option input, .module-option input {
      position: absolute;
      opacity: 0;
    }

    .pain-point-option label, .module-option label {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .pain-point-option input:checked + label,
    .module-option input:checked + label {
      border-color: #2196f3;
      background: #f0f8ff;
    }

    .module-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .module-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .module-desc {
      font-size: 0.85rem;
      color: #7f8c8d;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid #e0e0e0;
    }

    .pipeline-section {
      margin-top: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .pipeline-filters {
      display: flex;
      gap: 1rem;
    }

    .pipeline-grid {
      display: grid;
      gap: 1.5rem;
    }

    .lead-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .lead-info h3 {
      margin: 0;
      color: #2c3e50;
    }

    .lead-info p {
      margin: 0.25rem 0 0 0;
      color: #7f8c8d;
    }

    .lead-badges {
      display: flex;
      gap: 0.5rem;
    }

    .priority-badge, .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .priority-urgent {
      background: #ffebee;
      color: #c62828;
    }

    .priority-high {
      background: #fff3e0;
      color: #f57c00;
    }

    .priority-medium {
      background: #e3f2fd;
      color: #1565c0;
    }

    .priority-low {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-new {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-contacted {
      background: #e3f2fd;
      color: #1565c0;
    }

    .status-proposal {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-negotiation {
      background: #fce4ec;
      color: #ad1457;
    }

    .status-won {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-lost {
      background: #ffebee;
      color: #c62828;
    }

    .lead-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
    }

    .detail-item label {
      font-weight: 600;
      color: #2c3e50;
    }

    .interested-modules {
      margin-bottom: 1rem;
    }

    .module-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .module-tag {
      background: #e3f2fd;
      color: #1565c0;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .lead-notes {
      margin-bottom: 1rem;
    }

    .lead-notes label {
      font-weight: 600;
      color: #2c3e50;
    }

    .lead-notes p {
      margin: 0.5rem 0 0 0;
      color: #7f8c8d;
    }

    .card-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      position: relative;
    }

    .btn-action {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .btn-contact {
      background: #4caf50;
      color: white;
    }

    .btn-proposal {
      background: #ff9800;
      color: white;
    }

    .btn-convert {
      background: #2196f3;
      color: white;
    }

    .btn-more {
      background: #f5f5f5;
      color: #2c3e50;
    }

    .action-dropdown {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
    }

    .dropdown-menu button {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
    }

    .dropdown-menu button:hover {
      background: #f5f5f5;
    }

    .loading {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .loading::after {
      content: '';
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
  `]
})
export class CustomerIntegrationComponent implements OnInit {
  leadForm: FormGroup;
  showNewLeadForm = false;
  isSubmitting = false;
  statusFilter = '';
  priorityFilter = '';
  showActionsFor: string | null = null;
  
  customerLeads: CustomerLead[] = [];
  filteredLeads: CustomerLead[] = [];
  selectedPainPoints: string[] = [];
  selectedModules: string[] = [];

  availableModules = [
    {
      id: 'authentication',
      name: 'User Management',
      icon: '👥',
      description: 'Complete user authentication and management'
    },
    {
      id: 'rbac',
      name: 'RBAC',
      icon: '🛡️',
      description: 'Role-based access control system'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📊',
      description: 'Business intelligence and reporting'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: '🔔',
      description: 'Multi-channel communication system'
    },
    {
      id: 'audit',
      name: 'Audit Logs',
      icon: '📝',
      description: 'Compliance and audit trail system'
    },
    {
      id: 'copilot',
      name: 'AI Copilot',
      icon: '🤖',
      description: 'AI-powered assistance and automation'
    }
  ];

  availablePainPoints = [
    { id: 'auth-complexity', label: 'Authentication is too complex' },
    { id: 'user-management', label: 'User management is manual' },
    { id: 'no-analytics', label: 'Lack of user analytics' },
    { id: 'compliance-issues', label: 'Compliance and audit challenges' },
    { id: 'notification-mess', label: 'Notification system is fragmented' },
    { id: 'scaling-problems', label: 'Scaling and performance issues' },
    { id: 'security-concerns', label: 'Security vulnerabilities' },
    { id: 'integration-time', label: 'Too much time on infrastructure' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private dialogService: DialogService,
    private router: Router
  ) {
    this.leadForm = this.createForm();
  }

  ngOnInit() {
    this.loadCustomerLeads();
  }

  createForm(): FormGroup {
    return this.fb.group({
      customerName: ['', Validators.required],
      contactPerson: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      industry: ['', Validators.required],
      companySize: [''],
      website: [''],
      description: [''],
      integrationType: ['full-platform'],
      budget: ['not-disclosed'],
      timeline: ['3-months'],
      priority: ['medium'],
      successCriteria: [''],
      leadSource: ['website'],
      assignedTo: ['sales-team'],
      notes: ['']
    });
  }

  loadCustomerLeads() {
    const saved = localStorage.getItem('customerLeads');
    if (saved) {
      this.customerLeads = JSON.parse(saved);
      this.filterLeads();
    }
  }

  saveCustomerLeads() {
    localStorage.setItem('customerLeads', JSON.stringify(this.customerLeads));
  }

  togglePainPoint(painPointId: string, event: any) {
    if (event.target.checked) {
      this.selectedPainPoints.push(painPointId);
    } else {
      this.selectedPainPoints = this.selectedPainPoints.filter(id => id !== painPointId);
    }
  }

  toggleModule(moduleId: string, event: any) {
    if (event.target.checked) {
      this.selectedModules.push(moduleId);
    } else {
      this.selectedModules = this.selectedModules.filter(id => id !== moduleId);
    }
  }

  submitLead() {
    if (!this.leadForm.valid) {
      this.dialogService.error('Validation Error', 'Please fill all required fields.');
      return;
    }

    this.isSubmitting = true;

    try {
      const formData = this.leadForm.value;
      const lead: CustomerLead = {
        id: Date.now().toString(),
        customerName: formData.customerName,
        contactPerson: formData.contactPerson,
        contactEmail: formData.contactEmail,
        phoneNumber: formData.phoneNumber,
        company: {
          industry: formData.industry,
          size: formData.companySize,
          website: formData.website,
          description: formData.description
        },
        businessRequirements: {
          integrationType: formData.integrationType,
          projectScope: formData.integrationType,
          budget: formData.budget,
          timeline: formData.timeline,
          painPoints: [...this.selectedPainPoints],
          successCriteria: formData.successCriteria
        },
        interestedModules: [...this.selectedModules],
        leadSource: formData.leadSource,
        priority: formData.priority,
        status: 'new',
        assignedTo: formData.assignedTo,
        createdAt: new Date(),
        notes: formData.notes
      };

      this.customerLeads.unshift(lead);
      this.saveCustomerLeads();
      this.filterLeads();

      this.showNewLeadForm = false;
      this.leadForm.reset();
      this.selectedPainPoints = [];
      this.selectedModules = [];

      this.dialogService.success('Success', `Lead "${lead.customerName}" added to pipeline successfully!`);

    } catch (error) {
      this.dialogService.error('Error', 'Failed to add lead to pipeline');
    } finally {
      this.isSubmitting = false;
    }
  }

  contactLead(lead: CustomerLead) {
    lead.status = 'contacted';
    lead.lastContact = new Date();
    this.saveCustomerLeads();
    this.dialogService.success('Success', `Marked ${lead.customerName} as contacted`);
  }

  createProposal(lead: CustomerLead) {
    // In real implementation, this would open a proposal creation form
    lead.status = 'proposal';
    this.saveCustomerLeads();
    this.dialogService.success('Success', `Proposal process initiated for ${lead.customerName}`);
  }

  convertToCustomer(lead: CustomerLead) {
    // This would redirect to the technical tenant onboarding process
    lead.status = 'won';
    this.saveCustomerLeads();
    
    this.dialogService.confirm(
      'Convert to Customer',
      `Convert ${lead.customerName} to a customer and start technical onboarding?`,
      'Convert & Onboard',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        // Navigate to tenant onboarding with pre-filled data
    // Onboarding is restricted to platform admins; do not navigate here from public/customer pages
      }
    });
  }

  toggleLeadActions(leadId: string) {
    this.showActionsFor = this.showActionsFor === leadId ? null : leadId;
  }

  editLead(lead: CustomerLead) {
    // In real implementation, this would open an edit form
    this.dialogService.info('Edit Lead', 'Edit functionality would open here');
    this.showActionsFor = null;
  }

  markAsLost(lead: CustomerLead) {
    lead.status = 'lost';
    this.saveCustomerLeads();
    this.dialogService.success('Success', `Marked ${lead.customerName} as lost`);
    this.showActionsFor = null;
  }

  deleteLead(lead: CustomerLead) {
    this.dialogService.confirm(
      'Delete Lead',
      `Are you sure you want to delete ${lead.customerName}?`,
      'Delete',
      'Cancel'
    ).subscribe(result => {
      if (result.confirmed) {
        this.customerLeads = this.customerLeads.filter(l => l.id !== lead.id);
        this.saveCustomerLeads();
        this.filterLeads();
        this.dialogService.success('Success', 'Lead deleted successfully');
      }
    });
    this.showActionsFor = null;
  }

  exportSalesData() {
    const exportData = {
      leads: this.customerLeads,
      stats: {
        total: this.getTotalLeads(),
        hot: this.getHotLeads(),
        proposals: this.getActiveProposals(),
        won: this.getWonDeals()
      },
      exportDate: new Date()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-pipeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  filterLeads() {
    this.filteredLeads = this.customerLeads.filter(lead => {
      const statusMatch = !this.statusFilter || lead.status === this.statusFilter;
      const priorityMatch = !this.priorityFilter || lead.priority === this.priorityFilter;
      return statusMatch && priorityMatch;
    });
  }

  closeModal(event: any) {
    if (event.target.classList.contains('modal-overlay')) {
      this.showNewLeadForm = false;
    }
  }

  // Stats helper methods
  getTotalLeads(): number {
    return this.customerLeads.length;
  }

  getNewLeadsThisMonth(): number {
    const thisMonth = new Date().getMonth();
    return this.customerLeads.filter(lead => 
      new Date(lead.createdAt).getMonth() === thisMonth
    ).length;
  }

  getHotLeads(): number {
    return this.customerLeads.filter(lead => 
      lead.priority === 'high' || lead.priority === 'urgent'
    ).length;
  }

  getActiveProposals(): number {
    return this.customerLeads.filter(lead => 
      lead.status === 'proposal' || lead.status === 'negotiation'
    ).length;
  }

  getWonDeals(): number {
    return this.customerLeads.filter(lead => lead.status === 'won').length;
  }

  getRevenueThisMonth(): number {
    // Mock revenue calculation
    return this.getWonDeals() * 25; // Assume $25k average deal size
  }

  // Label helper methods
  getPriorityLabel(priority: string): string {
    const labels = {
      'urgent': '🔥 Urgent',
      'high': '⚡ High',
      'medium': '⚖️ Medium',
      'low': '📝 Low'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  getStatusLabel(status: string): string {
    const labels = {
      'new': 'New',
      'contacted': 'Contacted',
      'proposal': 'Proposal Sent',
      'negotiation': 'Negotiating',
      'won': 'Won',
      'lost': 'Lost'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getBudgetLabel(budget: string): string {
    const labels = {
      'under-10k': 'Under $10k',
      '10k-50k': '$10k - $50k',
      '50k-100k': '$50k - $100k',
      '100k-500k': '$100k - $500k',
      '500k-plus': '$500k+',
      'not-disclosed': 'Not Disclosed'
    };
    return labels[budget as keyof typeof labels] || budget;
  }

  getTimelineLabel(timeline: string): string {
    const labels = {
      'immediate': 'Immediate',
      '1-month': '1 Month',
      '3-months': '3 Months',
      '6-months': '6 Months',
      '12-months': '12+ Months'
    };
    return labels[timeline as keyof typeof labels] || timeline;
  }

  getLeadSourceLabel(source: string): string {
    const labels = {
      'website': 'Website',
      'referral': 'Referral',
      'cold-outreach': 'Cold Outreach',
      'social-media': 'Social Media',
      'conference': 'Conference',
      'partner': 'Partner',
      'advertising': 'Advertising',
      'other': 'Other'
    };
    return labels[source as keyof typeof labels] || source;
  }

  getModuleName(moduleId: string): string {
    const module = this.availableModules.find(m => m.id === moduleId);
    return module ? module.name : moduleId;
  }
} 