# Simple Cosmos DB Data Seeding Script
param(
    [Parameter(Mandatory=$false)]
    [string]$CosmosConnectionString = "YOUR_COSMOS_CONNECTION_STRING_HERE",
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "SaaSFrameworkDB"
)

Write-Host "Seeding Cosmos DB with initial data..." -ForegroundColor Green

# Parse connection string
$connectionString = $CosmosConnectionString
$endpointMatch = [regex]::Match($connectionString, "AccountEndpoint=([^;]+)")
$keyMatch = [regex]::Match($connectionString, "AccountKey=([^;]+)")

$endpoint = $endpointMatch.Groups[1].Value
$key = $keyMatch.Groups[1].Value

Write-Host "Connection Details:" -ForegroundColor Blue
Write-Host "  Endpoint: $endpoint" -ForegroundColor White
Write-Host "  Database: $DatabaseName" -ForegroundColor White

# Create sample documents using REST API
$cosmosEndpoint = $endpoint
$accountKey = $key
$databaseId = $DatabaseName

# Function to create authorization header
function Get-CosmosAuthHeader {
    param($verb, $resourceType, $resourceId, $key, $date)
    
    $payload = "$verb`n$resourceType`n$resourceId`n$date`n`n"
    $hmacSha = New-Object System.Security.Cryptography.HMACSHA256
    $hmacSha.Key = [System.Convert]::FromBase64String($key)
    $hashPayload = $hmacSha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload.ToLowerInvariant()))
    $signature = [System.Convert]::ToBase64String($hashPayload)
    
    return [System.Web.HttpUtility]::UrlEncode("type=master&ver=1.0&sig=$signature")
}

# Add required assemblies
Add-Type -AssemblyName System.Web

# Create default tenant document
$tenantDoc = @{
    id = "default-tenant"
    tenantId = "default-tenant"
    name = "Default Organization"
    domain = "default.com"
    isActive = $true
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    settings = @{
        allowUserRegistration = $true
        maxUsers = 100
        features = @("authentication", "rbac", "notifications")
    }
}

$tenantJson = $tenantDoc | ConvertTo-Json -Depth 10

try {
    $date = [DateTime]::UtcNow.ToString("r")
    $resourceType = "docs"
    $resourceId = "dbs/$DatabaseName/colls/tenants"
    $authHeader = Get-CosmosAuthHeader -verb "POST" -resourceType $resourceType -resourceId $resourceId -key $accountKey -date $date
    
    $headers = @{
        "Authorization" = $authHeader
        "x-ms-date" = $date
        "x-ms-version" = "2018-12-31"
        "Content-Type" = "application/json"
        "x-ms-documentdb-partitionkey" = '["default-tenant"]'
    }
    
    $uri = "$cosmosEndpoint/dbs/$DatabaseName/colls/tenants/docs"
    
    Write-Host "Creating default tenant..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $tenantJson
    Write-Host "Default tenant created successfully" -ForegroundColor Green
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Default tenant already exists" -ForegroundColor Yellow
    } else {
        Write-Host "Error creating tenant: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Seeding completed!" -ForegroundColor Green
Write-Host "You can now test your SaaS platform with the new Cosmos DB setup." -ForegroundColor White
