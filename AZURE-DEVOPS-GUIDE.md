# Azure DevOps Configuration Guide

This guide provides step-by-step instructions for configuring Azure services and setting up CI/CD pipelines for the Primus SaaS Framework.

## 1. Azure Key Vault Integration

### 1.1 Create Key Vault Configuration

First, let's add Key Vault to our Bicep infrastructure:

```bicep
// Add to shared.bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${resourcePrefix}-${resourceToken}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enableRbacAuthorization: true
  }
  tags: {
    'azd-env-name': environmentName
  }
}

// Grant Key Vault access to managed identity
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, userAssignedIdentity.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: userAssignedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
```

### 1.2 Update Application Configuration

Add Key Vault configuration to each service's Program.cs:

```csharp
// Add to Program.cs in each service
if (!builder.Environment.IsDevelopment())
{
    var keyVaultName = builder.Configuration["KEY_VAULT_NAME"];
    if (!string.IsNullOrEmpty(keyVaultName))
    {
        var keyVaultUri = $"https://{keyVaultName}.vault.azure.net/";
        builder.Configuration.AddAzureKeyVault(
            new Uri(keyVaultUri),
            new DefaultAzureCredential());
    }
}
```

## 2. Application Insights Configuration

### 2.1 Add Application Insights Resource

```bicep
// Add to shared.bicep
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-${resourcePrefix}-${resourceToken}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
  tags: {
    'azd-env-name': environmentName
  }
}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-${resourcePrefix}-${resourceToken}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    'azd-env-name': environmentName
  }
}
```

### 2.2 Configure Application Insights in Services

Add to each service's Program.cs:

```csharp
// Add Application Insights
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
});

// Add custom telemetry
builder.Services.AddSingleton<ITelemetryInitializer, CloudRoleNameTelemetryInitializer>();
```

## 3. Health Check Configuration

### 3.1 Update Program.cs for Health Checks

```csharp
// Add comprehensive health checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    .AddCosmosDb(
        cosmosConnectionString,
        name: "cosmosdb",
        failureStatus: HealthStatus.Degraded)
    .AddAzureKeyVault(
        new Uri($"https://{builder.Configuration["KEY_VAULT_NAME"]}.vault.azure.net/"),
        new DefaultAzureCredential(),
        options =>
        {
            options.Name = "keyvault";
        });

// Configure health check endpoint
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

## 4. Azure DevOps Pipeline Configuration

### 4.1 Create azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
      - main
      - develop

variables:
  - group: 'SaaS-Framework-Variables'
  - name: buildConfiguration
    value: 'Release'

stages:
  - stage: Build
    displayName: 'Build and Test'
    jobs:
      - job: BuildBackend
        displayName: 'Build Backend Services'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: UseDotNet@2
            displayName: 'Use .NET 8 SDK'
            inputs:
              packageType: 'sdk'
              version: '8.x'

          - task: DotNetCoreCLI@2
            displayName: 'Restore packages'
            inputs:
              command: 'restore'
              projects: 'saas-backend/**/*.csproj'

          - task: DotNetCoreCLI@2
            displayName: 'Build projects'
            inputs:
              command: 'build'
              projects: 'saas-backend/**/*.csproj'
              arguments: '--configuration $(buildConfiguration) --no-restore'

          - task: DotNetCoreCLI@2
            displayName: 'Run tests'
            inputs:
              command: 'test'
              projects: 'saas-backend/**/*Tests*.csproj'
              arguments: '--configuration $(buildConfiguration) --no-build --collect:"XPlat Code Coverage"'

      - job: BuildFrontend
        displayName: 'Build Frontend'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            displayName: 'Use Node.js 18'
            inputs:
              versionSpec: '18.x'

          - script: |
              cd saas-frontend
              npm ci
              npm run build --prod
            displayName: 'Build Angular app'

  - stage: SecurityScan
    displayName: 'Security Scanning'
    dependsOn: Build
    jobs:
      - job: SecurityScan
        displayName: 'Run Security Scans'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: CredScan@3
            displayName: 'Run Credential Scanner'

          - task: SonarCloudPrepare@1
            displayName: 'Prepare SonarCloud analysis'
            inputs:
              SonarCloud: 'SonarCloud'
              organization: 'your-org'
              scannerMode: 'MSBuild'
              projectKey: 'saas-framework'

  - stage: DeployDev
    displayName: 'Deploy to Development'
    dependsOn: SecurityScan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
    jobs:
      - deployment: DeployToDev
        displayName: 'Deploy to Development Environment'
        environment: 'development'
        pool:
          vmImage: 'ubuntu-latest'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  displayName: 'Deploy Infrastructure'
                  inputs:
                    azureSubscription: 'Azure-ServiceConnection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az deployment sub create \
                        --location eastus \
                        --template-file infra/main.bicep \
                        --parameters environmentName=dev \
                        --parameters location=eastus

  - stage: DeployProd
    displayName: 'Deploy to Production'
    dependsOn: SecurityScan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProd
        displayName: 'Deploy to Production Environment'
        environment: 'production'
        pool:
          vmImage: 'ubuntu-latest'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  displayName: 'Deploy Infrastructure'
                  inputs:
                    azureSubscription: 'Azure-ServiceConnection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az deployment sub create \
                        --location eastus \
                        --template-file infra/main.bicep \
                        --parameters environmentName=prod \
                        --parameters location=eastus
```

## 5. Environment-Specific Configuration

### 5.1 Development Environment Setup

Create `.env.development` file:

```bash
# Development Environment Variables
ASPNETCORE_ENVIRONMENT=Development
KEY_VAULT_NAME=kv-sf-dev-{token}
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey={dev-key}
COSMOS_DATABASE_NAME=SaaSFramework-Dev
```

### 5.2 Production Environment Setup

Configure production environment variables in Azure DevOps:

- `KEY_VAULT_NAME`: Production Key Vault name
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Production Application Insights connection string
- `COSMOS_DATABASE_NAME`: Production Cosmos DB database name

## 6. Monitoring and Alerting

### 6.1 Application Insights Alerts

```bicep
// Add to shared.bicep
resource failureAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'High Failure Rate Alert'
  location: 'global'
  properties: {
    description: 'Alert when failure rate exceeds 5%'
    severity: 2
    enabled: true
    scopes: [
      applicationInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'FailureRate'
          metricName: 'requests/failed'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Average'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}
```

## 7. Deployment Verification Steps

1. **Infrastructure Deployment**
   ```bash
   az deployment sub create \
     --location eastus \
     --template-file infra/main.bicep \
     --parameters @infra/main.parameters.json
   ```

2. **Health Check Verification**
   ```bash
   curl https://your-gateway-url/health
   curl https://your-auth-url/health
   curl https://your-rbac-url/health
   curl https://your-notifications-url/health
   ```

3. **Application Insights Verification**
   - Check telemetry data in Azure portal
   - Verify custom metrics are being collected
   - Test alert notifications

4. **Key Vault Integration Test**
   - Verify secrets are being read from Key Vault
   - Test managed identity authentication
   - Check access logs in Key Vault

## Next Steps

1. Set up Azure DevOps project and service connections
2. Configure variable groups with environment-specific values
3. Create development and production environments
4. Deploy infrastructure using Bicep templates
5. Set up monitoring dashboards in Application Insights
6. Configure alerting rules and notification channels
7. Test end-to-end deployment pipeline

## Security Considerations

- Use managed identities for all Azure service authentication
- Store all secrets in Azure Key Vault
- Enable soft delete and purge protection on Key Vault
- Configure network restrictions on all Azure resources
- Enable diagnostic logging for all services
- Set up security scanning in CI/CD pipeline
