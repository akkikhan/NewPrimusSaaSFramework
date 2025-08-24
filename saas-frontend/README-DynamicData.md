# Dynamic Data Integration Guide

## Overview

This document explains how the SaaS Factory UI fetches dynamic data from backend APIs, replacing all mock/static data with real API-backed endpoints.

## Architecture Changes

### Environment Configuration

The UI now routes all API calls through the centralized API Gateway:

```typescript
// environment.ts
export const environment = {
  apiUrl: "/api/v2", // Authentication, Users, RBAC via Gateway v2
  configurationApiUrl: "/api/v2", // Tenants, Configuration
  // ...
  api: {
    endpoints: {
      tenants: "/api/v2/tenants", // Configuration API
      rbac: "/roles", // RBAC API via gateway
      permissions: "/permissions", // RBAC API via gateway
      users: "/users", // Authentication API
      notifications: "/notifications", // Notifications API
      analytics: "/analytics", // Analytics API
      audit: "/audit", // Audit API
    },
  },
};
```

### Proxy Configuration

Development proxy routes all `/api/*` requests to the gateway:

```json
{
  "/api/*": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

## Data Flow

### 1. Tenants

- **Source**: Configuration API (`http://localhost:7008`)
- **Route**: UI → `/api/v2/tenants` → Gateway → Configuration API
- **Controllers**: `TenantOnboardingV2Controller`, `TenantsController`
- **Storage**: Azure Cosmos DB (`SaaSFactory.TenantConfigurations`)

**Key Endpoints**:

- `GET /api/v2/tenants` - List all tenants
- `GET /api/v2/tenants/{id}` - Get specific tenant
- `POST /api/v2/tenants/onboard` - Onboard new tenant
- `DELETE /api/v2/tenants/{id}` - Delete tenant

### 2. Roles & Permissions (RBAC)

- **Source**: RBAC API (`http://localhost:7002`)
  - **Route**: UI → `/api/v2/roles` → Gateway → RBAC API
- **Controllers**: `RolesController`, `PermissionsController`
- **Storage**: Azure Cosmos DB (`Roles`, `Permissions`, `UserRoles`, `RolePermissions`)

**Key Endpoints**:

- `GET /api/v1/roles` - List all roles
- `GET /api/v1/roles/{id}` - Get specific role
- `POST /api/v1/roles` - Create new role
- `GET /api/v1/roles/permissions` - List all permissions
- `POST /api/v1/roles/permissions/check` - Check user permission

### 3. Dashboard Metrics

- **Sources**: Multiple APIs aggregated through gateway
- **Routes**:
  - Users: `/api/v1/users` → Authentication API
  - Tenants: `/api/v2/tenants` → Configuration API
  - Roles: `/api/v1/roles` → RBAC API
  - Activity: `/api/v1/audit` → Audit API

## Component Updates

### Tenant List Component

- **Removed**: Static/mock tenant data
- **Added**: Real API calls via `ApiService.getTenants()`
- **Features**: Pagination, search, filtering via API parameters

### Role List Component

- **Removed**: localStorage-based role management
- **Added**: Real API calls via `RbacService.getRoles()`
- **Features**: Dynamic loading from Cosmos DB

### Dashboard Component

- **Removed**: Static dashboard metrics
- **Added**: Real-time API aggregation from multiple services
- **Features**: Auto-refresh, health monitoring, live activity feed

## Authentication & Headers

All API requests include proper authentication headers via `AuthInterceptor`:

```typescript
headers: {
  'Authorization': 'Bearer {token}',
  'X-Tenant-Id': '{current-tenant-id}',
  'X-Correlation-ID': '{unique-request-id}'
}
```

## Error Handling

Each component implements proper loading states:

- **Loading**: Shows spinner while fetching data
- **Error**: Displays error message with retry option
- **Empty**: Shows appropriate empty state when no data

## Health Monitoring

Dashboard includes real-time health checks for all services:

- Authentication API: `/api/v1/auth/health`
- Configuration API: `/api/v2/tenants/health`
- RBAC API: `/api/v1/roles/health`
- Audit API: `/api/v1/audit/health`

## No Mock Data

The following have been completely removed:

- ❌ `MockTenantService` usage in production flows
- ❌ Static tenant data in components
- ❌ localStorage-based RBAC data
- ❌ Hardcoded dashboard metrics
- ❌ Bypass routes or services

All data now flows from:
✅ Azure Cosmos DB → Backend APIs → Gateway → UI Components
