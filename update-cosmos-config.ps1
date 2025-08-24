# Update Cosmos DB Configuration for SaaS Platform
# This script updates the connection strings in your SaaS Framework project

param(
    [Parameter(Mandatory=$false)]
    [string]$CosmosConnectionString = "YOUR_COSMOS_CONNECTION_STRING_HERE"
)

Write-Host "🔄 Updating Cosmos DB configuration for SaaS Platform..." -ForegroundColor Green

# Define the configuration files to update
$configFiles = @(
    ".\saas-backend\src\Authentication\appsettings.Development.json",
    ".\saas-backend\src\Gateway\appsettings.Development.json",
    ".\saas-backend\src\RBAC\appsettings.Development.json",
    ".\saas-backend\src\Notifications\appsettings.Development.json"
)

foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        Write-Host "📝 Updating $configFile..." -ForegroundColor Blue
        
        # Read the current configuration
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
        
        # Update the Cosmos DB connection string
        $config.ConnectionStrings.CosmosDB = $CosmosConnectionString
        
        # Write back the updated configuration
        $config | ConvertTo-Json -Depth 10 | Set-Content $configFile -Encoding UTF8
        
        Write-Host "✅ Updated $configFile" -ForegroundColor Green
    } else {
        Write-Host "⚠️ File not found: $configFile" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Cosmos DB Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Account Name: cosmos-saasplatform-prod" -ForegroundColor White
Write-Host "  Resource Group: saas-platform-rg" -ForegroundColor White
Write-Host "  Region: West US 2" -ForegroundColor White
Write-Host "  Database: SaaSFrameworkDB" -ForegroundColor White
Write-Host "  Containers:" -ForegroundColor White
Write-Host "    - tenants (partitioned by /tenantId)" -ForegroundColor Gray
Write-Host "    - users (partitioned by /tenantId)" -ForegroundColor Gray
Write-Host "    - roles (partitioned by /tenantId)" -ForegroundColor Gray
Write-Host "    - permissions (partitioned by /tenantId)" -ForegroundColor Gray
Write-Host "    - notifications (partitioned by /tenantId)" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Configuration update completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the seed database script to populate initial data" -ForegroundColor White
Write-Host "2. Test your microservices with the new Cosmos DB" -ForegroundColor White
Write-Host "3. Update production configuration files as needed" -ForegroundColor White
