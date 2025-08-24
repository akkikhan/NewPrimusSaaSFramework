import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, ToastConfig } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts" 
        class="toast" 
        [class]="'toast-' + toast.type"
        >
        <div class="toast-icon">
          <span [innerHTML]="getIcon(toast.type)"></span>
        </div>
        <div class="toast-content">
          <div class="toast-title" *ngIf="toast.title">{{toast.title}}</div>
          <div class="toast-message">{{toast.message}}</div>
        </div>
        <button class="toast-close" (click)="removeToast(toast.id)" aria-label="Close toast">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      color: white;
      min-width: 300px;
      max-width: 400px;
      animation: slideInRight 0.3s ease;
    }

    .toast-success {
      background: linear-gradient(135deg, #4caf50, #81c784);
    }

    .toast-error {
      background: linear-gradient(135deg, #f44336, #ef5350);
    }

    .toast-warning {
      background: linear-gradient(135deg, #ff9800, #ffb74d);
    }

    .toast-info {
      background: linear-gradient(135deg, #2196f3, #21cbf3);
    }

    .toast-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-weight: 600;
      font-size: 0.95rem;
      margin-bottom: 4px;
    }

    .toast-message {
      font-size: 0.9rem;
      line-height: 1.4;
      opacity: 0.95;
    }

    .toast-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.3s ease;
      flex-shrink: 0;
      opacity: 0.8;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.2);
      opacity: 1;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
      
      .toast {
        min-width: auto;
        max-width: none;
      }
    }
  `],

})
export class ToastComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  toasts: ToastConfig[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.toastService.toasts$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  removeToast(id: string) {
    this.toastService.remove(id);
  }
} 