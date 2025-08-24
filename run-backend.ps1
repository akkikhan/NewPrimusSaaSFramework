# Start all backend services locally
$BackendPath = "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework\saas-backend"

Write-Host "Starting SaaS Framework Backend Services..." -ForegroundColor Green

# Start Gateway Service (Port 8080)
Write-Host "Starting Gateway Service on port 8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\Gateway'; dotnet run --urls=http://localhost:8080" -WindowStyle Normal

Start-Sleep 2

# Start Authentication Service (Port 5001)
Write-Host "Starting Authentication Service on port 5001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\Authentication'; dotnet run --urls=http://localhost:5001" -WindowStyle Normal

Start-Sleep 2

# Start RBAC Service (Port 5002)
Write-Host "Starting RBAC Service on port 5002..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\RBAC'; dotnet run --urls=http://localhost:5002" -WindowStyle Normal

Start-Sleep 2

# Start Notifications Service (Port 5003)
Write-Host "Starting Notifications Service on port 5003..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\Notifications'; dotnet run --urls=http://localhost:5003" -WindowStyle Normal

Write-Host "`nAll backend services are starting up!" -ForegroundColor Green
Write-Host "Services will be available at:" -ForegroundColor Cyan
Write-Host "  - Gateway:        http://localhost:8080" -ForegroundColor White
Write-Host "  - Authentication: http://localhost:5001" -ForegroundColor White
Write-Host "  - RBAC:           http://localhost:5002" -ForegroundColor White
Write-Host "  - Notifications:  http://localhost:5003" -ForegroundColor White
Write-Host "`nPress any key to stop all services..." -ForegroundColor Yellow

# Wait for user input
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Kill all dotnet processes (cleanup)
Write-Host "`nStopping all services..." -ForegroundColor Red
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "All services stopped." -ForegroundColor Green
