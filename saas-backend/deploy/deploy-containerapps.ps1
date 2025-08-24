# Container Apps Deployment Script
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ContainerEnvironmentName,
    
    [Parameter(Mandatory=$true)]
    [string]$ContainerRegistryName,
    
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev"
)

Write-Host "🚀 Deploying SaaS Framework to Azure Container Apps" -ForegroundColor Green

# Build and push Docker images
Write-Host "🔨 Building and pushing Docker images..." -ForegroundColor Blue

# Login to ACR
az acr login --name $ContainerRegistryName

# Build and push Gateway
Write-Host "📦 Building Gateway service..." -ForegroundColor Yellow
docker build -t "$ContainerRegistryName.azurecr.io/saas-gateway:latest" -f src/Gateway/Dockerfile .
docker push "$ContainerRegistryName.azurecr.io/saas-gateway:latest"

# Build and push Authentication
Write-Host "📦 Building Authentication service..." -ForegroundColor Yellow
docker build -t "$ContainerRegistryName.azurecr.io/saas-authentication:latest" -f src/Authentication/Dockerfile .
docker push "$ContainerRegistryName.azurecr.io/saas-authentication:latest"

# Build and push RBAC
Write-Host "📦 Building RBAC service..." -ForegroundColor Yellow
docker build -t "$ContainerRegistryName.azurecr.io/saas-rbac:latest" -f src/RBAC/Dockerfile .
docker push "$ContainerRegistryName.azurecr.io/saas-rbac:latest"

# Build and push Notifications
Write-Host "📦 Building Notifications service..." -ForegroundColor Yellow
docker build -t "$ContainerRegistryName.azurecr.io/saas-notifications:latest" -f src/Notifications/Dockerfile .
docker push "$ContainerRegistryName.azurecr.io/saas-notifications:latest"

# Deploy Gateway Container App
Write-Host "🌐 Deploying Gateway Container App..." -ForegroundColor Blue
az containerapp create `
    --name "saas-gateway-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $ContainerEnvironmentName `
    --image "$ContainerRegistryName.azurecr.io/saas-gateway:latest" `
    --target-port 8080 `
    --ingress external `
    --registry-server "$ContainerRegistryName.azurecr.io" `
    --cpu 0.5 `
    --memory 1Gi `
    --min-replicas 1 `
    --max-replicas 5

# Deploy Authentication Container App
Write-Host "🔐 Deploying Authentication Container App..." -ForegroundColor Blue
az containerapp create `
    --name "saas-authentication-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $ContainerEnvironmentName `
    --image "$ContainerRegistryName.azurecr.io/saas-authentication:latest" `
    --target-port 7011 `
    --ingress internal `
    --registry-server "$ContainerRegistryName.azurecr.io" `
    --cpu 0.25 `
    --memory 0.5Gi `
    --min-replicas 1 `
    --max-replicas 3

# Deploy RBAC Container App
Write-Host "👥 Deploying RBAC Container App..." -ForegroundColor Blue
az containerapp create `
    --name "saas-rbac-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $ContainerEnvironmentName `
    --image "$ContainerRegistryName.azurecr.io/saas-rbac:latest" `
    --target-port 7002 `
    --ingress internal `
    --registry-server "$ContainerRegistryName.azurecr.io" `
    --cpu 0.25 `
    --memory 0.5Gi `
    --min-replicas 1 `
    --max-replicas 3

# Deploy Notifications Container App
Write-Host "📧 Deploying Notifications Container App..." -ForegroundColor Blue
az containerapp create `
    --name "saas-notifications-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $ContainerEnvironmentName `
    --image "$ContainerRegistryName.azurecr.io/saas-notifications:latest" `
    --target-port 7015 `
    --ingress internal `
    --registry-server "$ContainerRegistryName.azurecr.io" `
    --cpu 0.25 `
    --memory 0.5Gi `
    --min-replicas 1 `
    --max-replicas 3

Write-Host "✅ Deployment Complete!" -ForegroundColor Green

# Get Gateway URL
$gatewayUrl = az containerapp ingress show --name "saas-gateway-$Environment" --resource-group $ResourceGroupName --query fqdn --output tsv
Write-Host "🌍 Gateway URL: https://$gatewayUrl" -ForegroundColor Cyan
