# Simple Data Seeding for Cosmos DB
# Creates initial tenant and admin user for testing

Write-Host "Creating initial tenant and admin user..." -ForegroundColor Green

# Test tenant creation via Authentication API
$tenantData = @{
    name = "Default Organization"
    domain = "default.com"
    settings = @{
        allowUserRegistration = $true
        maxUsers = 100
        features = @("authentication", "rbac", "notifications")
    }
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Creating default tenant..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "http://localhost:5001/api/tenants" -Method POST -Body $tenantData -ContentType "application/json"
    Write-Host "Tenant created successfully: $($response.id)" -ForegroundColor Green
    $tenantId = $response.id
} catch {
    Write-Host "Tenant creation failed or already exists: $($_.Exception.Message)" -ForegroundColor Yellow
    $tenantId = "default-tenant"
}

# Create admin user
$adminUser = @{
    email = "admin@primussoft.com"
    password = "Admin@123"
    firstName = "System"
    lastName = "Administrator"
    tenantId = $tenantId
    roles = @("admin")
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Creating admin user..." -ForegroundColor Yellow
    $userResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/auth/register" -Method POST -Body $adminUser -ContentType "application/json"
    Write-Host "Admin user created successfully: admin@primussoft.com" -ForegroundColor Green
} catch {
    Write-Host "Admin user creation failed or already exists: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Initial setup completed!" -ForegroundColor Green
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@primussoft.com" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
