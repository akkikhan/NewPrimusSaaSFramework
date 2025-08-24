# SaaS Framework - Complete Azure Infrastructure Setup

This guide provides step-by-step instructions to deploy the SaaS Framework to Azure with full production-ready configuration.

## 🎯 Prerequisites

- Azure CLI installed and configured
- Docker Desktop installed
- PowerShell 7+ installed
- Azure subscription with appropriate permissions
- Domain name for your SaaS platform (optional but recommended)

## 🏗️ Azure Resources Overview

The SaaS Framework uses the following Azure services:

### Core Services
- **Azure Cosmos DB**: Multi-tenant NoSQL database with partition-based isolation
- **Azure Container Apps**: Microservices hosting with auto-scaling
- **Azure Container Registry**: Private Docker image repository
- **Azure API Management**: Public API gateway with rate limiting and developer portal
- **Azure Key Vault**: Secure storage for secrets and configuration
- **Azure Application Insights**: Application monitoring and telemetry

### Additional Services
- **Azure App Service**: Frontend hosting (Angular application)
- **Azure Active Directory**: Identity and access management
- **Azure Resource Groups**: Resource organization and management

## 🚀 Deployment Steps

### Step 1: Clone and Prepare the Repository

```powershell
git clone https://github.com/yourusername/saas-framework.git
cd saas-framework/saas-backend
```

### Step 2: Run Azure Infrastructure Setup

```powershell
# Set your parameters
$subscriptionId = "your-subscription-id"
$resourceGroupName = "saas-framework-rg"
$location = "East US"
$environment = "dev"  # or "prod"

# Run the infrastructure setup
.\deploy\azure-setup.ps1 -SubscriptionId $subscriptionId -ResourceGroupName $resourceGroupName -Location $location -Environment $environment
```

This script creates:
- Resource Group
- Cosmos DB account with containers
- Key Vault with secrets
- Application Insights
- Container Registry
- Container Apps Environment
- API Management
- App Service Plan and Web App

### Step 3: Configure Azure AD App Registrations

```powershell
# Set your parameters
$tenantId = "your-azure-ad-tenant-id"
$frontendUrl = "https://saas-framework-frontend-dev.azurewebsites.net"
$apiUrl = "https://saas-framework-apim-dev.azure-api.net"

# Run the Azure AD setup
.\deploy\azure-ad-setup.ps1 -TenantId $tenantId -FrontendUrl $frontendUrl -ApiUrl $apiUrl
```

### Step 4: Deploy Container Applications

```powershell
# Deploy all microservices to Container Apps
.\deploy\deploy-containerapps.ps1 -ResourceGroupName $resourceGroupName -ContainerEnvironmentName "saas-framework-env-dev" -ContainerRegistryName "saasframeworkacrdev"
```

### Step 5: Seed the Database

```powershell
# Get the Cosmos DB connection string from the Azure portal or Key Vault
$cosmosConnectionString = "your-cosmos-connection-string"

# Seed initial data
.\deploy\seed-database.ps1 -CosmosConnectionString $cosmosConnectionString
```

### Step 6: Configure API Management

```powershell
# Get the gateway URL from Container Apps
$gatewayUrl = "https://your-gateway-url"

# Configure APIM
.\deploy\configure-apim.ps1 -ApimName "saas-framework-apim-dev" -ResourceGroupName $resourceGroupName -GatewayUrl $gatewayUrl
```

## 🌐 Public API Access

### API Management Endpoints

Once deployed, your APIs will be available through Azure API Management:

- **Gateway URL**: `https://saas-framework-apim-{env}.azure-api.net`
- **Developer Portal**: `https://saas-framework-apim-{env}.developer.azure-api.net`

### API Products

#### Free Tier
- **Authentication API**: User login, registration, profile management
- **RBAC API**: Role and permission management (read-only)
- **Rate Limit**: 1,000 calls/hour, 10,000 calls/day

#### Professional Tier
- **Full Gateway API**: Complete access to all microservices
- **Authentication API**: Full user management capabilities
- **RBAC API**: Complete role and permission management
- **Notifications API**: Email and in-app notifications
- **Rate Limit**: 10,000 calls/hour, 100,000 calls/day

### Developer Portal

Developers can access the API documentation and obtain API keys through the developer portal:

1. Navigate to the developer portal URL
2. Sign up for an account
3. Subscribe to a product (Free or Pro tier)
4. Obtain API keys for authentication
5. Access interactive API documentation

## 🔐 Authentication & Security

### API Key Authentication

```http
GET https://saas-framework-apim-dev.azure-api.net/auth/me
Headers:
  Ocp-Apim-Subscription-Key: your-api-key
  Authorization: Bearer your-jwt-token
```

### JWT Token Authentication

```http
POST https://saas-framework-apim-dev.azure-api.net/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": { ... }
  }
}
```

## 📊 Monitoring & Observability

### Application Insights

- **Performance Monitoring**: Response times, throughput, error rates
- **Dependency Tracking**: Database calls, external API calls
- **Custom Events**: Business metrics and user behavior
- **Alerts**: Proactive monitoring and notifications

### Health Checks

Each service exposes health check endpoints:

- Gateway: `https://gateway-url/health`
- Authentication: `https://gateway-url/api/auth/health`
- RBAC: `https://gateway-url/api/rbac/health`
- Notifications: `https://gateway-url/api/notifications/health`

## 🔧 Configuration Management

### Environment Variables

All sensitive configuration is stored in Azure Key Vault and injected as environment variables:

```json
{
  "CosmosDB-ConnectionString": "stored-in-keyvault",
  "JWT-Secret": "stored-in-keyvault",
  "SMTP-Username": "stored-in-keyvault",
  "SMTP-Password": "stored-in-keyvault",
  "ApplicationInsights-InstrumentationKey": "stored-in-keyvault"
}
```

### Application Settings

Production settings are configured in `appsettings.Production.json` files with token replacement during deployment.

## 🚢 CI/CD Pipeline

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy SaaS Framework

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: Build and Deploy
      run: |
        ./deploy/deploy-containerapps.ps1 \
          -ResourceGroupName ${{ secrets.RESOURCE_GROUP }} \
          -ContainerEnvironmentName ${{ secrets.CONTAINER_ENV }} \
          -ContainerRegistryName ${{ secrets.ACR_NAME }}
```

## 💰 Cost Optimization

### Development Environment
- **Cosmos DB**: 400 RU/s per container (~$24/month)
- **Container Apps**: 0.5 vCPU, 1GB RAM (~$30/month)
- **API Management**: Developer tier (~$50/month)
- **Total**: ~$104/month

### Production Environment
- **Cosmos DB**: Auto-scaling 400-4000 RU/s (~$50-200/month)
- **Container Apps**: Auto-scaling 2-10 instances (~$100-500/month)
- **API Management**: Standard tier (~$250/month)
- **Total**: ~$400-950/month

## 🔗 Integration Examples

### Frontend Integration (Angular)

```typescript
// Install the SDK
npm install @saas-framework/auth @saas-framework/rbac

// Configure the service
import { SaaSAuthService } from '@saas-framework/auth';

const authService = new SaaSAuthService({
  apiUrl: 'https://saas-framework-apim-dev.azure-api.net',
  subscriptionKey: 'your-api-key'
});

// Login
const result = await authService.login('user@example.com', 'password');
```

### Third-party Integration

```javascript
// Node.js integration
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://saas-framework-apim-dev.azure-api.net',
  headers: {
    'Ocp-Apim-Subscription-Key': 'your-api-key'
  }
});

// Get user information
const response = await api.get('/auth/me', {
  headers: { 'Authorization': `Bearer ${jwt_token}` }
});
```

## 📞 Support & Documentation

- **API Documentation**: Available in the developer portal
- **GitHub Repository**: Full source code and examples
- **Support Email**: support@primussoft.com
- **Status Page**: Monitor service availability and performance

## 🎉 Success!

Your SaaS Framework is now deployed and ready for public use! The platform provides:

✅ **Multi-tenant Architecture** with complete data isolation  
✅ **RESTful APIs** with comprehensive documentation  
✅ **JWT Authentication** with refresh token support  
✅ **Role-based Access Control** with fine-grained permissions  
✅ **Email Notifications** with professional templates  
✅ **Auto-scaling Infrastructure** on Azure Container Apps  
✅ **API Management** with rate limiting and developer portal  
✅ **Monitoring & Observability** with Application Insights  
✅ **Production-ready Security** with Azure Key Vault
