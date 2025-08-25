# External App Integration Examples

## 🔌 **Angular Integration**

### 1. Install HTTP Client
```typescript
// app.module.ts
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [HttpClientModule]
})
```

### 2. Authentication Service
```typescript
// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/v2';
  private tenantId = 'demo-tenant';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId
    });
  }

  login(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/auth/login`, 
      { email, password }, 
      { headers: this.getHeaders() }
    );
  }

  getUserRoles(userId: string) {
    const token = localStorage.getItem('access_token');
    const headers = this.getHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.get(`${this.apiUrl}/rbac/users/${userId}/roles`, 
      { headers }
    );
  }
}
```

### 3. Usage Example
```typescript
// login.component.ts
export class LoginComponent {
  constructor(private authService: AuthService) {}

  onLogin() {
    this.authService.login('admin@demo.com', 'Demo123!')
      .subscribe(response => {
        localStorage.setItem('access_token', response.accessToken);
        // Redirect to dashboard
      });
  }
}
```

## 🔌 **.NET Integration**

### 1. HTTP Client Setup
```csharp
// Program.cs
builder.Services.AddHttpClient("SaaSFramework", client =>
{
    client.BaseAddress = new Uri("http://localhost:8080/api/v2/");
    client.DefaultRequestHeaders.Add("X-Tenant-Id", "demo-tenant");
});
```

### 2. Authentication Service
```csharp
// Services/AuthService.cs
public class AuthService
{
    private readonly HttpClient _httpClient;

    public AuthService(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("SaaSFramework");
    }

    public async Task<AuthResponse> LoginAsync(string email, string password)
    {
        var request = new { email, password };
        var response = await _httpClient.PostAsJsonAsync("auth/login", request);
        
        return await response.Content.ReadFromJsonAsync<AuthResponse>();
    }

    public async Task<List<Role>> GetUserRolesAsync(string userId, string token)
    {
        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            
        var response = await _httpClient.GetAsync($"rbac/users/{userId}/roles");
        return await response.Content.ReadFromJsonAsync<List<Role>>();
    }
}
```

## 🔌 **React Integration**

### 1. Axios Setup
```javascript
// api/saasClient.js
import axios from 'axios';

const saasClient = axios.create({
  baseURL: 'http://localhost:8080/api/v2',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'demo-tenant'
  }
});

export const authAPI = {
  login: (email, password) => 
    saasClient.post('/auth/login', { email, password }),
    
  getUserRoles: (userId, token) =>
    saasClient.get(`/rbac/users/${userId}/roles`, {
      headers: { Authorization: `Bearer ${token}` }
    })
};
```

## 📋 **API Endpoints Available**

### Authentication Endpoints
- `POST /api/v2/auth/login` - User login
- `POST /api/v2/auth/register` - User registration  
- `POST /api/v2/auth/refresh` - Token refresh
- `POST /api/v2/auth/logout` - User logout

### RBAC Endpoints
- `GET /api/v2/rbac/users/{userId}/roles` - Get user roles
- `GET /api/v2/rbac/roles` - List all roles
- `GET /api/v2/rbac/permissions` - List all permissions
- `POST /api/v2/rbac/users/{userId}/roles` - Assign roles

### Required Headers
- `X-Tenant-Id`: Your tenant identifier (use "demo-tenant" for testing)
- `Authorization`: Bearer token (for protected endpoints)
- `Content-Type`: application/json

## 🧪 **Test Credentials**
```
Email: admin@demo.com
Password: Demo123!
Tenant: demo-tenant
```

## 🚀 **Quick Test with cURL**
```bash
# Login
curl -X POST http://localhost:8080/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{"email":"admin@demo.com","password":"Demo123!"}'

# Get user roles (replace {token} with actual token)
curl -X GET http://localhost:8080/api/v2/rbac/users/{userId}/roles \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-Id: demo-tenant"
```
