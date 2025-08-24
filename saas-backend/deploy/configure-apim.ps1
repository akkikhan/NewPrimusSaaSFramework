# API Management Configuration Script
param(
    [Parameter(Mandatory=$true)]
    [string]$ApimName,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$GatewayUrl
)

Write-Host "🌐 Configuring API Management for SaaS Framework" -ForegroundColor Green

# Import OpenAPI specifications for each service
Write-Host "📋 Importing API specifications..." -ForegroundColor Blue

# Create API for Gateway
az apim api import `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-gateway-api" `
    --display-name "SaaS Framework Gateway API" `
    --description "Main gateway API for the SaaS Framework" `
    --service-url $GatewayUrl `
    --path "gateway" `
    --protocols "https"

# Create API for Authentication
az apim api import `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-api" `
    --display-name "SaaS Framework Authentication API" `
    --description "Authentication and user management API" `
    --service-url "$GatewayUrl/api/auth" `
    --path "auth" `
    --protocols "https"

# Create API for RBAC
az apim api import `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-api" `
    --display-name "SaaS Framework RBAC API" `
    --description "Role-based access control API" `
    --service-url "$GatewayUrl/api/rbac" `
    --path "rbac" `
    --protocols "https"

# Create API for Notifications
az apim api import `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-notifications-api" `
    --display-name "SaaS Framework Notifications API" `
    --description "Notifications and messaging API" `
    --service-url "$GatewayUrl/api/notifications" `
    --path "notifications" `
    --protocols "https"

# Configure rate limiting
Write-Host "⚡ Configuring rate limiting..." -ForegroundColor Blue

# Create rate limiting policy
$rateLimitPolicy = @"
<policies>
    <inbound>
        <rate-limit calls="1000" renewal-period="3600" />
        <quota calls="10000" renewal-period="86400" />
        <cors>
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
    </inbound>
    <backend>
        <forward-request />
    </backend>
    <outbound />
    <on-error />
</policies>
"@

# Apply rate limiting to all APIs
az apim api policy create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-gateway-api" `
    --policy-content $rateLimitPolicy

az apim api policy create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-auth-api" `
    --policy-content $rateLimitPolicy

az apim api policy create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-rbac-api" `
    --policy-content $rateLimitPolicy

az apim api policy create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --api-id "saas-notifications-api" `
    --policy-content $rateLimitPolicy

# Create developer portal products
Write-Host "📦 Creating API products..." -ForegroundColor Blue

# Create Free Tier Product
az apim product create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --product-id "free-tier" `
    --display-name "Free Tier" `
    --description "Free tier with basic access to SaaS Framework APIs" `
    --subscription-required true `
    --approval-required false `
    --state "published"

# Create Pro Tier Product
az apim product create `
    --resource-group $ResourceGroupName `
    --service-name $ApimName `
    --product-id "pro-tier" `
    --display-name "Pro Tier" `
    --description "Professional tier with full access to SaaS Framework APIs" `
    --subscription-required true `
    --approval-required true `
    --state "published"

# Add APIs to products
az apim product api add --resource-group $ResourceGroupName --service-name $ApimName --product-id "free-tier" --api-id "saas-auth-api"
az apim product api add --resource-group $ResourceGroupName --service-name $ApimName --product-id "free-tier" --api-id "saas-rbac-api"

az apim product api add --resource-group $ResourceGroupName --service-name $ApimName --product-id "pro-tier" --api-id "saas-gateway-api"
az apim product api add --resource-group $ResourceGroupName --service-name $ApimName --product-id "pro-tier" --api-id "saas-auth-api"
az apim product api add --resource-group $ResourceGroupName --service-name $ApimName --product-id "pro-tier" --api-id "saas-rbac-api"
az apim product api add --resource-group $ResourceGroupName --service-name $ApimName --product-id "pro-tier" --api-id "saas-notifications-api"

Write-Host "✅ API Management configuration completed!" -ForegroundColor Green

# Get the developer portal URL
$apimDetails = az apim show --name $ApimName --resource-group $ResourceGroupName --query "{gatewayUrl:gatewayUrl,portalUrl:portalUrl}" --output json | ConvertFrom-Json

Write-Host ""
Write-Host "🌍 API Management URLs:" -ForegroundColor Yellow
Write-Host "  Gateway: $($apimDetails.gatewayUrl)" -ForegroundColor White
Write-Host "  Developer Portal: $($apimDetails.portalUrl)" -ForegroundColor White
