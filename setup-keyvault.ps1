# Azure Key Vault Setup Script for SaaS Framework
# This script creates and configures all necessary secrets in Azure Key Vault

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "eastus",
    
    [Parameter()]
    [string]$SubscriptionId
)

Write-Host "🔐 Setting up Azure Key Vault for SaaS Framework - Environment: $EnvironmentName" -ForegroundColor Cyan

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Get current subscription info
$currentSub = az account show --query "{name:name, id:id}" -o json | ConvertFrom-Json
Write-Host "Using subscription: $($currentSub.name) ($($currentSub.id))" -ForegroundColor Green

# Variables
$resourceGroupName = "rg-$EnvironmentName"
$keyVaultName = "kv-saas-$EnvironmentName-$(Get-Random -Minimum 1000 -Maximum 9999)"
$cosmosAccountName = "cosmos-saas-$EnvironmentName"
$appInsightsName = "ai-saas-$EnvironmentName"

Write-Host "🏗️  Creating resources in resource group: $resourceGroupName" -ForegroundColor Yellow

# Create resource group if it doesn't exist
Write-Host "Creating resource group: $resourceGroupName" -ForegroundColor Yellow
az group create --name $resourceGroupName --location $Location

# Create Key Vault
Write-Host "Creating Key Vault: $keyVaultName" -ForegroundColor Yellow
az keyvault create `
    --name $keyVaultName `
    --resource-group $resourceGroupName `
    --location $Location `
    --enabled-for-template-deployment true `
    --enable-rbac-authorization false

# Get current user for Key Vault access policy
$currentUserId = az ad signed-in-user show --query id -o tsv
Write-Host "Setting Key Vault access policy for current user: $currentUserId" -ForegroundColor Yellow

az keyvault set-policy `
    --name $keyVaultName `
    --object-id $currentUserId `
    --secret-permissions get list set delete

# Create Cosmos DB account
Write-Host "Creating Cosmos DB account: $cosmosAccountName" -ForegroundColor Yellow
az cosmosdb create `
    --name $cosmosAccountName `
    --resource-group $resourceGroupName `
    --locations regionName=$Location failoverPriority=0 isZoneRedundant=False `
    --default-consistency-level Session `
    --enable-multiple-write-locations false

# Create Application Insights
Write-Host "Creating Application Insights: $appInsightsName" -ForegroundColor Yellow
az monitor app-insights component create `
    --app $appInsightsName `
    --location $Location `
    --resource-group $resourceGroupName `
    --application-type web

# Get Cosmos DB connection string
Write-Host "Retrieving Cosmos DB connection string..." -ForegroundColor Yellow
$cosmosConnectionString = az cosmosdb keys list `
    --name $cosmosAccountName `
    --resource-group $resourceGroupName `
    --type connection-strings `
    --query "connectionStrings[0].connectionString" -o tsv

# Get Application Insights connection string
Write-Host "Retrieving Application Insights connection string..." -ForegroundColor Yellow
$appInsightsConnectionString = az monitor app-insights component show `
    --app $appInsightsName `
    --resource-group $resourceGroupName `
    --query connectionString -o tsv

# Generate JWT secret
$jwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))

Write-Host "🔑 Adding secrets to Key Vault..." -ForegroundColor Yellow

# Add secrets to Key Vault
$secrets = @{
    "cosmos-connection-string" = $cosmosConnectionString
    "appinsights-connection-string" = $appInsightsConnectionString
    "jwt-secret" = $jwtSecret
    "ad-domain" = "yourtenant.onmicrosoft.com"
    "ad-tenant-id" = "your-tenant-id-here"
    "ad-client-id" = "your-client-id-here"
    "ad-client-secret" = "your-client-secret-here"
}

foreach ($secretName in $secrets.Keys) {
    Write-Host "  Setting secret: $secretName" -ForegroundColor Gray
    az keyvault secret set `
        --vault-name $keyVaultName `
        --name $secretName `
        --value $secrets[$secretName] | Out-Null
}

# Create managed identity for container apps
Write-Host "Creating managed identity for container apps..." -ForegroundColor Yellow
$managedIdentityName = "id-saas-$EnvironmentName"
$managedIdentity = az identity create `
    --name $managedIdentityName `
    --resource-group $resourceGroupName `
    --query "{clientId:clientId, principalId:principalId, id:id}" -o json | ConvertFrom-Json

# Grant the managed identity access to Key Vault
Write-Host "Granting managed identity access to Key Vault..." -ForegroundColor Yellow
az keyvault set-policy `
    --name $keyVaultName `
    --object-id $managedIdentity.principalId `
    --secret-permissions get list

# Update Bicep parameters file
Write-Host "Updating Bicep parameters file..." -ForegroundColor Yellow
$parametersFile = "infra/main.parameters.json"
$parameters = Get-Content $parametersFile -Raw | ConvertFrom-Json

$parameters.parameters.environmentName.value = $EnvironmentName
$parameters.parameters.location.value = $Location
$parameters.parameters.keyVaultName.value = $keyVaultName
$parameters.parameters.managedIdentityName.value = $managedIdentityName

$parameters | ConvertTo-Json -Depth 10 | Set-Content $parametersFile

Write-Host "✅ Key Vault setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  Resource Group: $resourceGroupName" -ForegroundColor White
Write-Host "  Key Vault: $keyVaultName" -ForegroundColor White
Write-Host "  Cosmos DB: $cosmosAccountName" -ForegroundColor White
Write-Host "  App Insights: $appInsightsName" -ForegroundColor White
Write-Host "  Managed Identity: $managedIdentityName" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update Azure AD B2C settings in Key Vault:" -ForegroundColor White
Write-Host "     az keyvault secret set --vault-name $keyVaultName --name ad-domain --value 'your-b2c-domain.onmicrosoft.com'" -ForegroundColor Gray
Write-Host "     az keyvault secret set --vault-name $keyVaultName --name ad-tenant-id --value 'your-tenant-id'" -ForegroundColor Gray
Write-Host "     az keyvault secret set --vault-name $keyVaultName --name ad-client-id --value 'your-client-id'" -ForegroundColor Gray
Write-Host "     az keyvault secret set --vault-name $keyVaultName --name ad-client-secret --value 'your-client-secret'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Deploy infrastructure:" -ForegroundColor White
Write-Host "     az deployment sub create --location $Location --template-file infra/main.bicep --parameters @infra/main.parameters.json" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Build and deploy container apps:" -ForegroundColor White
Write-Host "     ./deploy-containers-production.ps1 -EnvironmentName $EnvironmentName" -ForegroundColor Gray
