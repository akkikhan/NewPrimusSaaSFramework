// Static Web App module for SaaS Framework frontend
param location string
param environmentName string
param resourceToken string
param gatewayUrl string

// Static Web App for hosting the Angular frontend
resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: 'swa-sf-${resourceToken}'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: ''
    branch: ''
    buildProperties: {
      appLocation: '/saas-frontend'
      apiLocation: ''
      outputLocation: 'dist/saas-frontend'
      appBuildCommand: 'npm run build'
      skipGithubActionWorkflowGeneration: true
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'None'
  }
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'frontend'
  }
}

// Configure app settings for the Static Web App
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2024-04-01' = {
  name: 'appsettings'
  parent: staticWebApp
  properties: {
    API_BASE_URL: gatewayUrl
    ENVIRONMENT: 'production'
  }
}

// Output the Static Web App URL
output frontendUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppName string = staticWebApp.name
