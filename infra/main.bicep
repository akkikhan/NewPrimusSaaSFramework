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

// Application settings parameters - these will be provided by the user
@secure()
@description('JWT Secret for authentication')
param jwtSecret string = ''

@description('JWT Issuer')
param jwtIssuer string = 'https://saas-framework.com'

@description('JWT Audience') 
param jwtAudience string = 'saas-framework-api'

@secure()
@description('Cosmos DB connection string - will be generated automatically if empty')
param cosmosConnectionString string = ''

@description('Cosmos DB database name')
param cosmosDatabaseName string = 'SaaSFramework'

@description('Environment for the applications')
param aspNetCoreEnvironment string = 'Production'

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
    jwtSecret: jwtSecret
    jwtIssuer: jwtIssuer
    jwtAudience: jwtAudience
    cosmosConnectionString: cosmosConnectionString
    cosmosDatabaseName: cosmosDatabaseName
    aspNetCoreEnvironment: aspNetCoreEnvironment
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
