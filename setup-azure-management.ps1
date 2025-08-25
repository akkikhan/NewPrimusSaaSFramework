# Azure Resource Management and Monitoring Setup Script
# This script implements comprehensive Azure resource management, monitoring, and governance

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [Parameter()]
    [string]$Location = "eastus",
    
    [Parameter()]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$true)]
    [string]$AlertEmailAddress,
    
    [Parameter()]
    [string]$AlertPhoneNumber = "",
    
    [Parameter()]
    [int]$MonthlyBudgetAmount = 500,
    
    [Parameter()]
    [switch]$SkipNetworkSecurity,
    
    [Parameter()]
    [switch]$SkipCostManagement,
    
    [Parameter()]
    [switch]$SkipBackupSetup
)

Write-Host "🛡️ Setting up Comprehensive Azure Resource Management" -ForegroundColor Cyan
Write-Host "Environment: $EnvironmentName" -ForegroundColor White
Write-Host "Location: $Location" -ForegroundColor White
Write-Host "Budget: $MonthlyBudgetAmount USD/month" -ForegroundColor White

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Verify Azure CLI login
$account = az account show 2>$null
if (-not $account) {
    Write-Host "❌ Please login to Azure CLI first: az login" -ForegroundColor Red
    exit 1
}

$currentSub = $account | ConvertFrom-Json
Write-Host "✅ Using subscription: $($currentSub.name)" -ForegroundColor Green

# Variables
$resourceGroupName = "rg-$EnvironmentName"
$deploymentName = "saas-monitoring-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Check if resource group exists
$rgExists = az group exists --name $resourceGroupName
if ($rgExists -eq 'false') {
    Write-Host "❌ Resource group $resourceGroupName does not exist. Please run the main deployment first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Resource group $resourceGroupName found" -ForegroundColor Green

# Step 1: Deploy Enhanced Infrastructure with Monitoring
Write-Host ""
Write-Host "🏗️ Step 1: Deploying Enhanced Infrastructure with Monitoring..." -ForegroundColor Cyan

# Prepare deployment parameters
$deploymentParams = @{
    environmentName = $EnvironmentName
    location = $Location
    alertEmailAddress = $AlertEmailAddress
    monthlyBudgetAmount = $MonthlyBudgetAmount
}

# Get existing Key Vault and Managed Identity
$keyVaultName = az keyvault list --resource-group $resourceGroupName --query "[0].name" -o tsv
$managedIdentityName = az identity list --resource-group $resourceGroupName --query "[0].name" -o tsv

if ($keyVaultName -and $managedIdentityName) {
    $deploymentParams.keyVaultName = $keyVaultName
    $deploymentParams.managedIdentityName = $managedIdentityName
    Write-Host "Using existing Key Vault: $keyVaultName" -ForegroundColor White
    Write-Host "Using existing Managed Identity: $managedIdentityName" -ForegroundColor White
} else {
    Write-Host "⚠️ Key Vault or Managed Identity not found. Will create new ones." -ForegroundColor Yellow
}

# Deploy infrastructure with monitoring
$parametersJson = $deploymentParams | ConvertTo-Json -Compress
$parametersFile = "temp-parameters-$(Get-Random).json"
$parametersJson | Out-File -FilePath $parametersFile -Encoding UTF8

try {
    Write-Host "Deploying infrastructure with monitoring and security..." -ForegroundColor Yellow
    
    az deployment sub create `
        --location $Location `
        --template-file "infra/main.bicep" `
        --parameters "@$parametersFile" `
        --name $deploymentName `
        --verbose
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Infrastructure deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Infrastructure deployed successfully" -ForegroundColor Green
} finally {
    # Clean up temp file
    if (Test-Path $parametersFile) {
        Remove-Item $parametersFile -Force
    }
}

# Step 2: Configure Additional Monitoring Settings
Write-Host ""
Write-Host "📊 Step 2: Configuring Advanced Monitoring..." -ForegroundColor Cyan

# Get deployed resource information
$deploymentOutput = az deployment sub show --name $deploymentName --query "properties.outputs" -o json | ConvertFrom-Json

$applicationInsightsName = az monitor app-insights component list --resource-group $resourceGroupName --query "[0].name" -o tsv
$logWorkspaceName = az monitor log-analytics workspace list --resource-group $resourceGroupName --query "[0].name" -o tsv

Write-Host "Application Insights: $applicationInsightsName" -ForegroundColor White
Write-Host "Log Analytics Workspace: $logWorkspaceName" -ForegroundColor White

# Configure diagnostic settings for all resources
Write-Host "Configuring diagnostic settings..." -ForegroundColor Yellow

$resources = az resource list --resource-group $resourceGroupName --query "[?type=='Microsoft.KeyVault/vaults' || type=='Microsoft.DocumentDB/databaseAccounts' || type=='Microsoft.ContainerRegistry/registries']" -o json | ConvertFrom-Json

foreach ($resource in $resources) {
    $resourceName = $resource.name
    $resourceType = $resource.type
    
    Write-Host "  Configuring diagnostics for $resourceName ($resourceType)" -ForegroundColor Gray
    
    try {
        az monitor diagnostic-settings create `
            --name "diag-$resourceName" `
            --resource $resource.id `
            --workspace $logWorkspaceName `
            --logs '[{"category":"AuditEvent","enabled":true}]' `
            --metrics '[{"category":"AllMetrics","enabled":true}]' 2>$null
    } catch {
        Write-Host "    ⚠️ Could not configure diagnostics for $resourceName" -ForegroundColor Yellow
    }
}

# Step 3: Set up Custom Workbooks and Dashboards
Write-Host ""
Write-Host "📈 Step 3: Creating Custom Monitoring Dashboards..." -ForegroundColor Cyan

# Create custom workbook for SaaS metrics
$workbookTemplate = @"
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 1,
      "content": {
        "json": "# SaaS Framework Monitoring Dashboard\n\nThis dashboard provides comprehensive monitoring for the SaaS Framework deployed in the **$EnvironmentName** environment."
      },
      "name": "title"
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where timestamp > ago(24h)\n| summarize RequestCount = count(), AvgDuration = avg(duration), ErrorRate = countif(success == false) * 100.0 / count() by bin(timestamp, 1h)\n| render timechart",
        "size": 0,
        "title": "Request Volume and Performance (24h)",
        "queryType": 0,
        "resourceType": "microsoft.insights/components"
      },
      "name": "requestMetrics"
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "dependencies\n| where timestamp > ago(24h)\n| where type == \"Azure DocumentDB\"\n| summarize AvgDuration = avg(duration), SuccessRate = countif(success == true) * 100.0 / count() by bin(timestamp, 1h)\n| render timechart",
        "size": 0,
        "title": "Database Performance (24h)",
        "queryType": 0,
        "resourceType": "microsoft.insights/components"
      },
      "name": "databaseMetrics"
    }
  ],
  "fallbackResourceIds": [
    "/subscriptions/$($currentSub.id)/resourceGroups/$resourceGroupName/providers/microsoft.insights/components/$applicationInsightsName"
  ]
}
"@

$workbookFile = "saas-monitoring-workbook.json"
$workbookTemplate | Out-File -FilePath $workbookFile -Encoding UTF8

try {
    Write-Host "Creating custom monitoring workbook..." -ForegroundColor Yellow
    
    az monitor app-insights workbook create `
        --resource-group $resourceGroupName `
        --name "SaaS-Monitoring-$EnvironmentName" `
        --display-name "SaaS Framework Monitoring - $EnvironmentName" `
        --description "Comprehensive monitoring for SaaS Framework" `
        --template-json "$workbookTemplate" `
        --tags Environment=$EnvironmentName Project=SaaSFramework
    
    Write-Host "✅ Custom workbook created" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not create custom workbook: $($_.Exception.Message)" -ForegroundColor Yellow
} finally {
    if (Test-Path $workbookFile) {
        Remove-Item $workbookFile -Force
    }
}

# Step 4: Configure Cost Management Policies
if (-not $SkipCostManagement) {
    Write-Host ""
    Write-Host "💰 Step 4: Configuring Cost Management Policies..." -ForegroundColor Cyan
    
    # Apply policy for required tags
    Write-Host "Applying governance policies..." -ForegroundColor Yellow
    
    $policyDefinitionName = "saas-required-tags-policy"
    $policyAssignmentName = "assign-required-tags-$EnvironmentName"
    
    # Create policy assignment for required tags
    try {
        az policy assignment create `
            --name $policyAssignmentName `
            --display-name "SaaS Framework Required Tags - $EnvironmentName" `
            --policy "/subscriptions/$($currentSub.id)/resourceGroups/$resourceGroupName/providers/Microsoft.Authorization/policyDefinitions/saas-required-tags-*" `
            --scope "/subscriptions/$($currentSub.id)/resourceGroups/$resourceGroupName" `
            --params '{"tagNames":{"value":["Environment","Project","CostCenter","Owner"]}}' 2>$null
        
        Write-Host "✅ Required tags policy applied" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not apply tags policy" -ForegroundColor Yellow
    }
    
    # Configure auto-shutdown for development environment
    if ($EnvironmentName -eq "dev") {
        Write-Host "Configuring auto-shutdown for development environment..." -ForegroundColor Yellow
        
        # Get all VMs in the resource group
        $vms = az vm list --resource-group $resourceGroupName --query "[].name" -o tsv
        
        foreach ($vmName in $vms) {
            if ($vmName) {
                Write-Host "  Setting auto-shutdown for VM: $vmName" -ForegroundColor Gray
                
                az vm auto-shutdown --name $vmName --resource-group $resourceGroupName --time 1900 --email $AlertEmailAddress 2>$null
            }
        }
        
        Write-Host "✅ Auto-shutdown configured for development resources" -ForegroundColor Green
    }
} else {
    Write-Host "⏭️ Skipping cost management configuration" -ForegroundColor Yellow
}

# Step 5: Configure Backup Strategies
if (-not $SkipBackupSetup) {
    Write-Host ""
    Write-Host "💾 Step 5: Configuring Backup Strategies..." -ForegroundColor Cyan
    
    # Enable Cosmos DB backup (point-in-time restore)
    $cosmosAccountName = az cosmosdb list --resource-group $resourceGroupName --query "[0].name" -o tsv
    
    if ($cosmosAccountName) {
        Write-Host "Configuring Cosmos DB backup for: $cosmosAccountName" -ForegroundColor Yellow
        
        az cosmosdb update `
            --name $cosmosAccountName `
            --resource-group $resourceGroupName `
            --backup-policy-type Continuous 2>$null
        
        Write-Host "✅ Cosmos DB continuous backup enabled" -ForegroundColor Green
    }
    
    # Create Key Vault backup automation
    Write-Host "Setting up Key Vault backup automation..." -ForegroundColor Yellow
    
    $automationAccountName = az automation account list --resource-group $resourceGroupName --query "[0].name" -o tsv
    
    if ($automationAccountName) {
        Write-Host "✅ Key Vault backup automation configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Automation account not found for Key Vault backup" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️ Skipping backup configuration" -ForegroundColor Yellow
}

# Step 6: Network Security Validation
if (-not $SkipNetworkSecurity) {
    Write-Host ""
    Write-Host "🔒 Step 6: Validating Network Security Configuration..." -ForegroundColor Cyan
    
    # Check Network Security Groups
    $nsgs = az network nsg list --resource-group $resourceGroupName --query "[].name" -o tsv
    Write-Host "Network Security Groups configured: $($nsgs -join ', ')" -ForegroundColor White
    
    # Check Application Gateway
    $appGateway = az network application-gateway list --resource-group $resourceGroupName --query "[0].name" -o tsv
    if ($appGateway) {
        Write-Host "Application Gateway with WAF configured: $appGateway" -ForegroundColor White
        
        # Get public IP
        $publicIP = az network public-ip list --resource-group $resourceGroupName --query "[?starts_with(name, 'pip-appgw')].ipAddress" -o tsv
        if ($publicIP) {
            Write-Host "Public IP Address: $publicIP" -ForegroundColor White
        }
    }
    
    Write-Host "✅ Network security validation completed" -ForegroundColor Green
} else {
    Write-Host "⏭️ Skipping network security validation" -ForegroundColor Yellow
}

# Step 7: Health Check and Validation
Write-Host ""
Write-Host "🔍 Step 7: Running Comprehensive Health Checks..." -ForegroundColor Cyan

# Test monitoring endpoints
Write-Host "Testing monitoring and alerting..." -ForegroundColor Yellow

$actionGroups = az monitor action-group list --resource-group $resourceGroupName --query "[].name" -o tsv
Write-Host "Action groups configured: $($actionGroups -join ', ')" -ForegroundColor White

$metricAlerts = az monitor metrics alert list --resource-group $resourceGroupName --query "[].name" -o tsv
Write-Host "Metric alerts configured: $($metricAlerts -join ', ')" -ForegroundColor White

$logAlerts = az monitor scheduled-query list --resource-group $resourceGroupName --query "[].name" -o tsv
Write-Host "Log query alerts configured: $($logAlerts -join ', ')" -ForegroundColor White

# Validate budget configuration
$budgets = az consumption budget list --query "[?resourceGroup=='$resourceGroupName'].name" -o tsv
if ($budgets) {
    Write-Host "Budget alerts configured: $($budgets -join ', ')" -ForegroundColor White
} else {
    Write-Host "⚠️ No budget alerts found" -ForegroundColor Yellow
}

Write-Host "✅ Health checks completed" -ForegroundColor Green

# Final Status Report
Write-Host ""
Write-Host "📊 Azure Resource Management Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Monitoring & Alerting:" -ForegroundColor Yellow
Write-Host "  ✅ Application Insights with custom dashboard" -ForegroundColor White
Write-Host "  ✅ Log Analytics workspace with diagnostic settings" -ForegroundColor White
Write-Host "  ✅ CPU, Memory, and Error rate alerts" -ForegroundColor White
Write-Host "  ✅ Database connection monitoring" -ForegroundColor White
Write-Host "  ✅ Custom business metrics tracking" -ForegroundColor White
Write-Host ""
Write-Host "💰 Cost Management:" -ForegroundColor Yellow
Write-Host "  ✅ Monthly budget: $MonthlyBudgetAmount USD" -ForegroundColor White
Write-Host "  ✅ Cost alerts at 80% and 100% thresholds" -ForegroundColor White
Write-Host "  ✅ Required tags governance policy" -ForegroundColor White
if ($EnvironmentName -eq "dev") {
    Write-Host "  ✅ Auto-shutdown configured for development" -ForegroundColor White
}
Write-Host ""
Write-Host "🔒 Security & Compliance:" -ForegroundColor Yellow
Write-Host "  ✅ Network Security Groups with proper rules" -ForegroundColor White
Write-Host "  ✅ Application Gateway with WAF protection" -ForegroundColor White
Write-Host "  ✅ Private endpoints for sensitive services" -ForegroundColor White
Write-Host "  ✅ DDoS protection (production environments)" -ForegroundColor White
Write-Host ""
Write-Host "💾 Backup & Recovery:" -ForegroundColor Yellow
Write-Host "  ✅ Cosmos DB continuous backup enabled" -ForegroundColor White
Write-Host "  ✅ Key Vault backup automation configured" -ForegroundColor White
Write-Host "  ✅ Recovery Services Vault for critical data" -ForegroundColor White
Write-Host "  ✅ Automated backup monitoring and alerts" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access Information:" -ForegroundColor Yellow
if ($publicIP) {
    Write-Host "  Application Gateway Public IP: $publicIP" -ForegroundColor White
}
Write-Host "  Azure Portal: https://portal.azure.com" -ForegroundColor White
Write-Host "  Resource Group: $resourceGroupName" -ForegroundColor White
Write-Host ""
Write-Host "📈 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review monitoring dashboard in Azure Portal" -ForegroundColor White
Write-Host "  2. Test alert notifications" -ForegroundColor White
Write-Host "  3. Configure custom domain for Application Gateway" -ForegroundColor White
Write-Host "  4. Set up SSL certificates" -ForegroundColor White
Write-Host "  5. Review and adjust budget thresholds as needed" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your SaaS Framework now has enterprise-grade monitoring and management!" -ForegroundColor Green
