import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { RbacService } from '../../core/services/rbac.service';

@Directive({
  selector: '[appHasRole]'
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasAccess = false;

  @Input() set appHasRole(roles: string | string[]) {
    this.roles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  @Input() appHasRoleRequireAll: boolean = false;

  private roles: string[] = [];

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RbacService
  ) {}

  ngOnInit(): void {
    // Subscribe to user context changes
    this.rbacService.userContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (this.roles.length === 0) {
      this.setAccess(true);
      return;
    }

    const checkMethod = this.appHasRoleRequireAll ? 
      this.rbacService.hasAllRoles(this.roles) : 
      this.rbacService.hasAnyRole(this.roles);

    checkMethod
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasAccess: boolean) => this.setAccess(hasAccess));
  }

  private setAccess(hasAccess: boolean): void {
    if (hasAccess && !this.hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasAccess = true;
    } else if (!hasAccess && this.hasAccess) {
      this.viewContainer.clear();
      this.hasAccess = false;
    }
  }
}

@Directive({
  selector: '[appHasPermission]'
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasAccess = false;

  @Input() set appHasPermission(permissions: string | string[]) {
    this.permissions = Array.isArray(permissions) ? permissions : [permissions];
    this.updateView();
  }

  @Input() appHasPermissionRequireAll: boolean = false;

  private permissions: string[] = [];

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RbacService
  ) {}

  ngOnInit(): void {
    // Subscribe to user context changes
    this.rbacService.userContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (this.permissions.length === 0) {
      this.setAccess(true);
      return;
    }

    const checkMethod = this.appHasPermissionRequireAll ? 
      this.rbacService.hasAllPermissions(this.permissions) : 
      this.rbacService.hasAnyPermission(this.permissions);

    checkMethod
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasAccess: boolean) => this.setAccess(hasAccess));
  }

  private setAccess(hasAccess: boolean): void {
    if (hasAccess && !this.hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasAccess = true;
    } else if (!hasAccess && this.hasAccess) {
      this.viewContainer.clear();
      this.hasAccess = false;
    }
  }
}

@Directive({
  selector: '[appIsTenantAdmin]'
})
export class IsTenantAdminDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasAccess = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RbacService
  ) {}

  ngOnInit(): void {
    this.rbacService.userContext$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.rbacService.isTenantAdmin())
      )
      .subscribe(isAdmin => this.setAccess(isAdmin));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setAccess(hasAccess: boolean): void {
    if (hasAccess && !this.hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasAccess = true;
    } else if (!hasAccess && this.hasAccess) {
      this.viewContainer.clear();
      this.hasAccess = false;
    }
  }
}

@Directive({
  selector: '[appIsPlatformAdmin]'
})
export class IsPlatformAdminDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasAccess = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RbacService
  ) {}

  ngOnInit(): void {
    this.rbacService.userContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const isPlatformAdmin = this.rbacService.isPlatformAdmin();
        this.setAccess(isPlatformAdmin);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setAccess(hasAccess: boolean): void {
    if (hasAccess && !this.hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasAccess = true;
    } else if (!hasAccess && this.hasAccess) {
      this.viewContainer.clear();
      this.hasAccess = false;
    }
  }
}

@Directive({
  selector: '[appCanPerform]'
})
export class CanPerformDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasAccess = false;

  @Input() set appCanPerform(action: string) {
    this.action = action;
    this.updateView();
  }

  @Input() appCanPerformResource?: string;

  private action: string = '';

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RbacService
  ) {}

  ngOnInit(): void {
    this.rbacService.userContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateView());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (!this.action) {
      this.setAccess(false);
      return;
    }

    this.rbacService.canPerform(this.action, this.appCanPerformResource)
      .pipe(takeUntil(this.destroy$))
      .subscribe((canPerform: boolean) => this.setAccess(canPerform));
  }

  private setAccess(hasAccess: boolean): void {
    if (hasAccess && !this.hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasAccess = true;
    } else if (!hasAccess && this.hasAccess) {
      this.viewContainer.clear();
      this.hasAccess = false;
    }
  }
}

// Export all directives as an array for easy module import
export const RBAC_DIRECTIVES = [
  HasRoleDirective,
  HasPermissionDirective,
  IsTenantAdminDirective,
  IsPlatformAdminDirective,
  CanPerformDirective
];

/*
Usage Examples:

<!-- Show element only if user has specific role(s) -->
<div *appHasRole="'TENANT_ADMIN'">Admin only content</div>
<div *appHasRole="['TENANT_ADMIN', 'PLATFORM_ADMIN']">Multiple roles (any)</div>
<div *appHasRole="['TENANT_ADMIN', 'TENANT_USER']; requireAll: true">All roles required</div>

<!-- Show element only if user has specific permission(s) -->
<button *appHasPermission="'users.create'">Create User</button>
<button *appHasPermission="['users.update', 'users.delete']">Edit User</button>
<div *appHasPermission="['admin.access', 'system.manage']; requireAll: true">System admin area</div>

<!-- Show element only for tenant admins -->
<div *appIsTenantAdmin>Tenant admin tools</div>

<!-- Show element only for platform admins -->
<div *appIsPlatformAdmin>Platform admin tools</div>

<!-- Show element only if user can perform specific action -->
<button *appCanPerform="'create'; resource: 'users'">Create User</button>
<div *appCanPerform="'manage'; resource: 'tenants'">Tenant management</div>
*/ 