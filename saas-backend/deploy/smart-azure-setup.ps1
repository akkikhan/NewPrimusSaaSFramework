# Smart Azure Infrastructure Setup Script for SaaS Framework
# This script checks for existing resources and only creates what's missing

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
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

# Function to check if resource exists
function Test-AzureResource {
    param(
        [string]$ResourceName,
        [string]$ResourceGroup,
        [string]$ResourceType
    )
    
    $exists = az resource show --name $ResourceName --resource-group $ResourceGroup --resource-type $ResourceType 2>$null
    return $null -ne $exists
}

# Function to check if resource group exists
function Test-ResourceGroup {
    param([string]$ResourceGroupName)
    
    $exists = az group show --name $ResourceGroupName 2>$null
    return $null -ne $exists
}

# Set subscription
Write-Host "🔐 Setting subscription..." -ForegroundColor Blue
az account set --subscription $SubscriptionId

# Check and create Resource Group
Write-Host "📁 Checking Resource Group..." -ForegroundColor Blue
if (Test-ResourceGroup -ResourceGroupName $ResourceGroupName) {
    Write-Host "✅ Resource Group '$ResourceGroupName' already exists" -ForegroundColor Green
} else {
    Write-Host "➕ Creating Resource Group '$ResourceGroupName'..." -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location
    Write-Host "✅ Resource Group created successfully" -ForegroundColor Green
}

# Check existing resources in the resource group
Write-Host "🔍 Checking existing resources..." -ForegroundColor Blue
$existingResources = az resource list --resource-group $ResourceGroupName --query "[].{Name:name, Type:type}" -o json | ConvertFrom-Json

Write-Host "📋 Found existing resources:" -ForegroundColor Yellow
foreach ($resource in $existingResources) {
    Write-Host "  - $($resource.Name) ($($resource.Type))" -ForegroundColor Cyan
}

# Define required resources
$cosmosAccountName = "saas-framework-cosmos-$Environment"
$keyVaultName = "saas-framework-kv-$Environment"
$containerRegistryName = "saasframeworkacr$Environment"
$containerAppEnvName = "saas-framework-env-$Environment"
$apiManagementName = "saas-framework-apim-$Environment"
$appInsightsName = "saas-framework-insights-$Environment"
$logWorkspaceName = "saas-framework-logs-$Environment"

# Check and create Cosmos DB
Write-Host "🗄️ Checking Cosmos DB..." -ForegroundColor Blue
$cosmosExists = $existingResources | Where-Object { $_.Type -eq "Microsoft.DocumentDB/databaseAccounts" }
if ($cosmosExists) {
    Write-Host "✅ Cosmos DB '$($cosmosExists.Name)' already exists" -ForegroundColor Green
    $cosmosAccountName = $cosmosExists.Name
} else {
    Write-Host "➕ Creating Cosmos DB Account: $cosmosAccountName" -ForegroundColor Yellow
    az cosmosdb create `
        --name $cosmosAccountName `
        --resource-group $ResourceGroupName `
        --default-consistency-level "Session" `
        --locations regionName=$Location failoverPriority=0 isZoneRedundant=False `
        --enable-automatic-failover false `
        --enable-multiple-write-locations false
    
    Write-Host "✅ Cosmos DB created successfully" -ForegroundColor Green
}

# Check and create Cosmos DB Database and Containers
Write-Host "🗃️ Checking Cosmos DB Database..." -ForegroundColor Blue
$databaseName = "SaaSFrameworkDB"
$databaseExists = az cosmosdb sql database show --account-name $cosmosAccountName --resource-group $ResourceGroupName --name $databaseName 2>$null
if ($databaseExists) {
    Write-Host "✅ Database '$databaseName' already exists" -ForegroundColor Green
} else {
    Write-Host "➕ Creating Cosmos DB Database: $databaseName" -ForegroundColor Yellow
    az cosmosdb sql database create `
        --account-name $cosmosAccountName `
        --resource-group $ResourceGroupName `
        --name $databaseName
    Write-Host "✅ Database created successfully" -ForegroundColor Green
}

# Create containers if they don't exist
$containers = @(
    @{ Name = "tenants"; PartitionKey = "/tenantId" },
    @{ Name = "users"; PartitionKey = "/tenantId" },
    @{ Name = "roles"; PartitionKey = "/tenantId" },
    @{ Name = "permissions"; PartitionKey = "/tenantId" },
    @{ Name = "notifications"; PartitionKey = "/tenantId" }
)

foreach ($container in $containers) {
    Write-Host "📦 Checking container '$($container.Name)'..." -ForegroundColor Blue
    $containerExists = az cosmosdb sql container show --account-name $cosmosAccountName --database-name $databaseName --resource-group $ResourceGroupName --name $container.Name 2>$null
    if ($containerExists) {
        Write-Host "✅ Container '$($container.Name)' already exists" -ForegroundColor Green
    } else {
        Write-Host "➕ Creating container '$($container.Name)'..." -ForegroundColor Yellow
        az cosmosdb sql container create `
            --account-name $cosmosAccountName `
            --database-name $databaseName `
            --resource-group $ResourceGroupName `
            --name $container.Name `
            --partition-key-path $container.PartitionKey `
            --throughput 400
        Write-Host "✅ Container '$($container.Name)' created successfully" -ForegroundColor Green
    }
}

# Check and create Key Vault
Write-Host "🔐 Checking Key Vault..." -ForegroundColor Blue
$keyVaultExists = $existingResources | Where-Object { $_.Type -eq "Microsoft.KeyVault/vaults" }
if ($keyVaultExists) {
    Write-Host "✅ Key Vault '$($keyVaultExists.Name)' already exists" -ForegroundColor Green
    $keyVaultName = $keyVaultExists.Name
} else {
    Write-Host "➕ Creating Key Vault: $keyVaultName" -ForegroundColor Yellow
    az keyvault create `
        --name $keyVaultName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku standard
    Write-Host "✅ Key Vault created successfully" -ForegroundColor Green
}

# Check and create Container Registry
Write-Host "🐳 Checking Container Registry..." -ForegroundColor Blue
$acrExists = $existingResources | Where-Object { $_.Type -eq "Microsoft.ContainerRegistry/registries" }
if ($acrExists) {
    Write-Host "✅ Container Registry '$($acrExists.Name)' already exists" -ForegroundColor Green
    $containerRegistryName = $acrExists.Name
} else {
    Write-Host "➕ Creating Container Registry: $containerRegistryName" -ForegroundColor Yellow
    az acr create `
        --name $containerRegistryName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku Basic `
        --admin-enabled true
    Write-Host "✅ Container Registry created successfully" -ForegroundColor Green
}

# Check and create Log Analytics Workspace
Write-Host "📊 Checking Log Analytics Workspace..." -ForegroundColor Blue
$logWorkspaceExists = $existingResources | Where-Object { $_.Type -eq "Microsoft.OperationalInsights/workspaces" }
if ($logWorkspaceExists) {
    Write-Host "✅ Log Analytics Workspace '$($logWorkspaceExists.Name)' already exists" -ForegroundColor Green
    $logWorkspaceName = $logWorkspaceExists.Name
} else {
    Write-Host "➕ Creating Log Analytics Workspace: $logWorkspaceName" -ForegroundColor Yellow
    az monitor log-analytics workspace create `
        --workspace-name $logWorkspaceName `
        --resource-group $ResourceGroupName `
        --location $Location
    Write-Host "✅ Log Analytics Workspace created successfully" -ForegroundColor Green
}

# Check and create Application Insights
Write-Host "📈 Checking Application Insights..." -ForegroundColor Blue
$appInsightsExists = $existingResources | Where-Object { $_.Type -eq "Microsoft.Insights/components" }
if ($appInsightsExists) {
    Write-Host "✅ Application Insights '$($appInsightsExists.Name)' already exists" -ForegroundColor Green
    $appInsightsName = $appInsightsExists.Name
} else {
    Write-Host "➕ Creating Application Insights: $appInsightsName" -ForegroundColor Yellow
    az monitor app-insights component create `
        --app $appInsightsName `
        --location $Location `
        --resource-group $ResourceGroupName `
        --workspace $logWorkspaceName
    Write-Host "✅ Application Insights created successfully" -ForegroundColor Green
}

# Check and create Container Apps Environment
Write-Host "🏗️ Checking Container Apps Environment..." -ForegroundColor Blue
$containerAppEnvExists = az containerapp env show --name $containerAppEnvName --resource-group $ResourceGroupName 2>$null
if ($containerAppEnvExists) {
    Write-Host "✅ Container Apps Environment '$containerAppEnvName' already exists" -ForegroundColor Green
} else {
    Write-Host "➕ Creating Container Apps Environment: $containerAppEnvName" -ForegroundColor Yellow
    az containerapp env create `
        --name $containerAppEnvName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --logs-workspace-id (az monitor log-analytics workspace show --workspace-name $logWorkspaceName --resource-group $ResourceGroupName --query customerId -o tsv) `
        --logs-workspace-key (az monitor log-analytics workspace get-shared-keys --workspace-name $logWorkspaceName --resource-group $ResourceGroupName --query primarySharedKey -o tsv)
    Write-Host "✅ Container Apps Environment created successfully" -ForegroundColor Green
}

# Check and create API Management
Write-Host "🌐 Checking API Management..." -ForegroundColor Blue
$apimExists = $existingResources | Where-Object { $_.Type -eq "Microsoft.ApiManagement/service" }
if ($apimExists) {
    Write-Host "✅ API Management '$($apimExists.Name)' already exists" -ForegroundColor Green
    $apiManagementName = $apimExists.Name
} else {
    Write-Host "➕ Creating API Management: $apiManagementName" -ForegroundColor Yellow
    Write-Host "⚠️ This may take 30-45 minutes..." -ForegroundColor Red
    az apim create `
        --name $apiManagementName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --publisher-name "SaaS Framework" `
        --publisher-email "dev-saas@primussoft.com" `
        --sku-name Developer `
        --sku-capacity 1
    Write-Host "✅ API Management created successfully" -ForegroundColor Green
}

# Store important configuration in Key Vault
Write-Host "🔑 Storing configuration secrets..." -ForegroundColor Blue

# Get Cosmos DB connection string
$cosmosConnectionString = az cosmosdb keys list --name $cosmosAccountName --resource-group $ResourceGroupName --type connection-strings --query "connectionStrings[0].connectionString" -o tsv

# Get Application Insights instrumentation key
$appInsightsKey = az monitor app-insights component show --app $appInsightsName --resource-group $ResourceGroupName --query instrumentationKey -o tsv

# Get Container Registry credentials
$acrLoginServer = az acr show --name $containerRegistryName --resource-group $ResourceGroupName --query loginServer -o tsv
$acrUsername = az acr credential show --name $containerRegistryName --resource-group $ResourceGroupName --query username -o tsv
$acrPassword = az acr credential show --name $containerRegistryName --resource-group $ResourceGroupName --query "passwords[0].value" -o tsv

# Store secrets in Key Vault
az keyvault secret set --vault-name $keyVaultName --name "CosmosConnectionString" --value $cosmosConnectionString
az keyvault secret set --vault-name $keyVaultName --name "ApplicationInsightsInstrumentationKey" --value $appInsightsKey
az keyvault secret set --vault-name $keyVaultName --name "ContainerRegistryServer" --value $acrLoginServer
az keyvault secret set --vault-name $keyVaultName --name "ContainerRegistryUsername" --value $acrUsername
az keyvault secret set --vault-name $keyVaultName --name "ContainerRegistryPassword" --value $acrPassword

# Store SMTP configuration
az keyvault secret set --vault-name $keyVaultName --name "SmtpHost" --value "smtp.office365.com"
az keyvault secret set --vault-name $keyVaultName --name "SmtpPort" --value "587"
az keyvault secret set --vault-name $keyVaultName --name "SmtpUsername" --value "your-email@yourdomain.com"
az keyvault secret set --vault-name $keyVaultName --name "SmtpPassword" --value "YOUR_EMAIL_PASSWORD"

Write-Host "🎉 Smart Azure Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "📋 Summary of Resources:" -ForegroundColor Yellow
Write-Host "✅ Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "✅ Cosmos DB: $cosmosAccountName" -ForegroundColor Cyan
Write-Host "✅ Key Vault: $keyVaultName" -ForegroundColor Cyan
Write-Host "✅ Container Registry: $containerRegistryName" -ForegroundColor Cyan
Write-Host "✅ Container Apps Environment: $containerAppEnvName" -ForegroundColor Cyan
Write-Host "✅ Application Insights: $appInsightsName" -ForegroundColor Cyan
Write-Host "✅ API Management: $apiManagementName" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "🚀 Next steps:" -ForegroundColor Yellow
Write-Host "1. Run Azure AD setup: .\deploy\azure-ad-setup.ps1" -ForegroundColor White
Write-Host "2. Deploy containers: .\deploy\deploy-containerapps.ps1" -ForegroundColor White
Write-Host "3. Seed database: .\deploy\seed-database.ps1" -ForegroundColor White
Write-Host "4. Configure API Management: .\deploy\configure-apim.ps1" -ForegroundColor White
