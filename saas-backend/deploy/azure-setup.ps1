# Azure Infrastructure Setup Script for SaaS Framework
# Run this script to create all required Azure resources

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName = "saas-framework-rg",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev"
)

Write-Host "🚀 Starting Azure Infrastructure Setup for SaaS Framework" -ForegroundColor Green
Write-Host "Subscription: $SubscriptionId" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Login and set subscription
Write-Host "🔐 Logging into Azure..." -ForegroundColor Blue
az login
az account set --subscription $SubscriptionId

# Create Resource Group
Write-Host "📁 Creating Resource Group..." -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Create Cosmos DB Account
$cosmosAccountName = "saas-framework-cosmos-$Environment"
Write-Host "🗄️ Creating Cosmos DB Account: $cosmosAccountName" -ForegroundColor Blue
az cosmosdb create `
    --name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --default-consistency-level "Session" `
    --locations regionName=$Location failoverPriority=0 isZoneRedundant=False `
    --enable-automatic-failover false `
    --enable-multiple-write-locations false

# Create Cosmos DB Database
$databaseName = "SaaSFrameworkDB"
Write-Host "🗃️ Creating Cosmos DB Database: $databaseName" -ForegroundColor Blue
az cosmosdb sql database create `
    --account-name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --name $databaseName

# Create Cosmos DB Containers
Write-Host "📦 Creating Cosmos DB Containers..." -ForegroundColor Blue

# Tenants Container
az cosmosdb sql container create `
    --account-name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --database-name $databaseName `
    --name "tenants" `
    --partition-key-path "/id" `
    --throughput 400

# Users Container
az cosmosdb sql container create `
    --account-name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --database-name $databaseName `
    --name "users" `
    --partition-key-path "/tenantId" `
    --throughput 400

# Roles Container
az cosmosdb sql container create `
    --account-name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --database-name $databaseName `
    --name "roles" `
    --partition-key-path "/tenantId" `
    --throughput 400

# Permissions Container
az cosmosdb sql container create `
    --account-name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --database-name $databaseName `
    --name "permissions" `
    --partition-key-path "/tenantId" `
    --throughput 400

# Notifications Container
az cosmosdb sql container create `
    --account-name $cosmosAccountName `
    --resource-group $ResourceGroupName `
    --database-name $databaseName `
    --name "notifications" `
    --partition-key-path "/tenantId" `
    --throughput 400

# Create Key Vault
$keyVaultName = "saas-framework-kv-$Environment"
Write-Host "🔐 Creating Key Vault: $keyVaultName" -ForegroundColor Blue
az keyvault create `
    --name $keyVaultName `
    --resource-group $ResourceGroupName `
    --location $Location

# Create Application Insights
$appInsightsName = "saas-framework-insights-$Environment"
Write-Host "📊 Creating Application Insights: $appInsightsName" -ForegroundColor Blue
az monitor app-insights component create `
    --app $appInsightsName `
    --location $Location `
    --resource-group $ResourceGroupName `
    --kind web

# Create Container Registry
$acrName = "saasframeworkacr$Environment"
Write-Host "🐳 Creating Container Registry: $acrName" -ForegroundColor Blue
az acr create `
    --name $acrName `
    --resource-group $ResourceGroupName `
    --sku Basic `
    --admin-enabled true

# Create Container Apps Environment
$containerEnvName = "saas-framework-env-$Environment"
Write-Host "🏗️ Creating Container Apps Environment: $containerEnvName" -ForegroundColor Blue
az containerapp env create `
    --name $containerEnvName `
    --resource-group $ResourceGroupName `
    --location $Location

# Create API Management
$apimName = "saas-framework-apim-$Environment"
Write-Host "🌐 Creating API Management: $apimName" -ForegroundColor Blue
az apim create `
    --name $apimName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --publisher-email "admin@primussoft.com" `
    --publisher-name "Primus Soft" `
    --sku-name Developer

# Create App Service Plan for Frontend
$appServicePlanName = "saas-framework-plan-$Environment"
Write-Host "🖥️ Creating App Service Plan: $appServicePlanName" -ForegroundColor Blue
az appservice plan create `
    --name $appServicePlanName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --sku B1 `
    --is-linux

# Create Web App for Frontend
$webAppName = "saas-framework-frontend-$Environment"
Write-Host "🌍 Creating Web App: $webAppName" -ForegroundColor Blue
az webapp create `
    --name $webAppName `
    --resource-group $ResourceGroupName `
    --plan $appServicePlanName `
    --runtime "NODE:18-lts"

# Get Cosmos DB Connection String
Write-Host "🔗 Retrieving Cosmos DB Connection String..." -ForegroundColor Blue
$cosmosConnectionString = az cosmosdb keys list --name $cosmosAccountName --resource-group $ResourceGroupName --type connection-strings --query "connectionStrings[0].connectionString" --output tsv

# Get Application Insights Instrumentation Key
$instrumentationKey = az monitor app-insights component show --app $appInsightsName --resource-group $ResourceGroupName --query "instrumentationKey" --output tsv

# Store secrets in Key Vault
Write-Host "🔒 Storing secrets in Key Vault..." -ForegroundColor Blue

# JWT Secret
$jwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
az keyvault secret set --vault-name $keyVaultName --name "JWT-Secret" --value $jwtSecret

# Cosmos DB Connection String
az keyvault secret set --vault-name $keyVaultName --name "CosmosDB-ConnectionString" --value $cosmosConnectionString

# SMTP Configuration
az keyvault secret set --vault-name $keyVaultName --name "SMTP-Username" --value "dev-saas@primussoft.com"
az keyvault secret set --vault-name $keyVaultName --name "SMTP-Password" --value "First@098"

# Application Insights Key
az keyvault secret set --vault-name $keyVaultName --name "ApplicationInsights-InstrumentationKey" --value $instrumentationKey

Write-Host "✅ Azure Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Created Resources:" -ForegroundColor Yellow
Write-Host "  🗄️ Cosmos DB: $cosmosAccountName" -ForegroundColor White
Write-Host "  🔐 Key Vault: $keyVaultName" -ForegroundColor White
Write-Host "  📊 App Insights: $appInsightsName" -ForegroundColor White
Write-Host "  🐳 Container Registry: $acrName" -ForegroundColor White
Write-Host "  🏗️ Container Environment: $containerEnvName" -ForegroundColor White
Write-Host "  🌐 API Management: $apimName" -ForegroundColor White
Write-Host "  🌍 Frontend Web App: $webAppName" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Connection String: $cosmosConnectionString" -ForegroundColor Cyan
Write-Host "🔑 Instrumentation Key: $instrumentationKey" -ForegroundColor Cyan

# Output deployment information
$deploymentInfo = @{
    ResourceGroup = $ResourceGroupName
    CosmosDB = $cosmosAccountName
    KeyVault = $keyVaultName
    ApplicationInsights = $appInsightsName
    ContainerRegistry = $acrName
    ContainerEnvironment = $containerEnvName
    ApiManagement = $apimName
    WebApp = $webAppName
    CosmosConnectionString = $cosmosConnectionString
    InstrumentationKey = $instrumentationKey
} | ConvertTo-Json

$deploymentInfo | Out-File -FilePath "azure-deployment-info.json" -Encoding UTF8
Write-Host "💾 Deployment info saved to azure-deployment-info.json" -ForegroundColor Green
