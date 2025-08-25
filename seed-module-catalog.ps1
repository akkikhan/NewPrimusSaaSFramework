param (
    [string]$CosmosDbEndpoint,
    [string]$CosmosDbKey
)

if ([string]::IsNullOrEmpty($CosmosDbEndpoint) -or [string]::IsNullOrEmpty($CosmosDbKey)) {
    Write-Host "CosmosDbEndpoint and CosmosDbKey are required."
    exit
}

$DatabaseName = "SaaSFramework"
$ContainerName = "module-catalog"

Install-Module Az.CosmosDB -Force -Scope CurrentUser

$context = New-AzCosmosDBContext -Account $CosmosDbEndpoint -Key $CosmosDbKey

$database = Get-AzCosmosDBDatabase -Context $context -Name $DatabaseName
if (-not $database) {
    $database = New-AzCosmosDBDatabase -Context $context -Name $DatabaseName
}

$container = Get-AzCosmosDBContainer -Context $context -DatabaseName $DatabaseName -Name $ContainerName
if (-not $container) {
    $container = New-AzCosmosDBContainer -Context $context -DatabaseName $DatabaseName -Name $ContainerName -PartitionKeyKind "Hash" -PartitionKeyPath "/category"
}

$modules = @(
    @{
        id = "user-management";
        name = "User Management";
        description = "Comprehensive user management with roles and permissions";
        category = "Core";
        price = 29.99;
        isActive = $true;
        features = @("User CRUD", "Role Management", "Permission Control", "Audit Trail")
    },
    @{
        id = "analytics";
        name = "Analytics & Reporting";
        description = "Advanced analytics and custom reporting dashboard";
        category = "Analytics";
        price = 49.99;
        isActive = $true;
        features = @("Custom Dashboards", "Data Export", "Real-time Analytics", "Custom Reports")
    },
    @{
        id = "rbac-basic";
        name = "Role-Based Access Control";
        description = "Fine-grained access control with custom roles";
        category = "Security";
        price = 39.99;
        isActive = $true;
        features = @("Custom Roles", "Permission Matrix", "Access Policies", "Security Audit")
    },
    @{
        id = "api-access";
        name = "API Access";
        description = "Full API access with rate limiting and monitoring";
        category = "Integration";
        price = 19.99;
        isActive = $true;
        features = @("REST API", "Rate Limiting", "API Keys", "Usage Analytics")
    },
    @{
        id = "notifications";
        name = "Notifications";
        description = "Multi-channel notification system";
        category = "Communication";
        price = 24.99;
        isActive = $true;
        features = @("Email Notifications", "SMS Alerts", "Push Notifications", "Notification Templates")
    },
    @{
        id = "workflow";
        name = "Workflow Automation";
        description = "Automate business processes and workflows";
        category = "Automation";
        price = 59.99;
        isActive = $true;
        features = @("Visual Workflow Builder", "Custom Triggers", "Task Automation", "Process Analytics")
    },
    @{
        id = "integration";
        name = "Third-party Integrations";
        description = "Connect with popular third-party services";
        category = "Integration";
        price = 34.99;
        isActive = $true;
        features = @("Salesforce Integration", "Office 365 Sync", "Slack Notifications", "Zapier Webhooks")
    },
    @{
        id = "advanced-security";
        name = "Advanced Security";
        description = "Enhanced security features and compliance tools";
        category = "Security";
        price = 79.99;
        isActive = $true;
        features = @("Two-Factor Authentication", "IP Whitelisting", "Compliance Reports", "Security Monitoring")
    },
    @{
        id = "auth";
        name = "Authentication System";
        description = "Advanced authentication and session management";
        category = "Core";
        price = 34.99;
        isActive = $true;
        features = @("OAuth 2.0", "SAML Integration", "Multi-Factor Auth", "Session Management", "Password Policies")
    },
    @{
        id = "rbac-enhanced";
        name = "Enhanced RBAC";
        description = "Advanced role-based access control with hierarchical permissions";
        category = "Security";
        price = 44.99;
        isActive = $true;
        features = @("Hierarchical Roles", "Dynamic Permissions", "Role Templates", "Access Reviews", "Compliance Auditing")
    },
    @{
        id = "logging";
        name = "Advanced Logging";
        description = "Comprehensive logging and audit trail system";
        category = "Operations";
        price = 29.99;
        isActive = $true;
        features = @("Real-time Logging", "Log Analytics", "Audit Trails", "Performance Metrics", "Custom Dashboards")
    }
)

foreach ($module in $modules) {
    New-AzCosmosDBItem -Context $context -DatabaseName $DatabaseName -ContainerName $ContainerName -PartitionKey $module.category -Item $module
}

Write-Host "Module catalog seeded successfully."
