// Resources module - contains all Azure resources for the SaaS Framework
param location string
param environmentName string
param resourceToken string
param resourcePrefix string

// Application configuration parameters
@secure()
param jwtSecret string
param jwtIssuer string
param jwtAudience string
@secure()
param cosmosConnectionString string
param cosmosDatabaseName string
param aspNetCoreEnvironment string

// Shared resources
module shared 'shared.bicep' = {
  name: 'shared-resources'
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    resourcePrefix: resourcePrefix
  }
}

// Cosmos DB for data storage
module cosmos 'cosmos.bicep' = {
  name: 'cosmos-db'
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    resourcePrefix: resourcePrefix
    userAssignedIdentityId: shared.outputs.userAssignedIdentityId
  }
}

// Container Apps for microservices
module containerApps 'container-apps.bicep' = {
  name: 'container-apps'
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    resourcePrefix: resourcePrefix
    containerAppsEnvironmentId: shared.outputs.containerAppsEnvironmentId
    containerRegistryName: shared.outputs.containerRegistryName
    userAssignedIdentityId: shared.outputs.userAssignedIdentityId
    cosmosAccountName: cosmos.outputs.cosmosAccountName
    cosmosDatabaseName: cosmosDatabaseName
    jwtSecret: jwtSecret
    jwtIssuer: jwtIssuer
    jwtAudience: jwtAudience
    aspNetCoreEnvironment: aspNetCoreEnvironment
  }
}

// Static Web App for frontend
module staticWebApp 'static-web-app.bicep' = {
  name: 'static-web-app'
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    gatewayUrl: containerApps.outputs.gatewayUrl
  }
}

// Outputs for main template
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = shared.outputs.containerRegistryEndpoint
output AZURE_CONTAINER_REGISTRY_NAME string = shared.outputs.containerRegistryName
output GATEWAY_URL string = containerApps.outputs.gatewayUrl
output AUTHENTICATION_URL string = containerApps.outputs.authenticationUrl
output RBAC_URL string = containerApps.outputs.rbacUrl
output NOTIFICATIONS_URL string = containerApps.outputs.notificationsUrl
output FRONTEND_URL string = staticWebApp.outputs.frontendUrl
output COSMOS_ACCOUNT_NAME string = cosmos.outputs.cosmosAccountName
output KEY_VAULT_NAME string = shared.outputs.keyVaultName
