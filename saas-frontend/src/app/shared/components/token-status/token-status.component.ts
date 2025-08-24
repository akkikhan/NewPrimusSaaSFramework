import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TokenExpirationService, TokenInfo } from '../../../core/services/token-expiration.service';

@Component({
  selector: 'app-token-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showTokenStatus" class="token-status-container" [class.expiring-soon]="isExpiringSoon">
      <div class="token-status-content">
        <div class="token-info">
          <span class="token-icon" [class.warning]="isExpiringSoon" [class.danger]="isExpired">
            {{getTokenIcon()}}
          </span>
          <div class="token-details">
            <div class="token-time">
              <span *ngIf="!isExpired" class="time-remaining">
                {{formatTimeRemaining()}}
              </span>
              <span *ngIf="isExpired" class="expired-text">
                Session Expired
              </span>
            </div>
            <div class="token-label">
              {{getStatusLabel()}}
            </div>
          </div>
        </div>
        
        <div class="token-actions" *ngIf="!isExpired">
          <button 
            class="refresh-btn" 
            (click)="refreshToken()"
            [disabled]="isRefreshing"
            [title]="isRefreshing ? 'Refreshing...' : 'Refresh Token'">
            <span *ngIf="!isRefreshing" class="refresh-icon">🔄</span>
            <span *ngIf="isRefreshing" class="loading-spinner">⟳</span>
          </button>
        </div>
      </div>
      
      <!-- Progress bar for visual indication -->
      <div class="token-progress" *ngIf="!isExpired">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            [class.warning]="isExpiringSoon"
            [class.danger]="isExpired"
            [style.width.%]="getProgressPercentage()">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .token-status-container {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 200px;
      max-width: 300px;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .token-status-container:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .token-status-container.expiring-soon {
      border-color: #ff9800;
      background: linear-gradient(135deg, #fff3e0, #ffffff);
    }

    .token-status-container.expired {
      border-color: #f44336;
      background: linear-gradient(135deg, #ffebee, #ffffff);
    }

    .token-status-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .token-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .token-icon {
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #e8f5e8;
      color: #2e7d32;
      transition: all 0.3s ease;
    }

    .token-icon.warning {
      background: #fff3e0;
      color: #f57c00;
      animation: pulse 2s infinite;
    }

    .token-icon.danger {
      background: #ffebee;
      color: #c62828;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    .token-details {
      flex: 1;
    }

    .token-time {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .time-remaining {
      color: #2e7d32;
    }

    .time-remaining.warning {
      color: #f57c00;
    }

    .time-remaining.danger {
      color: #c62828;
    }

    .expired-text {
      color: #c62828;
    }

    .token-label {
      font-size: 0.85rem;
      color: #7f8c8d;
    }

    .token-actions {
      display: flex;
      align-items: center;
    }

    .refresh-btn {
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .refresh-btn:hover:not(:disabled) {
      background: #1976d2;
      transform: scale(1.1);
    }

    .refresh-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .refresh-icon {
      font-size: 1rem;
    }

    .loading-spinner {
      font-size: 1rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .token-progress {
      margin-top: 0.75rem;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #4caf50;
      transition: all 0.3s ease;
      border-radius: 2px;
    }

    .progress-fill.warning {
      background: #ff9800;
    }

    .progress-fill.danger {
      background: #f44336;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .token-status-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
        min-width: auto;
      }
      
      .token-status-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .token-actions {
        align-self: flex-end;
      }
    }

    /* Hide on very small screens */
    @media (max-width: 480px) {
      .token-status-container {
        display: none;
      }
    }
  `]
})
export class TokenStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private countdownTimer?: Subscription;

  showTokenStatus = false;
  isExpiringSoon = false;
  isExpired = false;
  isRefreshing = false;
  currentTokenInfo: TokenInfo | null = null;
  timeRemaining = '';

  constructor(private tokenExpirationService: TokenExpirationService) {}

  ngOnInit(): void {
    this.initializeTokenMonitoring();
    this.startCountdownTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownTimer) {
      this.countdownTimer.unsubscribe();
    }
  }

  private initializeTokenMonitoring(): void {
    // Subscribe to token info changes
    this.tokenExpirationService.tokenInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tokenInfo => {
        this.currentTokenInfo = tokenInfo;
        this.updateTokenStatus();
      });

    // Subscribe to expiration status
    this.tokenExpirationService.isExpiring$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isExpiring => {
        this.isExpiringSoon = isExpiring;
        this.updateTokenStatus();
      });
  }

  private updateTokenStatus(): void {
    if (this.currentTokenInfo) {
      this.showTokenStatus = true;
      this.isExpired = this.currentTokenInfo.isExpired;
      this.updateTimeRemaining();
    } else {
      this.showTokenStatus = false;
    }
  }

  private startCountdownTimer(): void {
    this.countdownTimer = interval(1000) // Update every second
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTimeRemaining();
      });
  }

  private updateTimeRemaining(): void {
    if (!this.currentTokenInfo) {
      this.timeRemaining = '';
      return;
    }

    const now = new Date();
    const expiresOn = this.currentTokenInfo.expiresOn;
    const diffMs = expiresOn.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      this.timeRemaining = 'Expired';
      this.isExpired = true;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      if (diffMinutes > 0) {
        this.timeRemaining = `${diffMinutes}m ${diffSeconds}s`;
      } else {
        this.timeRemaining = `${diffSeconds}s`;
      }
      
      this.isExpired = false;
    }
  }

  formatTimeRemaining(): string {
    return this.timeRemaining;
  }

  getStatusLabel(): string {
    if (this.isExpired) {
      return 'Session expired';
    } else if (this.isExpiringSoon) {
      return 'Expiring soon';
    } else {
      return 'Session active';
    }
  }

  getTokenIcon(): string {
    if (this.isExpired) {
      return '⏰';
    } else if (this.isExpiringSoon) {
      return '⚠️';
    } else {
      return '🔒';
    }
  }

  getProgressPercentage(): number {
    if (!this.currentTokenInfo || this.isExpired) {
      return 0;
    }

    // Calculate progress based on token lifetime
    // Assuming 1 hour token lifetime (3600000 ms)
    const tokenLifetime = 3600000; // 1 hour in milliseconds
    const now = new Date();
    const expiresOn = this.currentTokenInfo.expiresOn;
    const timeElapsed = expiresOn.getTime() - now.getTime();
    
    const percentage = Math.max(0, Math.min(100, (timeElapsed / tokenLifetime) * 100));
    return percentage;
  }

  async refreshToken(): Promise<void> {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    console.log('🔄 [Token Status] Manual token refresh requested');

    try {
      const success = await this.tokenExpirationService.refreshToken();
      if (success) {
        console.log('✅ [Token Status] Token refreshed successfully');
      } else {
        console.warn('⚠️ [Token Status] Token refresh failed');
      }
    } catch (error) {
      console.error('❌ [Token Status] Token refresh error:', error);
    } finally {
      this.isRefreshing = false;
    }
  }
} 