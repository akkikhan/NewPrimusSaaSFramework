// Azure Backup and Disaster Recovery Module
param location string
param environmentName string
param resourceToken string
param cosmosAccountName string
param keyVaultName string
param storageAccountName string

// Tags for all backup resources
var commonTags = {
  Environment: environmentName
  Project: 'SaaSFramework'
  CostCenter: 'IT-Operations'
  Owner: 'SaaS-Team'
  BackupType: 'Automated'
  CreatedBy: 'Infrastructure-Automation'
  LastModified: utcNow('yyyy-MM-dd')
}

// Recovery Services Vault for Backups
resource recoveryServicesVault 'Microsoft.RecoveryServices/vaults@2023-08-01' = {
  name: 'rsv-saas-${environmentName}-${resourceToken}'
  location: location
  tags: commonTags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    securitySettings: {
      immutabilitySettings: {
        state: 'Unlocked'
      }
    }
  }
}

// Backup Storage Configuration
resource backupStorageConfig 'Microsoft.RecoveryServices/vaults/backupstorageconfig@2023-08-01' = {
  parent: recoveryServicesVault
  name: 'vaultstorageconfig'
  properties: {
    storageModelType: 'LocallyRedundant'
    crossRegionRestoreFlag: false
  }
}

// Backup Policy for Key Vault (using Azure Backup)
resource keyVaultBackupPolicy 'Microsoft.RecoveryServices/vaults/backupPolicies@2023-08-01' = {
  parent: recoveryServicesVault
  name: 'KeyVaultBackupPolicy'
  properties: {
    backupManagementType: 'AzureStorage'
    schedulePolicy: {
      scheduleRunFrequency: 'Daily'
      scheduleRunTimes: [
        '2023-01-01T02:00:00Z'
      ]
      schedulePolicyType: 'SimpleSchedulePolicy'
    }
    retentionPolicy: {
      retentionPolicyType: 'LongTermRetentionPolicy'
      dailySchedule: {
        retentionTimes: [
          '2023-01-01T02:00:00Z'
        ]
        retentionDuration: {
          count: 30
          durationType: 'Days'
        }
      }
      weeklySchedule: {
        daysOfTheWeek: [
          'Sunday'
        ]
        retentionTimes: [
          '2023-01-01T02:00:00Z'
        ]
        retentionDuration: {
          count: 12
          durationType: 'Weeks'
        }
      }
      monthlySchedule: {
        retentionScheduleFormatType: 'Weekly'
        retentionScheduleWeekly: {
          daysOfTheWeek: [
            'Sunday'
          ]
          weeksOfTheMonth: [
            'First'
          ]
        }
        retentionTimes: [
          '2023-01-01T02:00:00Z'
        ]
        retentionDuration: {
          count: 12
          durationType: 'Months'
        }
      }
    }
  }
}

// Storage Account for Configuration Backups
resource configBackupStorage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'stconfig${toLower(resourceToken)}'
  location: location
  tags: commonTags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Cool'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    encryption: {
      services: {
        blob: {
          enabled: true
        }
        file: {
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// Blob Container for Configuration Backups
resource configBackupContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${configBackupStorage.name}/default/config-backups'
  properties: {
    publicAccess: 'None'
  }
}

// Automation Account for Backup Scripts
resource automationAccount 'Microsoft.Automation/automationAccounts@2023-11-01' = {
  name: 'aa-backup-${environmentName}-${resourceToken}'
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'Basic'
    }
    encryption: {
      keySource: 'Microsoft.Automation'
    }
  }
}

// PowerShell Runbook for Key Vault Backup
resource keyVaultBackupRunbook 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' = {
  parent: automationAccount
  name: 'Backup-KeyVault'
  properties: {
    runbookType: 'PowerShell'
    logVerbose: true
    logProgress: true
    description: 'Automated backup of Key Vault secrets and keys'
    publishContentLink: {
      uri: 'https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.automation/101-automation-runbook-getvms/Runbooks/Get-AzureVMTutorial.ps1'
      version: '1.0.0.0'
    }
  }
}

// Schedule for Key Vault Backup
resource keyVaultBackupSchedule 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'KeyVault-Backup-Schedule'
  properties: {
    description: 'Daily backup schedule for Key Vault'
    startTime: '2024-01-01T02:00:00+00:00'
    frequency: 'Day'
    interval: 1
  }
}

// Job Schedule Link
resource keyVaultBackupJobSchedule 'Microsoft.Automation/automationAccounts/jobSchedules@2023-11-01' = {
  parent: automationAccount
  name: guid(keyVaultBackupRunbook.name, keyVaultBackupSchedule.name)
  properties: {
    runbook: {
      name: keyVaultBackupRunbook.name
    }
    schedule: {
      name: keyVaultBackupSchedule.name
    }
    parameters: {
      KeyVaultName: keyVaultName
      StorageAccountName: configBackupStorage.name
      ContainerName: 'config-backups'
    }
  }
}

// Cosmos DB Backup Configuration (Continuous Backup)
resource cosmosBackupPolicy 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' existing = {
  name: cosmosAccountName
}

// Backup Alert for Failed Backups
resource backupFailureAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'Backup Failure Alert'
  location: location
  tags: commonTags
  properties: {
    displayName: 'Backup Failure Alert'
    description: 'Alert when backup jobs fail'
    severity: 1
    enabled: true
    evaluationFrequency: 'PT1H'
    scopes: [
      recoveryServicesVault.id
    ]
    windowSize: 'PT1H'
    criteria: {
      allOf: [
        {
          query: '''
            AddonAzureBackupJobs
            | where TimeGenerated > ago(1h)
            | where JobStatus == "Failed"
            | summarize FailedJobs = count()
            | where FailedJobs > 0
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
  }
}

// Data Protection and Retention Policies
resource dataRetentionPolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  parent: configBackupStorage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'ConfigBackupRetention'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                'config-backups/'
              ]
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 30
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: 90
                }
                delete: {
                  daysAfterModificationGreaterThan: 365
                }
              }
            }
          }
        }
      ]
    }
  }
}

// Disaster Recovery Documentation Storage
resource drDocumentationContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${configBackupStorage.name}/default/disaster-recovery-docs'
  properties: {
    publicAccess: 'None'
  }
}

// Outputs
output recoveryServicesVaultId string = recoveryServicesVault.id
output configBackupStorageAccountId string = configBackupStorage.id
output automationAccountId string = automationAccount.id
output keyVaultBackupPolicyId string = keyVaultBackupPolicy.id
output backupFailureAlertId string = backupFailureAlert.id
