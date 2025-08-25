// Container Apps module for SaaS Framework microservices
param location string
param environmentName string
param resourceToken string
param containerAppsEnvironmentId string
param containerRegistryName string
param userAssignedIdentityId string
param keyVaultName string
param managedIdentityName string

// Application configuration
param aspNetCoreEnvironment string

// Gateway Container App - Main entry point for all API requests
resource gatewayApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-gateway-${resourceToken}'
  location: location
  properties: {
    environmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      dapr: {
        enabled: true
        appId: 'gateway'
        appPort: 8080
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
      secrets: [
        {
          name: 'jwt-secret'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/jwt-secret'
          identity: userAssignedIdentityId
        }
        {
          name: 'cosmos-connection-string'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/cosmos-connection-string'
          identity: userAssignedIdentityId
        }
        {
          name: 'appinsights-connection-string'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/appinsights-connection-string'
          identity: userAssignedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'gateway'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
          ]
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: aspNetCoreEnvironment
            }
            {
              name: 'JWT__SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'ConnectionStrings__CosmosDB'
              secretRef: 'cosmos-connection-string'
            }
            {
              name: 'ApplicationInsights__ConnectionString'
              secretRef: 'appinsights-connection-string'
            }
            {
              name: 'AUTH_SERVICE_URL'
              value: 'https://${authenticationApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'RBAC_SERVICE_URL'
              value: 'https://${rbacApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'NOTIFICATIONS_SERVICE_URL'
              value: 'https://${notificationsApp.properties.configuration.ingress.fqdn}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'cpu-scaling-rule'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'gateway'
  }
}

// Authentication Container App - Handles user authentication and JWT tokens
resource authenticationApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-auth-${resourceToken}'
  location: location
  properties: {
    environmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: false
        targetPort: 5001
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      dapr: {
        enabled: true
        appId: 'authentication'
        appPort: 5001
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
      secrets: [
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'cosmos-connection'
          value: 'AccountEndpoint=https://${cosmosAccountName}.documents.azure.com:443/;'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'authentication'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 5001
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
          ]
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: aspNetCoreEnvironment
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'JWT_ISSUER'
              value: jwtIssuer
            }
            {
              name: 'JWT_AUDIENCE'
              value: jwtAudience
            }
            {
              name: 'COSMOS_CONNECTION_STRING'
              secretRef: 'cosmos-connection'
            }
            {
              name: 'COSMOS_DATABASE_NAME'
              value: cosmosDatabaseName
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'cpu-scaling-rule'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'authentication'
  }
}

// RBAC Container App - Handles role-based access control
resource rbacApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-rbac-${resourceToken}'
  location: location
  properties: {
    environmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: false
        targetPort: 5002
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      dapr: {
        enabled: true
        appId: 'rbac'
        appPort: 5002
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
      secrets: [
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'cosmos-connection'
          value: 'AccountEndpoint=https://${cosmosAccountName}.documents.azure.com:443/;'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'rbac'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 5002
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
          ]
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: aspNetCoreEnvironment
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'JWT_ISSUER'
              value: jwtIssuer
            }
            {
              name: 'JWT_AUDIENCE'
              value: jwtAudience
            }
            {
              name: 'COSMOS_CONNECTION_STRING'
              secretRef: 'cosmos-connection'
            }
            {
              name: 'COSMOS_DATABASE_NAME'
              value: cosmosDatabaseName
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'cpu-scaling-rule'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'rbac'
  }
}

// Notifications Container App - Handles notifications and messaging
resource notificationsApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-notifications-${resourceToken}'
  location: location
  properties: {
    environmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: false
        targetPort: 5003
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: false
        }
      }
      dapr: {
        enabled: true
        appId: 'notifications'
        appPort: 5003
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
      secrets: [
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'cosmos-connection'
          value: 'AccountEndpoint=https://${cosmosAccountName}.documents.azure.com:443/;'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'notifications'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 5003
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
          ]
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: aspNetCoreEnvironment
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'COSMOS_CONNECTION_STRING'
              secretRef: 'cosmos-connection'
            }
            {
              name: 'COSMOS_DATABASE_NAME'
              value: cosmosDatabaseName
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'cpu-scaling-rule'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'notifications'
  }
}

// Outputs for service URLs
output gatewayUrl string = 'https://${gatewayApp.properties.configuration.ingress.fqdn}'
output authenticationUrl string = 'https://${authenticationApp.properties.configuration.ingress.fqdn}'
output rbacUrl string = 'https://${rbacApp.properties.configuration.ingress.fqdn}'
output notificationsUrl string = 'https://${notificationsApp.properties.configuration.ingress.fqdn}'
