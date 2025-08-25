targetScope = 'subscription'

// Main parameters from Azure DevCLI
@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Name of the resource group')
param resourceGroupName string = 'rg-${environmentName}'

@description('Name of the Key Vault containing secrets')
param keyVaultName string

@description('Name of the managed identity for container apps')
param managedIdentityName string

@description('Environment for the applications')
param aspNetCoreEnvironment string = 'Production'

@description('Alert email address for monitoring notifications')
param alertEmailAddress string = ''

@description('Monthly budget amount for cost management')
param monthlyBudgetAmount int = 500

// Resource naming configuration
var resourceToken = uniqueString(subscription().id, location, environmentName)
var resourcePrefix = 'sf' // SaaS Framework

// Create resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
    project: 'saas-framework'
    Environment: environmentName
    CostCenter: 'IT-Development'
    Owner: 'SaaS-Team'
    CreatedBy: 'Infrastructure-Automation'
  }
}

// Deploy all resources within the resource group
module resources 'resources.bicep' = {
  name: 'resources'
  scope: resourceGroup
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    resourcePrefix: resourcePrefix
    keyVaultName: keyVaultName
    managedIdentityName: managedIdentityName
    aspNetCoreEnvironment: aspNetCoreEnvironment
  }
}

// Deploy Network Security
module networkSecurity 'network-security.bicep' = {
  name: 'network-security'
  scope: resourceGroup
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    containerAppsEnvironmentId: resources.outputs.CONTAINER_APPS_ENVIRONMENT_ID
    keyVaultName: keyVaultName
  }
}

// Deploy Monitoring and Alerting
module monitoring 'monitoring.bicep' = {
  name: 'monitoring'
  scope: resourceGroup
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    applicationInsightsName: 'ai-${resourcePrefix}-${resourceToken}'
    logAnalyticsWorkspaceName: 'law-${resourcePrefix}-${resourceToken}'
    keyVaultName: keyVaultName
    cosmosAccountName: resources.outputs.COSMOS_ACCOUNT_NAME
    containerAppsEnvironmentName: resources.outputs.CONTAINER_APPS_ENVIRONMENT_NAME
    alertEmailAddress: alertEmailAddress
  }
}

// Deploy Cost Management
module costManagement 'cost-management.bicep' = {
  name: 'cost-management'
  scope: resourceGroup
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    subscriptionId: subscription().subscriptionId
    monthlyBudgetAmount: monthlyBudgetAmount
    budgetAlertEmail: alertEmailAddress
  }
}

// Deploy Backup and Recovery
module backupRecovery 'backup-recovery.bicep' = {
  name: 'backup-recovery'
  scope: resourceGroup
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    cosmosAccountName: resources.outputs.COSMOS_ACCOUNT_NAME
    keyVaultName: keyVaultName
    storageAccountName: resources.outputs.STORAGE_ACCOUNT_NAME
  }
}

// Output required values for AZD
output RESOURCE_GROUP_ID string = resourceGroup.id
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.AZURE_CONTAINER_REGISTRY_ENDPOINT
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.AZURE_CONTAINER_REGISTRY_NAME
output GATEWAY_URL string = resources.outputs.GATEWAY_URL
output AUTHENTICATION_URL string = resources.outputs.AUTHENTICATION_URL
output RBAC_URL string = resources.outputs.RBAC_URL
output NOTIFICATIONS_URL string = resources.outputs.NOTIFICATIONS_URL
output FRONTEND_URL string = resources.outputs.FRONTEND_URL
output COSMOS_ACCOUNT_NAME string = resources.outputs.COSMOS_ACCOUNT_NAME
output KEY_VAULT_NAME string = resources.outputs.KEY_VAULT_NAME

// Monitoring and Management Outputs
output APPLICATION_INSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
output LOG_ANALYTICS_WORKSPACE_ID string = monitoring.outputs.logAnalyticsWorkspaceId
output APPLICATION_GATEWAY_PUBLIC_IP string = networkSecurity.outputs.applicationGatewayPublicIP
output VNET_ID string = networkSecurity.outputs.vnetId
output RECOVERY_SERVICES_VAULT_ID string = backupRecovery.outputs.recoveryServicesVaultId
output BUDGET_ID string = costManagement.outputs.budgetId
