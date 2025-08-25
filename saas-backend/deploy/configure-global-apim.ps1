# Configure API Management for Global SaaS Framework Exposure
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ApimName,
    
    [Parameter(Mandatory=$true)]
    [string]$GatewayUrl,
    
    [string]$Environment = "production"
)

Write-Host "🌐 Configuring API Management for Global Access" -ForegroundColor Green

# Configure CORS for global access
Write-Host "🔄 Configuring CORS policies..." -ForegroundColor Blue
az apim api policy create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "*" `
    --policy-xml @"
<policies>
    <inbound>
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>*</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
                <method>OPTIONS</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
        </cors>
        <rate-limit-by-key calls="1000" renewal-period="3600" counter-key="@(context.Request.IpAddress)" />
        <quota-by-key calls="10000" renewal-period="86400" counter-key="@(context.Request.Headers.GetValueOrDefault('X-API-Key','anonymous'))" />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
"@

# Create Authentication API
Write-Host "🔐 Creating Authentication API..." -ForegroundColor Blue
az apim api create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-global" `
    --display-name "SaaS Framework Authentication API (Global)" `
    --description "Global authentication and user management API for external applications" `
    --service-url "https://$GatewayUrl/api/v2/auth" `
    --path "auth" `
    --protocols "https" `
    --subscription-required false

# Create RBAC API
Write-Host "👥 Creating RBAC API..." -ForegroundColor Blue
az apim api create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-global" `
    --display-name "SaaS Framework RBAC API (Global)" `
    --description "Global role-based access control API for external applications" `
    --service-url "https://$GatewayUrl/api/v2/rbac" `
    --path "rbac" `
    --protocols "https" `
    --subscription-required false

# Create operations for Authentication API
Write-Host "🔧 Creating Authentication API operations..." -ForegroundColor Blue

# Login operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-global" `
    --operation-id "auth-login" `
    --display-name "User Login" `
    --method "POST" `
    --url-template "/login" `
    --description "Authenticate user and return JWT token"

# Register operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-global" `
    --operation-id "auth-register" `
    --display-name "User Registration" `
    --method "POST" `
    --url-template "/register" `
    --description "Register new user in tenant"

# Validate token operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-global" `
    --operation-id "auth-validate" `
    --display-name "Validate Token" `
    --method "POST" `
    --url-template "/validate" `
    --description "Validate JWT token"

# Refresh token operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-global" `
    --operation-id "auth-refresh" `
    --display-name "Refresh Token" `
    --method "POST" `
    --url-template "/refresh" `
    --description "Refresh expired JWT token"

# Create operations for RBAC API
Write-Host "🔧 Creating RBAC API operations..." -ForegroundColor Blue

# Get roles operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-global" `
    --operation-id "rbac-get-roles" `
    --display-name "Get Roles" `
    --method "GET" `
    --url-template "/roles" `
    --description "Get all roles for tenant"

# Create role operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-global" `
    --operation-id "rbac-create-role" `
    --display-name "Create Role" `
    --method "POST" `
    --url-template "/roles" `
    --description "Create new role"

# Assign role operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-global" `
    --operation-id "rbac-assign-role" `
    --display-name "Assign Role to User" `
    --method "POST" `
    --url-template "/userroles" `
    --description "Assign role to user"

# Check permission operation
az apim api operation create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-global" `
    --operation-id "rbac-check-permission" `
    --display-name "Check Permission" `
    --method "POST" `
    --url-template "/permissions/check" `
    --description "Check if user has specific permission"

# Create API key subscription for external access
Write-Host "🔑 Creating API subscription for external access..." -ForegroundColor Blue
az apim subscription create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --subscription-id "external-apps-subscription" `
    --display-name "External Applications Subscription" `
    --scope "/apis" `
    --state "active"

# Get API Management URLs
$apimGatewayUrl = az apim show --resource-group $ResourceGroupName --name $ApimName --query gatewayUrl --output tsv

Write-Host "✅ API Management Configuration Complete!" -ForegroundColor Green
Write-Host "🌍 Public API Gateway: $apimGatewayUrl" -ForegroundColor Cyan
Write-Host "🔐 Auth API: $apimGatewayUrl/auth" -ForegroundColor Cyan
Write-Host "👥 RBAC API: $apimGatewayUrl/rbac" -ForegroundColor Cyan
Write-Host "📖 Developer Portal: $apimGatewayUrl/developer" -ForegroundColor Cyan
