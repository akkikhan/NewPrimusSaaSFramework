# Azure Container Apps Deployment Script for Global Exposure
param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName = "saas-framework-global",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$true)]
    [string]$Environment = "production"
)

Write-Host "🌍 Deploying SaaS Framework for Global Access" -ForegroundColor Green

# Set subscription
az account set --subscription $SubscriptionId

# Create resource group
Write-Host "📁 Creating resource group..." -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Create Container Registry
Write-Host "📦 Creating Container Registry..." -ForegroundColor Blue
$acrName = "saasframework$($Environment.ToLower())acr"
az acr create --resource-group $ResourceGroupName --name $acrName --sku Premium --location $Location

# Create Log Analytics Workspace
Write-Host "📊 Creating Log Analytics Workspace..." -ForegroundColor Blue
$logWorkspace = "saas-framework-logs-$Environment"
az monitor log-analytics workspace create --resource-group $ResourceGroupName --workspace-name $logWorkspace --location $Location

# Get Log Analytics Workspace ID
$workspaceId = az monitor log-analytics workspace show --resource-group $ResourceGroupName --workspace-name $logWorkspace --query customerId --output tsv

# Create Container Apps Environment
Write-Host "🏗️ Creating Container Apps Environment..." -ForegroundColor Blue
$containerEnvName = "saas-framework-env-$Environment"
az containerapp env create `
    --name $containerEnvName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --logs-workspace-id $workspaceId

# Create Application Insights
Write-Host "📈 Creating Application Insights..." -ForegroundColor Blue
$appInsightsName = "saas-framework-insights-$Environment"
az monitor app-insights component create `
    --app $appInsightsName `
    --location $Location `
    --resource-group $ResourceGroupName `
    --kind web

# Build and push Docker images
Write-Host "🔨 Building and pushing Docker images..." -ForegroundColor Blue
az acr login --name $acrName

# Build and push all services
$services = @("gateway", "authentication", "rbac", "notifications")
foreach ($service in $services) {
    Write-Host "📦 Building $service service..." -ForegroundColor Yellow
    $imageName = "$acrName.azurecr.io/saas-$service`:$Environment"
    
    if ($service -eq "gateway") {
        docker build -t $imageName -f src/Gateway/Dockerfile .
    }
    elseif ($service -eq "authentication") {
        docker build -t $imageName -f src/Authentication/Dockerfile .
    }
    elseif ($service -eq "rbac") {
        docker build -t $imageName -f src/RBAC/Dockerfile .
    }
    elseif ($service -eq "notifications") {
        docker build -t $imageName -f src/Notifications/Dockerfile .
    }
    
    docker push $imageName
}

# Deploy Container Apps with global accessibility
Write-Host "🌐 Deploying Container Apps with external ingress..." -ForegroundColor Blue

# Deploy Authentication Service
az containerapp create `
    --name "saas-auth-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $containerEnvName `
    --image "$acrName.azurecr.io/saas-authentication:$Environment" `
    --target-port 8080 `
    --ingress external `
    --min-replicas 2 `
    --max-replicas 10 `
    --cpu 0.5 `
    --memory 1Gi `
    --registry-server "$acrName.azurecr.io" `
    --env-vars "ASPNETCORE_ENVIRONMENT=$Environment" "ASPNETCORE_URLS=http://+:8080"

# Deploy RBAC Service
az containerapp create `
    --name "saas-rbac-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $containerEnvName `
    --image "$acrName.azurecr.io/saas-rbac:$Environment" `
    --target-port 8080 `
    --ingress external `
    --min-replicas 2 `
    --max-replicas 10 `
    --cpu 0.5 `
    --memory 1Gi `
    --registry-server "$acrName.azurecr.io" `
    --env-vars "ASPNETCORE_ENVIRONMENT=$Environment" "ASPNETCORE_URLS=http://+:8080"

# Deploy Gateway Service (Main entry point)
az containerapp create `
    --name "saas-gateway-$Environment" `
    --resource-group $ResourceGroupName `
    --environment $containerEnvName `
    --image "$acrName.azurecr.io/saas-gateway:$Environment" `
    --target-port 8080 `
    --ingress external `
    --min-replicas 3 `
    --max-replicas 20 `
    --cpu 1.0 `
    --memory 2Gi `
    --registry-server "$acrName.azurecr.io" `
    --env-vars "ASPNETCORE_ENVIRONMENT=$Environment" "ASPNETCORE_URLS=http://+:8080"

# Get Gateway URL
$gatewayUrl = az containerapp show --name "saas-gateway-$Environment" --resource-group $ResourceGroupName --query properties.configuration.ingress.fqdn --output tsv

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌍 Gateway URL: https://$gatewayUrl" -ForegroundColor Cyan
Write-Host "🔐 Auth API: https://$gatewayUrl/api/v2/auth" -ForegroundColor Cyan
Write-Host "👥 RBAC API: https://$gatewayUrl/api/v2/rbac" -ForegroundColor Cyan

# Create API Management instance
Write-Host "🛡️ Creating API Management instance..." -ForegroundColor Blue
$apimName = "saas-framework-apim-$Environment"
az apim create `
    --resource-group $ResourceGroupName `
    --name $apimName `
    --location $Location `
    --publisher-name "SaaS Framework" `
    --publisher-email "admin@saasframework.com" `
    --sku-name Standard

Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure custom domain for production" -ForegroundColor White
Write-Host "2. Set up API Management policies" -ForegroundColor White
Write-Host "3. Configure authentication providers" -ForegroundColor White
Write-Host "4. Set up monitoring and alerts" -ForegroundColor White
