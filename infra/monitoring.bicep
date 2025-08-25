// Azure Monitor and Alerting Module
param location string
param environmentName string
param resourceToken string
param applicationInsightsName string
param logAnalyticsWorkspaceName string
param keyVaultName string
param cosmosAccountName string
param containerAppsEnvironmentName string

// Notification settings
param alertEmailAddress string = ''
param alertPhoneNumber string = ''

// Tags for all monitoring resources
var commonTags = {
  Environment: environmentName
  Project: 'SaaSFramework'
  CostCenter: 'IT-Development'
  Owner: 'SaaS-Team'
  CreatedBy: 'Infrastructure-Automation'
  LastModified: utcNow('yyyy-MM-dd')
}

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  tags: commonTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Action Group for Alerts
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-saas-${environmentName}-${resourceToken}'
  location: 'Global'
  tags: commonTags
  properties: {
    groupShortName: 'SaaS-${environmentName}'
    enabled: true
    emailReceivers: alertEmailAddress != '' ? [
      {
        name: 'AdminEmail'
        emailAddress: alertEmailAddress
        useCommonAlertSchema: true
      }
    ] : []
    smsReceivers: alertPhoneNumber != '' ? [
      {
        name: 'AdminSMS'
        countryCode: '1'
        phoneNumber: alertPhoneNumber
      }
    ] : []
    webhookReceivers: []
  }
}

// CPU Utilization Alert for Container Apps
resource cpuUtilizationAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'CPU Utilization High - Container Apps'
  location: 'Global'
  tags: commonTags
  properties: {
    description: 'Alert when CPU utilization exceeds 80% for container apps'
    severity: 2
    enabled: true
    scopes: [
      '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.App/managedEnvironments/${containerAppsEnvironmentName}'
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CPUUtilization'
          metricName: 'CpuPercentage'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
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

// Memory Utilization Alert for Container Apps
resource memoryUtilizationAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'Memory Utilization High - Container Apps'
  location: 'Global'
  tags: commonTags
  properties: {
    description: 'Alert when memory utilization exceeds 85% for container apps'
    severity: 2
    enabled: true
    scopes: [
      '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.App/managedEnvironments/${containerAppsEnvironmentName}'
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'MemoryUtilization'
          metricName: 'MemoryPercentage'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
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

// Application Error Rate Alert
resource applicationErrorAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'Application Error Rate High'
  location: location
  tags: commonTags
  properties: {
    displayName: 'Application Error Rate High'
    description: 'Alert when application error rate exceeds 5% in the last 15 minutes'
    severity: 1
    enabled: true
    evaluationFrequency: 'PT5M'
    scopes: [
      applicationInsights.id
    ]
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            requests
            | where timestamp > ago(15m)
            | summarize 
                TotalRequests = count(),
                FailedRequests = countif(success == false)
            | extend ErrorRate = (FailedRequests * 100.0) / TotalRequests
            | where ErrorRate > 5
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// Database Connection Alert
resource databaseConnectionAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'Database Connection Issues'
  location: location
  tags: commonTags
  properties: {
    displayName: 'Database Connection Issues'
    description: 'Alert when database connection failures occur'
    severity: 1
    enabled: true
    evaluationFrequency: 'PT5M'
    scopes: [
      applicationInsights.id
    ]
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            dependencies
            | where timestamp > ago(15m)
            | where type == "Azure DocumentDB"
            | where success == false
            | summarize FailedConnections = count()
            | where FailedConnections > 0
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// Response Time Alert
resource responseTimeAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'High Response Time'
  location: location
  tags: commonTags
  properties: {
    displayName: 'High Response Time'
    description: 'Alert when average response time exceeds 2 seconds'
    severity: 2
    enabled: true
    evaluationFrequency: 'PT5M'
    scopes: [
      applicationInsights.id
    ]
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            requests
            | where timestamp > ago(15m)
            | summarize AvgResponseTime = avg(duration)
            | where AvgResponseTime > 2000
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 2
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// Cosmos DB RU Consumption Alert
resource cosmosRUAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'Cosmos DB RU Consumption High'
  location: 'Global'
  tags: commonTags
  properties: {
    description: 'Alert when Cosmos DB RU consumption exceeds 80%'
    severity: 2
    enabled: true
    scopes: [
      '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.DocumentDB/databaseAccounts/${cosmosAccountName}'
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'NormalizedRUConsumption'
          metricName: 'NormalizedRUConsumption'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
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

// Key Vault Access Alert
resource keyVaultAccessAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'Key Vault Access Issues'
  location: location
  tags: commonTags
  properties: {
    displayName: 'Key Vault Access Issues'
    description: 'Alert when Key Vault access failures occur'
    severity: 1
    enabled: true
    evaluationFrequency: 'PT5M'
    scopes: [
      '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.KeyVault/vaults/${keyVaultName}'
    ]
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            KeyVaultLogs
            | where TimeGenerated > ago(15m)
            | where ResultSignature != "OK"
            | summarize FailedRequests = count()
            | where FailedRequests > 0
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// Custom Business Metrics Dashboard
resource businessMetricsDashboard 'Microsoft.Portal/dashboards@2020-09-01-preview' = {
  name: 'SaaS-Business-Metrics-${environmentName}'
  location: location
  tags: commonTags
  properties: {
    lenses: [
      {
        order: 0
        parts: [
          {
            position: {
              x: 0
              y: 0
              rowSpan: 4
              colSpan: 6
            }
            metadata: {
              inputs: [
                {
                  name: 'ComponentId'
                  value: applicationInsights.id
                }
                {
                  name: 'Query'
                  value: '''
                    requests
                    | where timestamp > ago(24h)
                    | summarize RequestCount = count() by bin(timestamp, 1h)
                    | render timechart
                  '''
                }
              ]
              type: 'Extension/AppInsightsExtension/PartType/AnalyticsLineChartPart'
            }
          }
          {
            position: {
              x: 6
              y: 0
              rowSpan: 4
              colSpan: 6
            }
            metadata: {
              inputs: [
                {
                  name: 'ComponentId'
                  value: applicationInsights.id
                }
                {
                  name: 'Query'
                  value: '''
                    requests
                    | where timestamp > ago(24h)
                    | summarize AvgDuration = avg(duration) by bin(timestamp, 1h)
                    | render timechart
                  '''
                }
              ]
              type: 'Extension/AppInsightsExtension/PartType/AnalyticsLineChartPart'
            }
          }
        ]
      }
    ]
  }
}

// Outputs
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output applicationInsightsId string = applicationInsights.id
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
output actionGroupId string = actionGroup.id
output dashboardId string = businessMetricsDashboard.id
