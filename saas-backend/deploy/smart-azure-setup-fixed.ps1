# Smart Azure Infrastructure Setup Script for SaaS Framework
# This script checks for existing resources and only creates what's missing

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId = "4f38b6b2-aff0-4b17-9901-2051627ab7e2",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "saas-framework-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

Write-Host "🚀 Starting Smart Azure Infrastructure Setup for SaaS Framework" -ForegroundColor Green
Write-Host "Subscription: $SubscriptionId" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Set subscription
Write-Host "🔐 Setting subscription..." -ForegroundColor Blue
az account set --subscription $SubscriptionId

# Check existing resources in the resource group
Write-Host "🔍 Checking existing resources in $ResourceGroupName..." -ForegroundColor Blue
$existingResources = az resource list --resource-group $ResourceGroupName --query "[].{Name:name, Type:type}" -o json 2>$null
if ($existingResources) {
    $resources = $existingResources | ConvertFrom-Json
    Write-Host "📋 Found existing resources:" -ForegroundColor Yellow
    foreach ($resource in $resources) {
        Write-Host "  - $($resource.Name) ($($resource.Type))" -ForegroundColor Cyan
    }
} else {
    Write-Host "📋 No existing resources found or resource group doesn't exist" -ForegroundColor Yellow
    $resources = @()
}

# Define required resources
$cosmosAccountName = "saas-framework-cosmos-$Environment"
$keyVaultName = "saas-framework-kv-$Environment"  
$containerRegistryName = "saasframeworkacr$Environment"
$containerAppEnvName = "saas-framework-env-$Environment"
$apiManagementName = "saas-framework-apim-$Environment"
$appInsightsName = "saas-framework-insights-$Environment"
$logWorkspaceName = "saas-framework-logs-$Environment"

Write-Host "🎯 Required resources for environment '$Environment':" -ForegroundColor Yellow
Write-Host "  - Cosmos DB: $cosmosAccountName" -ForegroundColor White
Write-Host "  - Key Vault: $keyVaultName" -ForegroundColor White  
Write-Host "  - Container Registry: $containerRegistryName" -ForegroundColor White
Write-Host "  - Container Apps Env: $containerAppEnvName" -ForegroundColor White
Write-Host "  - API Management: $apiManagementName" -ForegroundColor White
Write-Host "  - Application Insights: $appInsightsName" -ForegroundColor White
Write-Host "  - Log Analytics: $logWorkspaceName" -ForegroundColor White

# Check if resource group exists
Write-Host "📁 Checking Resource Group..." -ForegroundColor Blue
$rgExists = az group show --name $ResourceGroupName 2>$null
if ($rgExists) {
    Write-Host "✅ Resource Group '$ResourceGroupName' already exists" -ForegroundColor Green
} else {
    Write-Host "➕ Creating Resource Group '$ResourceGroupName'..." -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location
    Write-Host "✅ Resource Group created successfully" -ForegroundColor Green
}

# Check for Cosmos DB
Write-Host "🗄️ Checking Cosmos DB..." -ForegroundColor Blue
$cosmosExists = $resources | Where-Object { $_.Type -eq "Microsoft.DocumentDB/databaseAccounts" }
if ($cosmosExists) {
    Write-Host "✅ Cosmos DB '$($cosmosExists.Name)' already exists" -ForegroundColor Green
    $cosmosAccountName = $cosmosExists.Name
} else {
    Write-Host "➕ Creating Cosmos DB Account: $cosmosAccountName" -ForegroundColor Yellow
    az cosmosdb create --name $cosmosAccountName --resource-group $ResourceGroupName --default-consistency-level "Session" --locations regionName=$Location failoverPriority=0 isZoneRedundant=False --enable-automatic-failover false --enable-multiple-write-locations false
    Write-Host "✅ Cosmos DB created successfully" -ForegroundColor Green
    
    # Create database and containers
    Write-Host "🗃️ Creating Cosmos DB Database and containers..." -ForegroundColor Blue
    $databaseName = "SaaSFrameworkDB"
    az cosmosdb sql database create --account-name $cosmosAccountName --resource-group $ResourceGroupName --name $databaseName
    
    # Create containers
    $containers = @("tenants", "users", "roles", "permissions", "notifications")
    foreach ($containerName in $containers) {
        az cosmosdb sql container create --account-name $cosmosAccountName --database-name $databaseName --resource-group $ResourceGroupName --name $containerName --partition-key-path "/tenantId" --throughput 400
        Write-Host "✅ Container '$containerName' created" -ForegroundColor Green
    }
}

# Check for Key Vault  
Write-Host "🔐 Checking Key Vault..." -ForegroundColor Blue
$keyVaultExists = $resources | Where-Object { $_.Type -eq "Microsoft.KeyVault/vaults" }
if ($keyVaultExists) {
    Write-Host "✅ Key Vault '$($keyVaultExists.Name)' already exists" -ForegroundColor Green
    $keyVaultName = $keyVaultExists.Name
} else {
    Write-Host "➕ Creating Key Vault: $keyVaultName" -ForegroundColor Yellow
    az keyvault create --name $keyVaultName --resource-group $ResourceGroupName --location $Location --sku standard
    Write-Host "✅ Key Vault created successfully" -ForegroundColor Green
}

# Check for Container Registry
Write-Host "🐳 Checking Container Registry..." -ForegroundColor Blue  
$acrExists = $resources | Where-Object { $_.Type -eq "Microsoft.ContainerRegistry/registries" }
if ($acrExists) {
    Write-Host "✅ Container Registry '$($acrExists.Name)' already exists" -ForegroundColor Green
    $containerRegistryName = $acrExists.Name
} else {
    Write-Host "➕ Creating Container Registry: $containerRegistryName" -ForegroundColor Yellow
    az acr create --name $containerRegistryName --resource-group $ResourceGroupName --location $Location --sku Basic --admin-enabled true
    Write-Host "✅ Container Registry created successfully" -ForegroundColor Green
}

# Check for Log Analytics Workspace
Write-Host "📊 Checking Log Analytics Workspace..." -ForegroundColor Blue
$logWorkspaceExists = $resources | Where-Object { $_.Type -eq "Microsoft.OperationalInsights/workspaces" }
if ($logWorkspaceExists) {
    Write-Host "✅ Log Analytics Workspace '$($logWorkspaceExists.Name)' already exists" -ForegroundColor Green
    $logWorkspaceName = $logWorkspaceExists.Name
} else {
    Write-Host "➕ Creating Log Analytics Workspace: $logWorkspaceName" -ForegroundColor Yellow
    az monitor log-analytics workspace create --workspace-name $logWorkspaceName --resource-group $ResourceGroupName --location $Location
    Write-Host "✅ Log Analytics Workspace created successfully" -ForegroundColor Green
}

# Check for Application Insights
Write-Host "📈 Checking Application Insights..." -ForegroundColor Blue
$appInsightsExists = $resources | Where-Object { $_.Type -eq "Microsoft.Insights/components" }
if ($appInsightsExists) {
    Write-Host "✅ Application Insights '$($appInsightsExists.Name)' already exists" -ForegroundColor Green
    $appInsightsName = $appInsightsExists.Name
} else {
    Write-Host "➕ Creating Application Insights: $appInsightsName" -ForegroundColor Yellow
    az monitor app-insights component create --app $appInsightsName --location $Location --resource-group $ResourceGroupName --workspace $logWorkspaceName
    Write-Host "✅ Application Insights created successfully" -ForegroundColor Green
}

# Check for Container Apps Environment
Write-Host "🏗️ Checking Container Apps Environment..." -ForegroundColor Blue
$containerAppEnvExists = az containerapp env show --name $containerAppEnvName --resource-group $ResourceGroupName 2>$null
if ($containerAppEnvExists) {
    Write-Host "✅ Container Apps Environment '$containerAppEnvName' already exists" -ForegroundColor Green
} else {
    Write-Host "➕ Creating Container Apps Environment: $containerAppEnvName" -ForegroundColor Yellow
    $workspaceId = az monitor log-analytics workspace show --workspace-name $logWorkspaceName --resource-group $ResourceGroupName --query customerId -o tsv
    $workspaceKey = az monitor log-analytics workspace get-shared-keys --workspace-name $logWorkspaceName --resource-group $ResourceGroupName --query primarySharedKey -o tsv
    az containerapp env create --name $containerAppEnvName --resource-group $ResourceGroupName --location $Location --logs-workspace-id $workspaceId --logs-workspace-key $workspaceKey
    Write-Host "✅ Container Apps Environment created successfully" -ForegroundColor Green
}

# Check for API Management
Write-Host "🌐 Checking API Management..." -ForegroundColor Blue
$apimExists = $resources | Where-Object { $_.Type -eq "Microsoft.ApiManagement/service" }
if ($apimExists) {
    Write-Host "✅ API Management '$($apimExists.Name)' already exists" -ForegroundColor Green
    $apiManagementName = $apimExists.Name
} else {
    Write-Host "➕ Creating API Management: $apiManagementName" -ForegroundColor Yellow
    Write-Host "⚠️ This may take 30-45 minutes..." -ForegroundColor Red
    az apim create --name $apiManagementName --resource-group $ResourceGroupName --location $Location --publisher-name "SaaS Framework" --publisher-email "dev-saas@primussoft.com" --sku-name Developer --sku-capacity 1
    Write-Host "✅ API Management created successfully" -ForegroundColor Green
}

# Store configuration secrets in Key Vault
Write-Host "🔑 Updating Key Vault with configuration..." -ForegroundColor Blue

# Store SMTP configuration  
az keyvault secret set --vault-name $keyVaultName --name "SmtpHost" --value "smtp.office365.com" 2>$null
az keyvault secret set --vault-name $keyVaultName --name "SmtpPort" --value "587" 2>$null
az keyvault secret set --vault-name $keyVaultName --name "SmtpUsername" --value "dev-saas@primussoft.com" 2>$null
az keyvault secret set --vault-name $keyVaultName --name "SmtpPassword" --value "First@098" 2>$null

Write-Host "✅ SMTP configuration stored in Key Vault" -ForegroundColor Green

# Get and store other secrets
try {
    $cosmosConnectionString = az cosmosdb keys list --name $cosmosAccountName --resource-group $ResourceGroupName --type connection-strings --query "connectionStrings[0].connectionString" -o tsv 2>$null
    if ($cosmosConnectionString) {
        az keyvault secret set --vault-name $keyVaultName --name "CosmosConnectionString" --value $cosmosConnectionString 2>$null
        Write-Host "✅ Cosmos DB connection string stored" -ForegroundColor Green
    }
    
    $appInsightsKey = az monitor app-insights component show --app $appInsightsName --resource-group $ResourceGroupName --query instrumentationKey -o tsv 2>$null
    if ($appInsightsKey) {
        az keyvault secret set --vault-name $keyVaultName --name "ApplicationInsightsInstrumentationKey" --value $appInsightsKey 2>$null  
        Write-Host "✅ Application Insights key stored" -ForegroundColor Green
    }
    
    $acrLoginServer = az acr show --name $containerRegistryName --resource-group $ResourceGroupName --query loginServer -o tsv 2>$null
    $acrUsername = az acr credential show --name $containerRegistryName --resource-group $ResourceGroupName --query username -o tsv 2>$null
    $acrPassword = az acr credential show --name $containerRegistryName --resource-group $ResourceGroupName --query "passwords[0].value" -o tsv 2>$null
    
    if ($acrLoginServer -and $acrUsername -and $acrPassword) {
        az keyvault secret set --vault-name $keyVaultName --name "ContainerRegistryServer" --value $acrLoginServer 2>$null
        az keyvault secret set --vault-name $keyVaultName --name "ContainerRegistryUsername" --value $acrUsername 2>$null
        az keyvault secret set --vault-name $keyVaultName --name "ContainerRegistryPassword" --value $acrPassword 2>$null
        Write-Host "✅ Container Registry credentials stored" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Some secrets could not be stored, will try again later" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Smart Azure Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary of Resources:" -ForegroundColor Yellow
Write-Host "✅ Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "✅ Cosmos DB: $cosmosAccountName" -ForegroundColor Cyan
Write-Host "✅ Key Vault: $keyVaultName" -ForegroundColor Cyan
Write-Host "✅ Container Registry: $containerRegistryName" -ForegroundColor Cyan  
Write-Host "✅ Container Apps Environment: $containerAppEnvName" -ForegroundColor Cyan
Write-Host "✅ Application Insights: $appInsightsName" -ForegroundColor Cyan
Write-Host "✅ API Management: $apiManagementName" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Yellow  
Write-Host "1. Run Azure AD setup: .\deploy\azure-ad-setup.ps1 -TenantId a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e" -ForegroundColor White
Write-Host "2. Deploy containers: .\deploy\deploy-containerapps.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor White
Write-Host "3. Seed database: .\deploy\seed-database.ps1" -ForegroundColor White
Write-Host "4. Configure API Management: .\deploy\configure-apim.ps1 -ApimName $apiManagementName" -ForegroundColor White
