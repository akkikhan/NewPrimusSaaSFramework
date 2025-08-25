# Seed Test Data Script
Write-Host "🌱 Creating test data for SaaS Framework" -ForegroundColor Green

# Test credentials that external apps can use
$testData = @{
    tenantId = "demo-tenant"
    users = @(
        @{
            email = "admin@demo.com"
            password = "Demo123!"
            firstName = "Demo"
            lastName = "Admin"
            roles = @("Admin")
        },
        @{
            email = "user@demo.com" 
            password = "Demo123!"
            firstName = "Demo"
            lastName = "User"
            roles = @("User")
        }
    )
    roles = @(
        @{
            name = "Admin"
            description = "Full system access"
            permissions = @("users.read", "users.write", "roles.read", "roles.write", "permissions.read", "permissions.write")
        },
        @{
            name = "User"
            description = "Basic user access"
            permissions = @("users.read", "roles.read")
        }
    )
}

# TODO: Implement actual database seeding
Write-Host "Test data structure created:" -ForegroundColor Cyan
$testData | ConvertTo-Json -Depth 3

Write-Host ""
Write-Host "🔧 TO IMPLEMENT:" -ForegroundColor Yellow
Write-Host "1. Create Cosmos DB seeding logic" -ForegroundColor White
Write-Host "2. Hash passwords with BCrypt" -ForegroundColor White
Write-Host "3. Insert test data into containers" -ForegroundColor White
Write-Host ""
Write-Host "📖 EXTERNAL APPS CAN USE:" -ForegroundColor Green
Write-Host "Email: admin@demo.com" -ForegroundColor White
Write-Host "Password: Demo123!" -ForegroundColor White
Write-Host "Tenant: demo-tenant" -ForegroundColor White
