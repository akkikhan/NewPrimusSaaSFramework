# Global SaaS Framework Integration Guide

## 🌍 Global Endpoints (Replace with your actual deployed URLs)

```
Production Base URL: https://api.yourcompany.com
Staging Base URL: https://staging-api.yourcompany.com
Development Base URL: https://dev-api.yourcompany.com
```

## 🚀 Quick Start for External Applications

### 1. Authentication Flow

```javascript
// External app authentication
const SaaSClient = {
  baseUrl: 'https://api.yourcompany.com',
  tenantId: 'your-tenant-id',
  
  async authenticate(email, password) {
    const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': this.tenantId
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    if (result.success) {
      localStorage.setItem('saas_token', result.data.token);
      return result.data;
    }
    throw new Error(result.message);
  },

  async getAuthHeaders() {
    const token = localStorage.getItem('saas_token');
    return {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': this.tenantId,
      'Content-Type': 'application/json'
    };
  }
};
```

### 2. User Management

```javascript
// Create user
async function createUser(userData) {
  const headers = await SaaSClient.getAuthHeaders();
  const response = await fetch(`${SaaSClient.baseUrl}/api/v2/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(userData)
  });
  return response.json();
}

// Get users
async function getUsers(page = 1, pageSize = 20) {
  const headers = await SaaSClient.getAuthHeaders();
  const response = await fetch(`${SaaSClient.baseUrl}/api/v2/users?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers
  });
  return response.json();
}
```

### 3. Role Management

```javascript
// Get roles
async function getRoles() {
  const headers = await SaaSClient.getAuthHeaders();
  const response = await fetch(`${SaaSClient.baseUrl}/api/v2/rbac/roles`, {
    method: 'GET',
    headers
  });
  return response.json();
}

// Create role
async function createRole(roleData) {
  const headers = await SaaSClient.getAuthHeaders();
  const response = await fetch(`${SaaSClient.baseUrl}/api/v2/rbac/roles`, {
    method: 'POST',
    headers,
    body: JSON.stringify(roleData)
  });
  return response.json();
}

// Assign role to user
async function assignRole(userId, roleId) {
  const headers = await SaaSClient.getAuthHeaders();
  const response = await fetch(`${SaaSClient.baseUrl}/api/v2/rbac/userroles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, roleId })
  });
  return response.json();
}

// Check user permission
async function checkPermission(userId, permission) {
  const headers = await SaaSClient.getAuthHeaders();
  const response = await fetch(`${SaaSClient.baseUrl}/api/v2/rbac/permissions/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, permission })
  });
  const result = await response.json();
  return result.success && result.data;
}
```

## 📱 Mobile App Integration (React Native)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

class SaaSMobileClient {
  constructor(baseUrl, tenantId) {
    this.baseUrl = baseUrl;
    this.tenantId = tenantId;
  }

  async authenticate(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.tenantId
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (result.success) {
        await AsyncStorage.setItem('saas_token', result.data.token);
        return result.data;
      }
      throw new Error(result.message);
    } catch (error) {
      throw error;
    }
  }

  async getAuthHeaders() {
    const token = await AsyncStorage.getItem('saas_token');
    return {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': this.tenantId,
      'Content-Type': 'application/json'
    };
  }
}

// Usage
const saasClient = new SaaSMobileClient('https://api.yourcompany.com', 'your-tenant-id');
```

## 🖥️ .NET Client SDK

```csharp
public class SaaSFrameworkClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly string _tenantId;

    public SaaSFrameworkClient(string baseUrl, string tenantId)
    {
        _baseUrl = baseUrl;
        _tenantId = tenantId;
        _httpClient = new HttpClient();
    }

    public async Task<AuthResult> AuthenticateAsync(string email, string password)
    {
        var request = new { email, password };
        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("X-Tenant-Id", _tenantId);

        var response = await _httpClient.PostAsync($"{_baseUrl}/api/v2/auth/login", content);
        var result = await response.Content.ReadAsStringAsync();
        
        return JsonSerializer.Deserialize<AuthResult>(result);
    }

    public async Task<List<Role>> GetRolesAsync(string token)
    {
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        _httpClient.DefaultRequestHeaders.Add("X-Tenant-Id", _tenantId);

        var response = await _httpClient.GetAsync($"{_baseUrl}/api/v2/rbac/roles");
        var result = await response.Content.ReadAsStringAsync();
        
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<List<Role>>>(result);
        return apiResponse.Data;
    }
}

public class AuthResult
{
    public bool Success { get; set; }
    public AuthData Data { get; set; }
    public string Message { get; set; }
}

public class AuthData
{
    public string Token { get; set; }
    public string RefreshToken { get; set; }
    public User User { get; set; }
}
```

## 🔒 Security Best Practices for External Integration

### 1. API Key Management
```javascript
// Store API credentials securely
const config = {
  apiUrl: process.env.SAAS_API_URL,
  tenantId: process.env.SAAS_TENANT_ID,
  // Never store secrets in client-side code
};
```

### 2. Token Refresh Implementation
```javascript
class TokenManager {
  static async refreshToken() {
    const refreshToken = localStorage.getItem('saas_refresh_token');
    const response = await fetch(`${SaaSClient.baseUrl}/api/v2/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': SaaSClient.tenantId
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const result = await response.json();
    if (result.success) {
      localStorage.setItem('saas_token', result.data.token);
      return result.data.token;
    }
    
    // Redirect to login if refresh fails
    window.location.href = '/login';
  }

  static async makeAuthenticatedRequest(url, options = {}) {
    let token = localStorage.getItem('saas_token');
    
    const makeRequest = async (authToken) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-Id': SaaSClient.tenantId
        }
      });
    };

    let response = await makeRequest(token);
    
    // If token expired, try refresh
    if (response.status === 401) {
      token = await this.refreshToken();
      response = await makeRequest(token);
    }
    
    return response;
  }
}
```

## 🌐 Global Deployment Checklist

### Pre-deployment
- [ ] Configure custom domain and SSL certificates
- [ ] Set up Azure Key Vault for secrets management
- [ ] Configure Application Insights for monitoring
- [ ] Set up Azure CDN for global performance
- [ ] Configure auto-scaling rules
- [ ] Set up backup and disaster recovery

### Post-deployment
- [ ] Configure custom domain DNS records
- [ ] Test from multiple geographic locations
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Test disaster recovery procedures
- [ ] Document API endpoints for external developers

## 📊 Monitoring & Analytics

### Application Insights Queries
```kql
// Monitor API usage by external applications
requests
| where timestamp > ago(24h)
| where cloud_RoleName contains "saas"
| summarize RequestCount = count(), AvgDuration = avg(duration) by name, cloud_RoleName
| order by RequestCount desc

// Track authentication failures
traces
| where timestamp > ago(24h)
| where message contains "authentication failed"
| summarize FailureCount = count() by bin(timestamp, 1h)
```

## 💰 Cost Optimization

### Azure Container Apps Scaling
- Configure min/max replicas based on usage patterns
- Use consumption plan for development environments
- Implement request-based auto-scaling
- Monitor resource usage and adjust CPU/memory limits

### Azure API Management
- Use appropriate pricing tier based on usage
- Configure caching policies to reduce backend calls
- Implement request throttling to prevent abuse
- Monitor API analytics for optimization opportunities

## 🔧 Maintenance & Updates

### Blue-Green Deployment
- Use Azure Container Apps revisions for zero-downtime deployments
- Test new versions in staging environment
- Gradually roll out updates using traffic splitting
- Maintain rollback capability for quick recovery
