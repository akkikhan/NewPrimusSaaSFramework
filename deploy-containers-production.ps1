#!/usr/bin/env pwsh
param(
    [string]$SubscriptionId = "4f38b6b2-aff0-4b17-9901-2051627ab7e2",
    [string]$ResourceGroup = "rg-saas-factory-dev",
    [string]$ContainerEnv = "saas-factory-env",
    [string]$KeyVaultName = "saas-platform-kv-prod",
    [string]$RegistryName = "saasplatformacrprod",
    [string]$CosmosDbName = "cosmos-saasframework"
)

Write-Host "🚀 DEPLOYING SAAS PLATFORM TO PRODUCTION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Yellow

# Set the subscription
Write-Host "🎯 Setting Azure subscription..." -ForegroundColor Cyan
az account set --subscription $SubscriptionId

# Login to the container registry
Write-Host "🔐 Logging into container registry..." -ForegroundColor Cyan
az acr login --name $RegistryName

# Get Key Vault secrets
Write-Host "🔑 Retrieving secrets from Key Vault..." -ForegroundColor Cyan
$SmtpHost = az keyvault secret show --vault-name $KeyVaultName --name "smtp-host" --query "value" -o tsv
$SmtpPort = az keyvault secret show --vault-name $KeyVaultName --name "smtp-port" --query "value" -o tsv
$SmtpUsername = az keyvault secret show --vault-name $KeyVaultName --name "smtp-username" --query "value" -o tsv
$SmtpPassword = az keyvault secret show --vault-name $KeyVaultName --name "smtp-password" --query "value" -o tsv
$SmtpUseSsl = az keyvault secret show --vault-name $KeyVaultName --name "smtp-use-ssl" --query "value" -o tsv
$CosmosEndpoint = az keyvault secret show --vault-name $KeyVaultName --name "cosmosdb-endpoint" --query "value" -o tsv
$CosmosKey = az keyvault secret show --vault-name $KeyVaultName --name "cosmosdb-key" --query "value" -o tsv
$JwtSecretKey = az keyvault secret show --vault-name $KeyVaultName --name "jwt-secret-key" --query "value" -o tsv

Write-Host "✅ Retrieved $((Get-Variable -Name "*Smtp*", "*Cosmos*", "*Jwt*" | Measure-Object).Count) secrets" -ForegroundColor Green

# Build and push Docker images for each microservice
$services = @(
    @{Name="gateway"; Port=5000; Path="./saas-backend/src/Gateway"},
    @{Name="auth"; Port=5001; Path="./saas-backend/src/Authentication"},
    @{Name="notifications"; Port=5002; Path="./saas-backend/src/Notifications"},
    @{Name="rbac"; Port=5003; Path="./saas-backend/src/RBAC"}
)

foreach ($service in $services) {
    Write-Host "🔨 Building and pushing $($service.Name) service..." -ForegroundColor Yellow
    
    $imageName = "$RegistryName.azurecr.io/saas-$($service.Name):latest"
    
    # Build the Docker image
    if (Test-Path $service.Path) {
        Write-Host "  📦 Building image: $imageName" -ForegroundColor Cyan
        docker build -t $imageName $service.Path
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  🚀 Pushing image: $imageName" -ForegroundColor Cyan
            docker push $imageName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Successfully built and pushed $($service.Name)" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Failed to push $($service.Name)" -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ Failed to build $($service.Name)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠️ Path not found: $($service.Path)" -ForegroundColor Yellow
    }
}

Write-Host "🚀 DEPLOYING CONTAINER APPS..." -ForegroundColor Cyan

# Deploy Gateway Service
Write-Host "🌐 Deploying Gateway Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-gateway" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-gateway:latest" `
    --target-port 5000 `
    --ingress 'external' `
    --min-replicas 1 `
    --max-replicas 3 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:5000" `
        "KeyVault__VaultName=$KeyVaultName" `
        "ConnectionStrings__DefaultConnection=AccountEndpoint=$CosmosEndpoint;AccountKey=$CosmosKey;" `
        "JwtSettings__SecretKey=$JwtSecretKey" `
        "Services__AuthService=https://saas-auth.internal.$ContainerEnv.eastus.azurecontainerapps.io" `
        "Services__NotificationsService=https://saas-notifications.internal.$ContainerEnv.eastus.azurecontainerapps.io" `
        "Services__RbacService=https://saas-rbac.internal.$ContainerEnv.eastus.azurecontainerapps.io"

# Deploy Auth Service
Write-Host "🔐 Deploying Auth Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-auth" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-auth:latest" `
    --target-port 5001 `
    --ingress 'internal' `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:5001" `
        "KeyVault__VaultName=$KeyVaultName" `
        "ConnectionStrings__DefaultConnection=AccountEndpoint=$CosmosEndpoint;AccountKey=$CosmosKey;" `
        "JwtSettings__SecretKey=$JwtSecretKey" `
        "EmailSettings__SmtpHost=$SmtpHost" `
        "EmailSettings__SmtpPort=$SmtpPort" `
        "EmailSettings__SmtpUsername=$SmtpUsername" `
        "EmailSettings__SmtpPassword=$SmtpPassword" `
        "EmailSettings__SmtpUseSsl=$SmtpUseSsl"

# Deploy Notifications Service
Write-Host "📧 Deploying Notifications Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-notifications" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-notifications:latest" `
    --target-port 5002 `
    --ingress 'internal' `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:5002" `
        "KeyVault__VaultName=$KeyVaultName" `
        "ConnectionStrings__DefaultConnection=AccountEndpoint=$CosmosEndpoint;AccountKey=$CosmosKey;" `
        "JwtSettings__SecretKey=$JwtSecretKey" `
        "EmailSettings__SmtpHost=$SmtpHost" `
        "EmailSettings__SmtpPort=$SmtpPort" `
        "EmailSettings__SmtpUsername=$SmtpUsername" `
        "EmailSettings__SmtpPassword=$SmtpPassword" `
        "EmailSettings__SmtpUseSsl=$SmtpUseSsl"

# Deploy RBAC Service
Write-Host "� Deploying RBAC Service..." -ForegroundColor Yellow
az containerapp create `
    --name "saas-rbac" `
    --resource-group $ResourceGroup `
    --environment $ContainerEnv `
    --image "$RegistryName.azurecr.io/saas-rbac:latest" `
    --target-port 5003 `
    --ingress 'internal' `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --env-vars `
        "ASPNETCORE_ENVIRONMENT=Production" `
        "ASPNETCORE_URLS=http://+:5003" `
        "KeyVault__VaultName=$KeyVaultName" `
        "ConnectionStrings__DefaultConnection=AccountEndpoint=$CosmosEndpoint;AccountKey=$CosmosKey;" `
        "JwtSettings__SecretKey=$JwtSecretKey"

Write-Host "📊 Getting deployment status..." -ForegroundColor Cyan
az containerapp list --resource-group $ResourceGroup --query "[?contains(name, 'saas-')].{Name:name, Status:properties.provisioningState, FQDN:properties.configuration.ingress.fqdn}" -o table

Write-Host "🎉 DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "Gateway URL: https://saas-gateway.$ContainerEnv.eastus.azurecontainerapps.io" -ForegroundColor Yellow
