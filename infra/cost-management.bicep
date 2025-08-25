// Azure Cost Management and Governance Module
param location string
param environmentName string
param resourceToken string
param subscriptionId string = subscription().subscriptionId

// Budget parameters
param monthlyBudgetAmount int = 500
param budgetAlertEmail string

// Tags for all resources
var commonTags = {
  Environment: environmentName
  Project: 'SaaSFramework'
  CostCenter: 'IT-Development'
  Owner: 'SaaS-Team'
  AutoShutdown: environmentName == 'dev' ? 'enabled' : 'disabled'
  BackupRequired: environmentName == 'prod' ? 'true' : 'false'
  CreatedBy: 'Infrastructure-Automation'
  LastModified: utcNow('yyyy-MM-dd')
}

// Budget for Resource Group
resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'budget-saas-${environmentName}-${resourceToken}'
  properties: {
    timePeriod: {
      startDate: utcNow('yyyy-MM-01')
      endDate: '2026-12-31'
    }
    timeGrain: 'Monthly'
    amount: monthlyBudgetAmount
    category: 'Cost'
    notifications: {
      Actual_GreaterThan_80_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        contactEmails: [
          budgetAlertEmail
        ]
        thresholdType: 'Actual'
      }
      Forecasted_GreaterThan_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: [
          budgetAlertEmail
        ]
        thresholdType: 'Forecasted'
      }
    }
  }
}

// Policy Definition for Required Tags
resource requiredTagsPolicy 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'saas-required-tags-${resourceToken}'
  properties: {
    displayName: 'SaaS Framework Required Tags'
    description: 'Ensures all resources have required tags for governance'
    policyType: 'Custom'
    mode: 'All'
    parameters: {
      tagNames: {
        type: 'Array'
        defaultValue: [
          'Environment'
          'Project'
          'CostCenter'
          'Owner'
        ]
      }
    }
    policyRule: {
      if: {
        anyOf: [
          {
            field: 'tags[Environment]'
            exists: false
          }
          {
            field: 'tags[Project]'
            exists: false
          }
          {
            field: 'tags[CostCenter]'
            exists: false
          }
          {
            field: 'tags[Owner]'
            exists: false
          }
        ]
      }
      then: {
        effect: 'deny'
      }
    }
  }
}

// Auto-shutdown Schedule for Development Environment
resource autoShutdownSchedule 'Microsoft.DevTestLab/schedules@2018-09-15' = if (environmentName == 'dev') {
  name: 'shutdown-computevm-${resourceToken}'
  location: location
  tags: commonTags
  properties: {
    status: 'Enabled'
    taskType: 'ComputeVmShutdownTask'
    dailyRecurrence: {
      time: '1900' // 7 PM
    }
    timeZoneId: 'UTC'
    notificationSettings: {
      status: 'Enabled'
      timeInMinutes: 30
      emailRecipient: budgetAlertEmail
    }
  }
}

// Cost Optimization Policies
resource vmSizeRestrictionPolicy 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'saas-vm-size-restriction-${resourceToken}'
  properties: {
    displayName: 'SaaS Framework VM Size Restriction'
    description: 'Restricts VM sizes to cost-optimized SKUs'
    policyType: 'Custom'
    mode: 'All'
    parameters: {
      allowedVMSizes: {
        type: 'Array'
        defaultValue: [
          'Standard_B1s'
          'Standard_B1ms'
          'Standard_B2s'
          'Standard_B2ms'
          'Standard_D2s_v3'
          'Standard_D4s_v3'
        ]
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Compute/virtualMachines'
          }
          {
            not: {
              field: 'Microsoft.Compute/virtualMachines/vmSize'
              in: '[parameters(\'allowedVMSizes\')]'
            }
          }
        ]
      }
      then: {
        effect: 'deny'
      }
    }
  }
}

// Resource Group Lock for Production
resource resourceGroupLock 'Microsoft.Authorization/locks@2020-05-01' = if (environmentName == 'prod') {
  name: 'rg-lock-${resourceToken}'
  properties: {
    level: 'CanNotDelete'
    notes: 'Prevents accidental deletion of production resources'
  }
}

// Cost Alert Action Group
resource costActionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-cost-${environmentName}-${resourceToken}'
  location: 'Global'
  tags: commonTags
  properties: {
    groupShortName: 'Cost-${environmentName}'
    enabled: true
    emailReceivers: [
      {
        name: 'CostAlert'
        emailAddress: budgetAlertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// Outputs
output budgetId string = budget.id
output requiredTagsPolicyId string = requiredTagsPolicy.id
output vmSizeRestrictionPolicyId string = vmSizeRestrictionPolicy.id
output costActionGroupId string = costActionGroup.id
output autoShutdownScheduleId string = environmentName == 'dev' ? autoShutdownSchedule.id : ''
output resourceGroupLockId string = environmentName == 'prod' ? resourceGroupLock.id : ''
