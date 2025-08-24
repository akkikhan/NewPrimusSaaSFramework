# Cosmos DB Data Seeding Script
param(
    [Parameter(Mandatory=$true)]
    [string]$CosmosConnectionString,
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseName = "SaaSFrameworkDB"
)

Write-Host "🌱 Seeding Cosmos DB with initial data..." -ForegroundColor Green

# Install required modules
Write-Host "📦 Installing required PowerShell modules..." -ForegroundColor Blue
Install-Module -Name CosmosDB -Force -Scope CurrentUser

# Parse connection string
$connectionString = $CosmosConnectionString
$endpointMatch = [regex]::Match($connectionString, "AccountEndpoint=([^;]+)")
$keyMatch = [regex]::Match($connectionString, "AccountKey=([^;]+)")

$endpoint = $endpointMatch.Groups[1].Value
$key = $keyMatch.Groups[1].Value

Write-Host "🔗 Connecting to Cosmos DB..." -ForegroundColor Blue
$cosmosDbContext = New-CosmosDbContext -Account ($endpoint -replace "https://", "" -replace "/", "") -Key $key

# Seed default tenant
Write-Host "🏢 Creating default tenant..." -ForegroundColor Yellow
$defaultTenant = @{
    id = "default-tenant"
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
} | ConvertTo-Json

try {
    New-CosmosDbDocument -Context $cosmosDbContext -Database $DatabaseName -CollectionId "tenants" -DocumentBody $defaultTenant -PartitionKey "default-tenant"
    Write-Host "✅ Default tenant created" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Default tenant might already exist: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Seed default admin user
Write-Host "👤 Creating default admin user..." -ForegroundColor Yellow
$adminUser = @{
    id = "admin-user-001"
    email = "admin@primussoft.com"
    firstName = "System"
    lastName = "Administrator"
    passwordHash = '$2a$11$rQwN7ZpWFQwJ7YzRfQnQ7.8TjGKcOaXGVf7LzDGKcOaXGVf7LzDGK' # BCrypt hash for "Admin@123"
    tenantId = "default-tenant"
    roles = @("Admin", "UserManager")
    isActive = $true
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    lastLoginAt = $null
    refreshToken = $null
    refreshTokenExpiry = $null
} | ConvertTo-Json

try {
    New-CosmosDbDocument -Context $cosmosDbContext -Database $DatabaseName -CollectionId "users" -DocumentBody $adminUser -PartitionKey "default-tenant"
    Write-Host "✅ Default admin user created (admin@primussoft.com / Admin@123)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Default admin user might already exist: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Seed default roles
Write-Host "🎭 Creating default roles..." -ForegroundColor Yellow

$defaultRoles = @(
    @{
        id = "admin-role"
        name = "Admin"
        description = "Full system administration access"
        permissions = @("*")
        tenantId = "default-tenant"
        isActive = $true
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "user-manager-role"
        name = "UserManager"
        description = "User management access"
        permissions = @("users:read", "users:create", "users:update", "users:delete", "roles:read")
        tenantId = "default-tenant"
        isActive = $true
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "user-role"
        name = "User"
        description = "Standard user access"
        permissions = @("profile:read", "profile:update", "notifications:read")
        tenantId = "default-tenant"
        isActive = $true
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
)

foreach ($role in $defaultRoles) {
    try {
        $roleJson = $role | ConvertTo-Json
        New-CosmosDbDocument -Context $cosmosDbContext -Database $DatabaseName -CollectionId "roles" -DocumentBody $roleJson -PartitionKey "default-tenant"
        Write-Host "✅ Role '$($role.name)' created" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Role '$($role.name)' might already exist: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Seed default permissions
Write-Host "🔑 Creating default permissions..." -ForegroundColor Yellow

$defaultPermissions = @(
    @{
        id = "users-read"
        name = "users:read"
        description = "Read user information"
        resource = "users"
        action = "read"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "users-create"
        name = "users:create"
        description = "Create new users"
        resource = "users"
        action = "create"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "users-update"
        name = "users:update"
        description = "Update user information"
        resource = "users"
        action = "update"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "users-delete"
        name = "users:delete"
        description = "Delete users"
        resource = "users"
        action = "delete"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "roles-read"
        name = "roles:read"
        description = "Read role information"
        resource = "roles"
        action = "read"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "profile-read"
        name = "profile:read"
        description = "Read own profile"
        resource = "profile"
        action = "read"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "profile-update"
        name = "profile:update"
        description = "Update own profile"
        resource = "profile"
        action = "update"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    },
    @{
        id = "notifications-read"
        name = "notifications:read"
        description = "Read notifications"
        resource = "notifications"
        action = "read"
        tenantId = "default-tenant"
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
)

foreach ($permission in $defaultPermissions) {
    try {
        $permissionJson = $permission | ConvertTo-Json
        New-CosmosDbDocument -Context $cosmosDbContext -Database $DatabaseName -CollectionId "permissions" -DocumentBody $permissionJson -PartitionKey "default-tenant"
        Write-Host "✅ Permission '$($permission.name)' created" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Permission '$($permission.name)' might already exist: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "🎉 Database seeding completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Default Credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@primussoft.com" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
Write-Host "  Tenant: Default Organization" -ForegroundColor White
