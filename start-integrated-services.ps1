# Start SaaS Framework Services with Proper Ports and Integration
# This script starts all services with correct ports and waits for them to be ready

Write-Host "Starting SaaS Framework Services..." -ForegroundColor Green

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param([int]$Port, [string]$ServiceName)
    Write-Host "Waiting for $ServiceName to start on port $Port..." -ForegroundColor Yellow
    $timeout = 60
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        if (Test-Port $Port) {
            Write-Host "$ServiceName is ready on port $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    Write-Host "$ServiceName failed to start within timeout" -ForegroundColor Red
    return $false
}

# Kill any existing processes on our ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
} catch {
    Write-Host "No existing processes to clean up" -ForegroundColor Gray
}

# Navigate to the base directory
$BaseDir = "c:\Users\AkkiKhan\Documents\New Primus SaaS Framework"
Set-Location $BaseDir

# Start Authentication Service (Port 5001)
Write-Host "Starting Authentication Service on port 5001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\Authentication'; dotnet run --urls=http://localhost:5001" -WindowStyle Minimized

# Wait a bit for the first service to initialize
Start-Sleep -Seconds 5

# Start RBAC Service (Port 5002)
Write-Host "Starting RBAC Service on port 5002..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\RBAC'; dotnet run --urls=http://localhost:5002" -WindowStyle Minimized

# Start Notifications Service (Port 5003)
Write-Host "Starting Notifications Service on port 5003..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\Notifications'; dotnet run --urls=http://localhost:5003" -WindowStyle Minimized

# Start Gateway Service (Port 8080)
Write-Host "Starting Gateway Service on port 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\Gateway'; dotnet run --urls=http://localhost:8080" -WindowStyle Minimized

# Wait for all services to be ready
Write-Host "`nWaiting for all services to be ready..." -ForegroundColor Yellow

$services = @(
    @{Port=5001; Name="Authentication API"}
    @{Port=5002; Name="RBAC API"}
    @{Port=5003; Name="Notifications API"}
    @{Port=8080; Name="Gateway API"}
)

$allReady = $true
foreach ($service in $services) {
    if (-not (Wait-ForService $service.Port $service.Name)) {
        $allReady = $false
    }
}

if ($allReady) {
    Write-Host "`n✅ All services are running successfully!" -ForegroundColor Green
    Write-Host "`nService URLs:" -ForegroundColor White
    Write-Host "- Authentication API: http://localhost:5001" -ForegroundColor Gray
    Write-Host "- RBAC API: http://localhost:5002" -ForegroundColor Gray
    Write-Host "- Notifications API: http://localhost:5003" -ForegroundColor Gray
    Write-Host "- Gateway API: http://localhost:8080 (Main entry point)" -ForegroundColor Yellow
    Write-Host "`nAPI Endpoints Available via Gateway:" -ForegroundColor White
    Write-Host "- Authentication: http://localhost:8080/api/v2/auth/*" -ForegroundColor Gray
    Write-Host "- Users: http://localhost:8080/api/v2/users/*" -ForegroundColor Gray
    Write-Host "- Roles: http://localhost:8080/api/v2/rbac/roles/*" -ForegroundColor Gray
    Write-Host "- Permissions: http://localhost:8080/api/v2/rbac/permissions/*" -ForegroundColor Gray
    Write-Host "- User Roles: http://localhost:8080/api/v2/rbac/userroles/*" -ForegroundColor Gray
    Write-Host "- Credits: http://localhost:8080/api/v2/credits/*" -ForegroundColor Gray
    Write-Host "- Tenants: http://localhost:8080/api/v2/tenants/*" -ForegroundColor Gray
    Write-Host "- Notifications: http://localhost:8080/api/v2/notifications/*" -ForegroundColor Gray
    Write-Host "- Health Check: http://localhost:8080/health" -ForegroundColor Gray
    Write-Host "`nPress any key to start the frontend..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    # Start Frontend
    Write-Host "Starting Frontend on port 4200..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-frontend'; npm start" -WindowStyle Normal
    
} else {
    Write-Host "`n❌ Some services failed to start. Please check the individual service logs." -ForegroundColor Red
}

Write-Host "`nAll services have been started. Check individual windows for logs." -ForegroundColor Green
Write-Host "To stop all services, run: .\stop-all-services.ps1" -ForegroundColor Yellow
