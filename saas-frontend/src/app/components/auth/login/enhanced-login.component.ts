import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EnhancedAuthService } from '../../../core/services/enhanced-auth.service';

@Component({
  selector: 'app-enhanced-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enhanced-login.component.html',
  styleUrls: ['./enhanced-login.component.scss']
})
export class EnhancedLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // UI States
  isLoading = false;
  isAuthenticated = false;
  errorMessage = '';
  loadingMessage = 'Authenticating...';
  private returnUrl = '/dashboard';

  constructor(
    private authService: EnhancedAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🔄 [Platform Login] Initializing...');
    
    // Get return URL from route parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Check if already authenticated
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        console.log('🔍 [Platform Login] Auth state:', isAuth);
        if (isAuth) {
          console.log('✅ [Platform Login] User already authenticated, redirecting to dashboard');
          this.router.navigate([this.returnUrl]);
        }
      });

    // Listen for authentication errors
    this.authService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          this.errorMessage = error;
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Login with Azure AD - Platform Admins Only
   */
  async loginWithAzureAD(): Promise<void> {
    try {
      console.log('🔐 [Platform Login] Initiating Azure AD login for platform admin...');
      this.isLoading = true;
      this.errorMessage = '';
      this.loadingMessage = 'Redirecting to Azure AD...';
      
      // Store the return URL for post-login redirect
      sessionStorage.setItem('authReturnUrl', this.returnUrl);
      
      // Initiate Azure AD login
      await this.authService.loginWithAzureAD();
      
      // The actual redirect will happen via MSAL
      // After successful login, the auth service will handle the redirect
    } catch (error: any) {
      console.error('❌ [Platform Login] Azure AD login failed:', error);
      this.errorMessage = error.message || 'Azure AD login failed. Please try again.';
      this.isLoading = false;
    }
  }
}
