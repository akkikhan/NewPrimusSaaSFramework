import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-card">
        <div class="unauthorized-content">
          <!-- Icon -->
          <div class="unauthorized-icon">
            🚫
          </div>
          
          <!-- Title and Message -->
          <h1>Access Denied</h1>
          <p class="unauthorized-message">
            You don't have permission to access this resource. 
            Please contact your administrator if you believe this is an error.
          </p>
          
          <!-- User Info -->
          <div class="user-info" *ngIf="userProfile$ | async as user">
            <div class="user-details">
              <strong>Current User:</strong> {{user.name}} ({{user.email}})
            </div>
            <div class="user-roles">
              <strong>Your Roles:</strong> 
              <span class="role-badge" *ngFor="let role of user.roles">{{role}}</span>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="unauthorized-actions">
            <button class="btn-primary" (click)="goToDashboard()">
              🏠 Go to Dashboard
            </button>
            <button class="btn-secondary" (click)="goBack()">
              ← Go Back
            </button>
            <button class="btn-outline" (click)="logout()">
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      padding: 2rem;
    }

    .unauthorized-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      padding: 3rem;
      width: 100%;
      max-width: 500px;
      text-align: center;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .unauthorized-icon {
      font-size: 5rem;
      margin-bottom: 1.5rem;
      opacity: 0.8;
    }

    h1 {
      color: #2c3e50;
      margin: 0 0 1rem 0;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .unauthorized-message {
      color: #7f8c8d;
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .user-info {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .user-details,
    .user-roles {
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .user-roles:last-child {
      margin-bottom: 0;
    }

    .role-badge {
      display: inline-block;
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      margin-left: 0.5rem;
      margin-top: 0.25rem;
    }

    .unauthorized-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn-primary,
    .btn-secondary,
    .btn-outline {
      padding: 0.875rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e9ecef;
      transform: translateY(-2px);
    }

    .btn-outline {
      background: white;
      color: #e74c3c;
      border: 1px solid #e74c3c;
    }

    .btn-outline:hover {
      background: #e74c3c;
      color: white;
    }

    @media (max-width: 768px) {
      .unauthorized-container {
        padding: 1rem;
      }
      
      .unauthorized-card {
        padding: 2rem;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      .unauthorized-actions {
        gap: 0.75rem;
      }
    }
  `]
})
export class UnauthorizedComponent {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  get userProfile$() {
    return this.authService.currentUser$;
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    window.history.back();
  }

  logout(): void {
    this.authService.logout();
  }
} 