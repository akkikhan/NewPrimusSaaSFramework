# SaaS Framework API Integration Guide

## Overview
This document provides a comprehensive guide to the integrated SaaS Framework APIs with proper versioning, ports, and Cosmos DB integration including the credit system.

## Architecture
- **Gateway**: Port 8080 (Main entry point with YARP reverse proxy)
- **Authentication**: Port 5001 (User authentication and JWT management)
- **RBAC**: Port 5002 (Roles, permissions, and user roles)
- **Notifications**: Port 5003 (Email and notification services)
- **Database**: Azure Cosmos DB with proper tenant isolation
- **Credit System**: Integrated across all services

## Service Endpoints

### Gateway API (http://localhost:8080)
Main entry point for all API requests with proper routing and tenant context.

#### Health Check
```
GET /health
Response: {"status":"healthy","timestamp":"2025-01-01T00:00:00Z"}
```

---

### Authentication API (via Gateway)
Base URL: `http://localhost:8080/api/v2/auth`

#### Login
```
POST /api/v2/auth/login
Headers: 
  X-Tenant-Id: your-tenant-id
  Content-Type: application/json
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: {
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "roles": ["user"],
      "creditBalance": 100.00,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "expiresAt": "2025-01-01T01:00:00Z",
    "refreshToken": "refresh-token-here"
  }
}
```

#### Register
```
POST /api/v2/auth/register
Headers: 
  X-Tenant-Id: your-tenant-id
  Content-Type: application/json
Body: {
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Refresh Token
```
POST /api/v2/auth/refresh
Headers: 
  X-Tenant-Id: your-tenant-id
  Content-Type: application/json
Body: {
  "refreshToken": "refresh-token-here"
}
```

---

### User Management API (via Gateway)
Base URL: `http://localhost:8080/api/v2/users`

#### Get Users
```
GET /api/v2/users
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
Query Parameters:
  page: 1
  pageSize: 20
  search: optional
```

#### Get User by ID
```
GET /api/v2/users/{userId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
```

#### Create User
```
POST /api/v2/users
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["user"]
}
```

#### Update User
```
PUT /api/v2/users/{userId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "isActive": true
}
```

---

### RBAC API (via Gateway)
Base URL: `http://localhost:8080/api/v2/rbac`

#### Roles Management

##### Get Roles
```
GET /api/v2/rbac/roles
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
Response: {
  "success": true,
  "data": [
    {
      "id": "role-id",
      "name": "Admin",
      "description": "Administrator role",
      "permissions": ["users.read", "users.write", "roles.read"],
      "isSystem": false,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

##### Get Role by ID
```
GET /api/v2/rbac/roles/{roleId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
```

##### Create Role
```
POST /api/v2/rbac/roles
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "name": "Manager",
  "description": "Manager role with limited permissions",
  "permissions": ["users.read", "reports.read"]
}
```

##### Update Role
```
PUT /api/v2/rbac/roles/{roleId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "name": "Updated Manager",
  "description": "Updated description",
  "permissions": ["users.read", "reports.read", "reports.write"]
}
```

##### Delete Role
```
DELETE /api/v2/rbac/roles/{roleId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
```

#### Permissions Management
```
GET /api/v2/rbac/permissions
POST /api/v2/rbac/permissions
PUT /api/v2/rbac/permissions/{permissionId}
DELETE /api/v2/rbac/permissions/{permissionId}
```

#### User Roles Management
```
GET /api/v2/rbac/userroles
POST /api/v2/rbac/userroles
DELETE /api/v2/rbac/userroles/{userRoleId}
```

---

### Credit System API (via Gateway)
Base URL: `http://localhost:8080/api/v2/credits`

#### Get User Credit Balance
```
GET /api/v2/credits/balance/{userId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
Response: {
  "success": true,
  "data": {
    "userId": "user-id",
    "balance": 150.50,
    "lastUpdated": "2025-01-01T00:00:00Z"
  }
}
```

#### Add Credits
```
POST /api/v2/credits/add
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "userId": "user-id",
  "amount": 50.00,
  "type": "Purchased",
  "description": "Credit purchase",
  "referenceId": "payment-123"
}
```

#### Deduct Credits
```
POST /api/v2/credits/deduct
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "userId": "user-id",
  "amount": 10.00,
  "description": "API usage fee",
  "referenceId": "api-call-456"
}
```

#### Get Credit History
```
GET /api/v2/credits/history/{userId}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
Query Parameters:
  page: 1
  pageSize: 20
```

#### Check Sufficient Credits
```
GET /api/v2/credits/check/{userId}/{amount}
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
Response: {
  "success": true,
  "data": true
}
```

---

### Tenant Management API (via Gateway)
Base URL: `http://localhost:8080/api/v2/tenants`

#### Create Tenant
```
POST /api/v2/tenants
Content-Type: application/json
Body: {
  "name": "My Company",
  "adminEmail": "admin@company.com",
  "orgId": "my-company"
}
Response: {
  "success": true,
  "data": {
    "id": "tenant-id",
    "orgId": "my-company",
    "name": "My Company",
    "adminEmail": "admin@company.com",
    "status": "Active",
    "authApiKey": "auth-api-key",
    "rbacApiKey": "rbac-api-key",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Get Tenants
```
GET /api/v2/tenants
Headers: 
  Authorization: Bearer jwt-token
```

#### Get Tenant by ID
```
GET /api/v2/tenants/{tenantId}
Headers: 
  Authorization: Bearer jwt-token
```

#### Get Tenant by Org ID
```
GET /api/v2/tenants/by-orgid/{orgId}
```

---

### Notifications API (via Gateway)
Base URL: `http://localhost:8080/api/v2/notifications`

#### Send Email
```
POST /api/v2/notifications/email
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
  Content-Type: application/json
Body: {
  "to": "user@example.com",
  "subject": "Welcome",
  "body": "Welcome to our platform!",
  "isHtml": false
}
```

#### Get Notification History
```
GET /api/v2/notifications
Headers: 
  X-Tenant-Id: your-tenant-id
  Authorization: Bearer jwt-token
Query Parameters:
  page: 1
  pageSize: 20
  userId: optional
```

---

## Credit Types
- **Earned**: Credits earned through activities
- **Purchased**: Credits bought by the user
- **Bonus**: Promotional or bonus credits
- **Spent**: Credits used for services
- **Refund**: Refunded credits
- **Expired**: Credits that have expired

---

## Authentication Headers
All protected endpoints require:
```
X-Tenant-Id: your-tenant-id
Authorization: Bearer your-jwt-token
```

---

## Error Responses
All APIs return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

---

## Getting Started

1. **Start Services**: Run `.\start-integrated-services.ps1`
2. **Create Tenant**: Use POST `/api/v2/tenants`
3. **Register User**: Use POST `/api/v2/auth/register` with X-Tenant-Id header
4. **Login**: Use POST `/api/v2/auth/login` to get JWT token
5. **Use APIs**: Include JWT token in Authorization header for protected endpoints

---

## Database Integration

All services are integrated with Azure Cosmos DB:
- **Container**: Different containers for tenants, users, rbac, credits, notifications
- **Partition Key**: Tenant-based partitioning for data isolation
- **Consistency**: Strong consistency for financial operations (credits)
- **Indexing**: Optimized for common query patterns

---

## Version Information
- API Version: v2
- Framework Version: 1.0.0
- Last Updated: January 2025
