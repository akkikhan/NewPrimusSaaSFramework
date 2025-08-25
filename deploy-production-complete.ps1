# Production Deployment Script for SaaS Framework
# This script handles the complete deployment process with proper Azure Key Vault integration

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [Parameter()]
    [string]$Location = "eastus",
    
    [Parameter()]
    [string]$SubscriptionId,
    
    [Parameter()]
    [switch]$SkipKeyVaultSetup,
    
    [Parameter()]
    [switch]$SkipInfrastructure,
    
    [Parameter()]
    [switch]$SkipContainerBuild
)

Write-Host "🚀 Starting Production Deployment for SaaS Framework" -ForegroundColor Cyan
Write-Host "Environment: $EnvironmentName" -ForegroundColor White
Write-Host "Location: $Location" -ForegroundColor White

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Verify Azure CLI login
$account = az account show 2>$null
if (-not $account) {
    Write-Host "❌ Please login to Azure CLI first: az login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Using Azure subscription: $(($account | ConvertFrom-Json).name)" -ForegroundColor Green

# Step 1: Setup Key Vault (unless skipped)
if (-not $SkipKeyVaultSetup) {
    Write-Host ""
    Write-Host "🔐 Step 1: Setting up Azure Key Vault..." -ForegroundColor Cyan
    .\setup-keyvault.ps1 -EnvironmentName $EnvironmentName -Location $Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Key Vault setup failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⏭️ Skipping Key Vault setup" -ForegroundColor Yellow
}

# Step 2: Deploy Infrastructure (unless skipped)
if (-not $SkipInfrastructure) {
    Write-Host ""
    Write-Host "🏗️ Step 2: Deploying Azure Infrastructure..." -ForegroundColor Cyan
    
    # Update environment variables for azd
    $env:AZURE_ENV_NAME = $EnvironmentName
    $env:AZURE_LOCATION = $Location
    $env:ASPNETCORE_ENVIRONMENT = "Production"
    
    # Get Key Vault and Managed Identity names from previous step
    $resourceGroupName = "rg-$EnvironmentName"
    $keyVaultName = az keyvault list --resource-group $resourceGroupName --query "[0].name" -o tsv
    $managedIdentityName = az identity list --resource-group $resourceGroupName --query "[0].name" -o tsv
    
    if (-not $keyVaultName -or -not $managedIdentityName) {
        Write-Host "❌ Could not find Key Vault or Managed Identity. Please run Key Vault setup first." -ForegroundColor Red
        exit 1
    }
    
    $env:KEY_VAULT_NAME = $keyVaultName
    $env:MANAGED_IDENTITY_NAME = $managedIdentityName
    
    Write-Host "Using Key Vault: $keyVaultName" -ForegroundColor White
    Write-Host "Using Managed Identity: $managedIdentityName" -ForegroundColor White
    
    # Deploy infrastructure using Bicep
    az deployment sub create `
        --location $Location `
        --template-file infra/main.bicep `
        --parameters @infra/main.parameters.json `
        --parameters environmentName=$EnvironmentName `
        --parameters location=$Location `
        --parameters keyVaultName=$keyVaultName `
        --parameters managedIdentityName=$managedIdentityName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Infrastructure deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Infrastructure deployed successfully" -ForegroundColor Green
} else {
    Write-Host "⏭️ Skipping infrastructure deployment" -ForegroundColor Yellow
}

# Step 3: Build and Deploy Container Apps (unless skipped)
if (-not $SkipContainerBuild) {
    Write-Host ""
    Write-Host "🐳 Step 3: Building and deploying container images..." -ForegroundColor Cyan
    
    # Get Azure Container Registry name
    $resourceGroupName = "rg-$EnvironmentName"
    $acrName = az acr list --resource-group $resourceGroupName --query "[0].name" -o tsv
    
    if (-not $acrName) {
        Write-Host "❌ Could not find Azure Container Registry" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Using Container Registry: $acrName" -ForegroundColor White
    
    # Build and push container images
    $services = @("Gateway", "Authentication", "RBAC", "Notifications")
    $buildNumber = (Get-Date).ToString("yyyyMMdd-HHmmss")
    
    foreach ($service in $services) {
        $serviceLower = $service.ToLower()
        $imageName = "$serviceLower`:$buildNumber"
        $servicePath = "saas-backend/src/$service"
        
        Write-Host "Building $service container..." -ForegroundColor Yellow
        
        # Build and push to ACR
        az acr build `
            --registry $acrName `
            --image $imageName `
            --file "$servicePath/Dockerfile" `
            $servicePath
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to build $service container" -ForegroundColor Red
            exit 1
        }
        
        # Update container app with new image
        $containerAppName = "ca-$serviceLower-$EnvironmentName"
        Write-Host "Updating container app: $containerAppName" -ForegroundColor Yellow
        
        az containerapp update `
            --name $containerAppName `
            --resource-group $resourceGroupName `
            --image "$acrName.azurecr.io/$imageName" `
            --revision-suffix $buildNumber
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to update $service container app" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ $service deployed successfully" -ForegroundColor Green
    }
} else {
    Write-Host "⏭️ Skipping container build and deployment" -ForegroundColor Yellow
}

# Step 4: Validate Deployment
Write-Host ""
Write-Host "🔍 Step 4: Validating deployment..." -ForegroundColor Cyan

$resourceGroupName = "rg-$EnvironmentName"

# Get container app URLs
$gatewayUrl = az containerapp show --name "ca-gateway-$EnvironmentName" --resource-group $resourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv
$authUrl = az containerapp show --name "ca-authentication-$EnvironmentName" --resource-group $resourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv
$rbacUrl = az containerapp show --name "ca-rbac-$EnvironmentName" --resource-group $resourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv
$notificationsUrl = az containerapp show --name "ca-notifications-$EnvironmentName" --resource-group $resourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "Waiting for services to stabilize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test health endpoints
$healthTests = @(
    @{ Name = "Gateway"; Url = "https://$gatewayUrl/health" }
    @{ Name = "Authentication"; Url = "https://$authUrl/health" }
    @{ Name = "RBAC"; Url = "https://$rbacUrl/health" }
    @{ Name = "Notifications"; Url = "https://$notificationsUrl/health" }
)

$allHealthy = $true
foreach ($test in $healthTests) {
    try {
        Write-Host "Testing $($test.Name) health endpoint..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $test.Url -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($test.Name) is healthy" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $($test.Name) returned status: $($response.StatusCode)" -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host "❌ $($test.Name) health check failed: $($_.Exception.Message)" -ForegroundColor Red
        $allHealthy = $false
    }
}

# Final Status Report
Write-Host ""
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "Environment: $EnvironmentName" -ForegroundColor White
Write-Host "Resource Group: $resourceGroupName" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Yellow
Write-Host "  Gateway: https://$gatewayUrl" -ForegroundColor White
Write-Host "  Authentication: https://$authUrl" -ForegroundColor White
Write-Host "  RBAC: https://$rbacUrl" -ForegroundColor White
Write-Host "  Notifications: https://$notificationsUrl" -ForegroundColor White
Write-Host ""

if ($allHealthy) {
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "All services are healthy and ready to receive traffic." -ForegroundColor Green
} else {
    Write-Host "⚠️ Deployment completed with warnings." -ForegroundColor Yellow
    Write-Host "Some services may need additional time to start or have configuration issues." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update Azure AD B2C settings in Key Vault if not done already" -ForegroundColor White
Write-Host "2. Configure frontend to use the Gateway URL: https://$gatewayUrl" -ForegroundColor White
Write-Host "3. Set up monitoring alerts in Application Insights" -ForegroundColor White
Write-Host "4. Configure custom domain names if required" -ForegroundColor White
