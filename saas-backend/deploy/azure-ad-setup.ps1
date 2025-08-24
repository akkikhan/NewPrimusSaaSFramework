# Azure AD App Registration Script for SaaS Framework
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantId,
    
    [Parameter(Mandatory=$true)]
    [string]$AppName = "SaaS Framework API",
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendUrl = "https://saas-framework-frontend-dev.azurewebsites.net",
    
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl = "https://saas-framework-apim-dev.azure-api.net"
)

Write-Host "🔐 Creating Azure AD App Registrations for SaaS Framework" -ForegroundColor Green

# Login to Azure AD
Write-Host "🔑 Logging into Azure AD..." -ForegroundColor Blue
az login --tenant $TenantId

# Create API App Registration
Write-Host "📱 Creating API App Registration..." -ForegroundColor Blue
$apiAppId = az ad app create `
    --display-name "$AppName - API" `
    --identifier-uris "api://saas-framework-api" `
    --app-roles '[
        {
            "allowedMemberTypes": ["User"],
            "description": "Admin access to the SaaS Framework",
            "displayName": "Admin",
            "id": "' + [System.Guid]::NewGuid().ToString() + '",
            "isEnabled": true,
            "value": "Admin"
        },
        {
            "allowedMemberTypes": ["User"],
            "description": "User Manager access to manage users",
            "displayName": "UserManager",
            "id": "' + [System.Guid]::NewGuid().ToString() + '",
            "isEnabled": true,
            "value": "UserManager"
        },
        {
            "allowedMemberTypes": ["User"],
            "description": "Regular user access",
            "displayName": "User",
            "id": "' + [System.Guid]::NewGuid().ToString() + '",
            "isEnabled": true,
            "value": "User"
        }
    ]' `
    --oauth2-permissions '[
        {
            "adminConsentDescription": "Allow the app to access the SaaS Framework API on behalf of the signed-in user.",
            "adminConsentDisplayName": "Access SaaS Framework API",
            "id": "' + [System.Guid]::NewGuid().ToString() + '",
            "isEnabled": true,
            "type": "User",
            "userConsentDescription": "Allow the app to access the SaaS Framework API on your behalf.",
            "userConsentDisplayName": "Access SaaS Framework API",
            "value": "access_as_user"
        }
    ]' `
    --query appId --output tsv

# Create Frontend App Registration
Write-Host "🌐 Creating Frontend App Registration..." -ForegroundColor Blue
$frontendAppId = az ad app create `
    --display-name "$AppName - Frontend" `
    --spa-redirect-uris "$FrontendUrl/auth/callback" "$FrontendUrl/auth/silent-callback" "http://localhost:4200/auth/callback" "http://localhost:4200/auth/silent-callback" `
    --required-resource-accesses '[
        {
            "resourceAppId": "' + $apiAppId + '",
            "resourceAccess": [
                {
                    "id": "access_as_user_scope_id",
                    "type": "Scope"
                }
            ]
        },
        {
            "resourceAppId": "00000003-0000-0000-c000-000000000000",
            "resourceAccess": [
                {
                    "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
                    "type": "Scope"
                },
                {
                    "id": "14dad69e-099b-42c9-810b-d002981feec1",
                    "type": "Scope"
                }
            ]
        }
    ]' `
    --query appId --output tsv

# Create Service Principal for API
Write-Host "👤 Creating Service Principal for API..." -ForegroundColor Blue
$apiServicePrincipalId = az ad sp create --id $apiAppId --query id --output tsv

# Create Service Principal for Frontend
Write-Host "👤 Creating Service Principal for Frontend..." -ForegroundColor Blue
$frontendServicePrincipalId = az ad sp create --id $frontendAppId --query id --output tsv

# Generate client secret for API (for service-to-service communication)
Write-Host "🔑 Generating API Client Secret..." -ForegroundColor Blue
$apiClientSecret = az ad app credential reset --id $apiAppId --append --query password --output tsv

Write-Host "✅ Azure AD App Registrations Created!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 App Registration Details:" -ForegroundColor Yellow
Write-Host "  🔹 API App ID: $apiAppId" -ForegroundColor White
Write-Host "  🔹 API Client Secret: $apiClientSecret" -ForegroundColor White
Write-Host "  🔹 Frontend App ID: $frontendAppId" -ForegroundColor White
Write-Host "  🔹 Tenant ID: $TenantId" -ForegroundColor White
Write-Host ""

# Save configuration to file
$aadConfig = @{
    TenantId = $TenantId
    ApiAppId = $apiAppId
    ApiClientSecret = $apiClientSecret
    FrontendAppId = $frontendAppId
    Authority = "https://login.microsoftonline.com/$TenantId"
    ApiScope = "api://saas-framework-api/access_as_user"
} | ConvertTo-Json

$aadConfig | Out-File -FilePath "azure-ad-config.json" -Encoding UTF8
Write-Host "💾 Azure AD configuration saved to azure-ad-config.json" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update appsettings.json with the app registration details" -ForegroundColor White
Write-Host "  2. Configure the frontend with the Azure AD settings" -ForegroundColor White
Write-Host "  3. Grant admin consent for the required permissions" -ForegroundColor White
