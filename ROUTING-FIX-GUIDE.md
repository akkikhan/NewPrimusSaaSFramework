# Fix API Routing Configuration

## Problem
The YARP gateway is configured for versioned routes (v2) but the controllers don't match:
- Gateway expects: `/api/v2/auth/login`
- Controller serves: `/api/auth/login`

## Solution Options

### Option 1: Update Controller Routes (Recommended)
Update all controller route attributes to include v2:

```csharp
// In AuthController.cs
[Route("api/v2/[controller]")]
public class AuthController : ControllerBase

// In RolesController.cs  
[Route("api/v2/rbac/[controller]")]
public class RolesController : ControllerBase

// In PermissionsController.cs
[Route("api/v2/rbac/[controller]")]
public class PermissionsController : ControllerBase
```

### Option 2: Update YARP Configuration
Remove v2 from YARP routes to match current controllers:

```json
{
  "auth-route": {
    "ClusterId": "auth-cluster",
    "Match": {
      "Path": "/api/auth/{**catch-all}"
    },
    "Transforms": [
      { "PathPattern": "/api/auth/{**catch-all}" }
    ]
  }
}
```

### Option 3: Add Path Rewriting (Quick Fix)
Update YARP transforms to rewrite paths:

```json
{
  "auth-route": {
    "ClusterId": "auth-cluster", 
    "Match": {
      "Path": "/api/v2/auth/{**catch-all}"
    },
    "Transforms": [
      { "PathPattern": "/api/auth/{remainder}" },
      { "PathSet": "/api/auth/{remainder}" }
    ]
  }
}
```

## Immediate Action Required
Choose Option 1 for consistency and update all controller routes to v2.
