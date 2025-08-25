# Deploy to Azure App Service for Global Access
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$true)]
    [string]$AppServicePlanName = "saas-framework-plan",
    
    [Parameter(Mandatory=$true)]
    [string]$CustomDomain = "api.yourcompany.com"
)

Write-Host "🌐 Deploying SaaS Framework to App Service for Global Access" -ForegroundColor Green

# Create App Service Plan with Premium tier for custom domains and SSL
az appservice plan create `
    --name $AppServicePlanName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --sku P1V2 `
    --is-linux

# Create App Service for Gateway
az webapp create `
    --resource-group $ResourceGroupName `
    --plan $AppServicePlanName `
    --name "saas-gateway-global" `
    --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"

# Create App Service for Authentication
az webapp create `
    --resource-group $ResourceGroupName `
    --plan $AppServicePlanName `
    --name "saas-auth-global" `
    --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"

# Create App Service for RBAC
az webapp create `
    --resource-group $ResourceGroupName `
    --plan $AppServicePlanName `
    --name "saas-rbac-global" `
    --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"

# Configure custom domain (requires manual DNS setup)
Write-Host "🔗 Configuring custom domain..." -ForegroundColor Blue
az webapp config hostname add --webapp-name "saas-gateway-global" --resource-group $ResourceGroupName --hostname $CustomDomain

# Enable HTTPS and SSL
az webapp update --resource-group $ResourceGroupName --name "saas-gateway-global" --https-only true

Write-Host "✅ App Service deployment complete!" -ForegroundColor Green
Write-Host "🌍 Custom Domain: https://$CustomDomain" -ForegroundColor Cyan
Write-Host "📝 Don't forget to configure DNS records for your custom domain" -ForegroundColor Yellow
