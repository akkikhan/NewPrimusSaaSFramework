#!/usr/bin/env pwsh
param(
    [string]$SubscriptionId = "4f38b6b2-aff0-4b17-9901-2051627ab7e2"
)

Write-Host "🚀 QUICK DEPLOYMENT: Building and Deploying Backend Services" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Yellow

# Set the subscription
az account set --subscription $SubscriptionId

# Variables
$ResourceGroup = "rg-saas-factory-dev"
$ContainerEnv = "saas-factory-env"
$RegistryName = "saasplatformacrprod"
$KeyVaultName = "saas-platform-kv-prod"

# Login to container registry
Write-Host "🔐 Logging into container registry..." -ForegroundColor Cyan
az acr login --name $RegistryName

# Get secrets (optimized single call each)
Write-Host "🔑 Retrieving configuration from Key Vault..." -ForegroundColor Cyan
$CosmosEndpoint = az keyvault secret show --vault-name $KeyVaultName --name "cosmosdb-endpoint" --query "value" -o tsv
$CosmosKey = az keyvault secret show --vault-name $KeyVaultName --name "cosmosdb-key" --query "value" -o tsv
$JwtSecret = az keyvault secret show --vault-name $KeyVaultName --name "jwt-secret-key" --query "value" -o tsv

$SmtpHost = az keyvault secret show --vault-name $KeyVaultName --name "smtp-host" --query "value" -o tsv
$SmtpPort = az keyvault secret show --vault-name $KeyVaultName --name "smtp-port" --query "value" -o tsv
$SmtpUsername = az keyvault secret show --vault-name $KeyVaultName --name "smtp-username" --query "value" -o tsv
$SmtpPassword = az keyvault secret show --vault-name $KeyVaultName --name "smtp-password" --query "value" -o tsv

$ConnectionString = "AccountEndpoint=$CosmosEndpoint;AccountKey=$CosmosKey;"

Write-Host "✅ Configuration retrieved successfully" -ForegroundColor Green

# Build and push images
$services = @(
    @{Name="gateway"; Path="saas-backend/src/Gateway"; Port=8080},
    @{Name="auth"; Path="saas-backend/src/Authentication"; Port=8080},
    @{Name="notifications"; Path="saas-backend/src/Notifications"; Port=8080},
    @{Name="rbac"; Path="saas-backend/src/RBAC"; Port=8080}
)

foreach ($service in $services) {
    Write-Host "🔨 Building $($service.Name) service..." -ForegroundColor Yellow
    
    $imageName = "$RegistryName.azurecr.io/saas-$($service.Name):latest"
    
    if (Test-Path $service.Path) {
        Write-Host "  📦 Building: $imageName" -ForegroundColor Cyan
        docker build -t $imageName $service.Path
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  🚀 Pushing: $imageName" -ForegroundColor Cyan
            docker push $imageName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ $($service.Name) ready for deployment" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Failed to push $($service.Name)" -ForegroundColor Red
                return
            }
        } else {
            Write-Host "  ❌ Failed to build $($service.Name)" -ForegroundColor Red
            return
        }
    } else {
        Write-Host "  ⚠️ Path not found: $($service.Path)" -ForegroundColor Yellow
        return
    }
}

Write-Host "🚀 DEPLOYING CONTAINER APPS..." -ForegroundColor Cyan

# Deploy Gateway (External Access)
Write-Host "🌐 Deploying Gateway Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-gateway-prod" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-gateway:latest" `
    --target-port 8080 `
    --ingress 'external' `
    --min-replicas 1 `
    --max-replicas 3 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:8080" `
        "ConnectionStrings__CosmosDB=$ConnectionString" `
        "JWT__Secret=$JwtSecret" `
        "JWT__Issuer=SaaSFramework" `
        "JWT__Audience=SaaSFramework" `
        "JWT__ExpiryMinutes=60"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Gateway service" -ForegroundColor Red
    return
}

# Deploy Auth Service (Internal)
Write-Host "🔐 Deploying Auth Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-auth-prod" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-auth:latest" `
    --target-port 8080 `
    --ingress 'internal' `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:8080" `
        "ConnectionStrings__CosmosDB=$ConnectionString" `
        "JWT__Secret=$JwtSecret" `
        "JWT__Issuer=SaaSFramework" `
        "JWT__Audience=SaaSFramework"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Auth service" -ForegroundColor Red
    return
}

# Deploy Notifications Service (Internal)
Write-Host "📧 Deploying Notifications Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-notifications-prod" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-notifications:latest" `
    --target-port 8080 `
    --ingress 'internal' `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:8080" `
        "ConnectionStrings__CosmosDB=$ConnectionString" `
        "EmailSettings__SmtpHost=$SmtpHost" `
        "EmailSettings__SmtpPort=$SmtpPort" `
        "EmailSettings__SmtpUsername=$SmtpUsername" `
        "EmailSettings__SmtpPassword=$SmtpPassword" `
        "EmailSettings__SmtpUseSsl=true"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy Notifications service" -ForegroundColor Red
    return
}

# Deploy RBAC Service (Internal)
Write-Host "🔒 Deploying RBAC Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-rbac-prod" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-rbac:latest" `
    --target-port 8080 `
    --ingress 'internal' `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:8080" `
        "ConnectionStrings__CosmosDB=$ConnectionString" `
        "JWT__Secret=$JwtSecret" `
        "JWT__Issuer=SaaSFramework" `
        "JWT__Audience=SaaSFramework"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy RBAC service" -ForegroundColor Red
    return
}

Write-Host "📊 Getting deployment status..." -ForegroundColor Cyan
az containerapp list --resource-group $ResourceGroup --query "[?contains(name, 'saas-') && contains(name, '-prod')].{Name:name, Status:properties.provisioningState, URL:properties.configuration.ingress.fqdn}" -o table

Write-Host "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
$gatewayUrl = az containerapp show --name "saas-gateway-prod" --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
Write-Host "🌐 Gateway URL: https://$gatewayUrl" -ForegroundColor Yellow
Write-Host "🔑 All secrets stored in Key Vault: $KeyVaultName" -ForegroundColor Cyan
