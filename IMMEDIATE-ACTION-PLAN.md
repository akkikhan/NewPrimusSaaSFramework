# Immediate Action Plan: Fix Critical Blockers

## Phase 1: Fix Routing (1-2 hours)

### Step 1: Update Controller Routes
```bash
# Update Authentication Controller
# File: src/Authentication/Controllers/AuthController.cs
# Change: [Route("api/[controller]")] 
# To: [Route("api/v2/[controller]")]

# Update RBAC Controllers  
# File: src/RBAC/Controllers/RolesController.cs
# Change: [Route("api/v2/rbac/[controller]")]
# Keep as is - already correct

# File: src/RBAC/Controllers/PermissionsController.cs  
# Change: [Route("api/v2/rbac/[controller]")]
# Keep as is - already correct
```

### Step 2: Test Routing Fix
```powershell
# Restart services
.\start-integrated-services.ps1

# Test auth endpoint
Invoke-RestMethod -Uri "http://localhost:8080/api/v2/auth/health" -Method GET

# Test RBAC endpoint  
Invoke-RestMethod -Uri "http://localhost:8080/api/v2/rbac/roles" -Method GET
```

## Phase 2: Add Test Data (2-3 hours)

### Step 1: Create Seed Data Script
```powershell
# Create seed-test-data.ps1
# Add default tenant: test-tenant
# Add default user: admin@test.com / Admin123!
# Add default roles: Admin, User, Manager
# Add default permissions: users.read, users.write, roles.read, etc.
```

### Step 2: Update Connection String
```json
# Verify Cosmos DB connection in appsettings.json
# Ensure all services can connect to database
```

## Phase 3: Fix Error Handling (3-4 hours)

### Step 1: Add Global Exception Handler
```csharp
// Add to Program.cs in all services
app.UseExceptionHandler(errorApp => {
    errorApp.Run(async context => {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new {
            success = false,
            message = "Internal server error",
            timestamp = DateTime.UtcNow
        }));
    });
});
```

### Step 2: Add Request Validation
```csharp
// Add FluentValidation to all controllers
// Validate all request models
// Return consistent error responses
```

## Phase 4: Basic Security (4-6 hours)

### Step 1: Add Rate Limiting
```csharp
// Install AspNetCoreRateLimit
// Configure IP-based rate limiting
// Add different limits for auth vs data endpoints
```

### Step 2: Security Headers
```csharp
// Add security headers middleware
// HSTS, CSP, X-Frame-Options, etc.
```

## Testing Checklist After Fixes

- [ ] Authentication login works via gateway
- [ ] RBAC endpoints accessible via gateway  
- [ ] Error responses are consistent
- [ ] Rate limiting prevents abuse
- [ ] Security headers present in responses
- [ ] Test with external app integration

## Success Criteria

1. External app can successfully login
2. External app can retrieve roles/permissions
3. All APIs return consistent error formats
4. Basic security measures are in place
5. Performance is acceptable for demo
