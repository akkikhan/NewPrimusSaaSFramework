import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { DialogService, DialogConfig, DialogResult } from '../../services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isVisible" class="dialog-overlay" (click)="onOverlayClick()">
      <div class="dialog-container" (click)="$event.stopPropagation()">
        <!-- Consistent Header -->
        <div class="dialog-header" [class]="'dialog-' + currentConfig?.type">
          <div class="dialog-icon">
            <span [innerHTML]="getIcon()"></span>
          </div>
          <h3 class="dialog-title">{{currentConfig?.title}}</h3>
          <button 
            *ngIf="!currentConfig?.disableClose" 
            class="dialog-close" 
            (click)="onCancel()" 
            aria-label="Close dialog">×</button>
        </div>
        
        <!-- Consistent Body -->
        <div class="dialog-body">
          <p class="dialog-message" [innerHTML]="currentConfig?.message"></p>
        </div>
        
        <!-- Consistent Footer with Standard Button Layout -->
        <div class="dialog-footer">
          <button 
            *ngIf="currentConfig?.showCancel" 
            class="btn btn-secondary btn-cancel" 
            [disabled]="buttonsDisabled"
            (click)="onCancel()">
            {{currentConfig?.cancelText || 'Cancel'}}
          </button>
          <button 
            class="btn btn-confirm" 
            [class]="getConfirmButtonClass()" 
            [disabled]="buttonsDisabled"
            (click)="onConfirm()">
            {{currentConfig?.confirmText || 'OK'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Consistent Overlay */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
      backdrop-filter: blur(2px);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Consistent Container */
    .dialog-container {
      background: white;
      border-radius: 12px;
      min-width: 400px;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    @keyframes slideIn {
      from { 
        transform: translateY(-50px);
        opacity: 0;
      }
      to { 
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Consistent Header */
    .dialog-header {
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid #e0e0e0;
      position: relative;
      min-height: 60px;
    }

    /* Consistent Header Types */
    .dialog-info {
      background: linear-gradient(135deg, #2196f3, #21cbf3);
      color: white;
    }

    .dialog-success {
      background: linear-gradient(135deg, #4caf50, #81c784);
      color: white;
    }

    .dialog-warning {
      background: linear-gradient(135deg, #ff9800, #ffb74d);
      color: white;
    }

    .dialog-error {
      background: linear-gradient(135deg, #f44336, #ef5350);
      color: white;
    }

    .dialog-confirm {
      background: linear-gradient(135deg, #673ab7, #9575cd);
      color: white;
    }

    /* Consistent Icon */
    .dialog-icon {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    /* Consistent Title */
    .dialog-title {
      flex: 1;
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
      line-height: 1.2;
    }

    /* Consistent Close Button */
    .dialog-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 2rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.3s ease;
      flex-shrink: 0;
    }

    .dialog-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Consistent Body */
    .dialog-body {
      padding: 2rem 1.5rem;
      line-height: 1.6;
      color: #2c3e50;
      min-height: 60px;
      display: flex;
      align-items: center;
    }

    .dialog-message {
      margin: 0;
      font-size: 1rem;
      line-height: 1.5;
    }

    /* Consistent Footer */
    .dialog-footer {
      padding: 1rem 1.5rem 1.5rem;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      min-height: 70px;
      align-items: center;
    }

    /* Consistent Buttons */
    .btn {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      transition: all 0.3s ease;
      min-width: 100px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn:active {
      transform: translateY(0);
    }

    /* Consistent Button Types */
    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

         .btn-primary {
       background: #e5006e;
       color: white;
       border-radius: 8px;
       box-shadow: 0 2px 4px rgba(229, 0, 110, 0.2);
     }

     .btn-primary:hover {
       background: #c2005a;
       box-shadow: 0 4px 8px rgba(229, 0, 110, 0.3);
     }

    .btn-success {
      background: #4caf50;
      color: white;
    }

    .btn-success:hover {
      background: #388e3c;
    }

    .btn-warning {
      background: #ff9800;
      color: white;
    }

    .btn-warning:hover {
      background: #f57c00;
    }

    .btn-danger {
      background: #f44336;
      color: white;
    }

    .btn-danger:hover {
      background: #d32f2f;
    }

    /* Consistent Button Layout */
    .btn-cancel {
      order: 1;
    }

    .btn-confirm {
      order: 2;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dialog-container {
        min-width: 90vw;
        margin: 1rem;
        max-height: 90vh;
      }
      
      .dialog-header {
        padding: 1rem;
        min-height: 50px;
      }
      
      .dialog-body {
        padding: 1.5rem 1rem;
        min-height: 50px;
      }
      
      .dialog-footer {
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        min-height: auto;
      }
      
      .btn {
        min-width: auto;
        width: 100%;
      }
      
      .dialog-title {
        font-size: 1.1rem;
      }
      
      .dialog-message {
        font-size: 0.95rem;
      }
    }

    /* Accessibility */
    .dialog-overlay:focus {
      outline: none;
    }

    .btn:focus {
      outline: 2px solid #2196f3;
      outline-offset: 2px;
    }

    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .dialog-container {
        border: 2px solid #000;
      }
      
      .dialog-header {
        border-bottom: 2px solid #000;
      }
      
      .dialog-footer {
        border-top: 2px solid #000;
      }
    }
  `]
})
export class DialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isVisible = false;
  currentConfig: DialogConfig | null = null;
  buttonsDisabled = false;

  constructor(private dialogService: DialogService) {}

  ngOnInit() {
    this.dialogService.dialog$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.currentConfig = config;
        this.isVisible = true;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getIcon(): string {
    switch (this.currentConfig?.type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      case 'confirm': return '?';
      default: return 'ℹ';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.currentConfig?.type) {
      case 'success': return 'btn btn-success';
      case 'error': return 'btn btn-danger';
      case 'warning': return 'btn btn-warning';
      case 'confirm': return 'btn btn-primary';
      default: return 'btn btn-primary';
    }
  }

  onConfirm() {
    this.close(true);
  }

  onCancel() {
    this.close(false);
  }

  onOverlayClick() {
    if (this.currentConfig?.type !== 'confirm') {
      this.close(false);
    }
  }

  disableButtons() {
    this.buttonsDisabled = true;
  }

  enableButtons() {
    this.buttonsDisabled = false;
  }

  private close(confirmed: boolean) {
    this.isVisible = false;
    this.dialogService.sendResult({
      confirmed,
      dialog: {
        disableButtons: () => this.disableButtons(),
        enableButtons: () => this.enableButtons(),
        close: () => this.close(false)
      }
    });
    
    // Reset after animation
    setTimeout(() => {
      this.currentConfig = null;
      this.buttonsDisabled = false;
    }, 300);
  }
}