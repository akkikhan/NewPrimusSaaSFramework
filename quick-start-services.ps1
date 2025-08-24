# Quick Start - SaaS Framework Integrated Services
# Starts all services with proper ports and routing

Write-Host "🚀 Starting SaaS Framework Services..." -ForegroundColor Green

# Navigate to base directory
$BaseDir = "c:\Users\AkkiKhan\Documents\New Primus SaaS Framework"
Set-Location $BaseDir

# Kill any existing dotnet processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Starting services..." -ForegroundColor Cyan

# Start Authentication Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\Authentication'; Write-Host 'Authentication API - Port 5001' -ForegroundColor Green; dotnet run --urls=http://localhost:5001" -WindowStyle Normal

# Wait a moment between services
Start-Sleep -Seconds 3

# Start RBAC Service  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\RBAC'; Write-Host 'RBAC API - Port 5002' -ForegroundColor Green; dotnet run --urls=http://localhost:5002" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Notifications Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\Notifications'; Write-Host 'Notifications API - Port 5003' -ForegroundColor Green; dotnet run --urls=http://localhost:5003" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Gateway Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BaseDir\saas-backend\src\Gateway'; Write-Host 'Gateway API - Port 8080 (Main Entry)' -ForegroundColor Yellow; dotnet run --urls=http://localhost:8080" -WindowStyle Normal

Write-Host "`n✅ All services starting in separate windows!" -ForegroundColor Green
Write-Host "`nService URLs:" -ForegroundColor White
Write-Host "- Gateway (Main): http://localhost:8080" -ForegroundColor Yellow  
Write-Host "- Authentication: http://localhost:5001" -ForegroundColor Gray
Write-Host "- RBAC: http://localhost:5002" -ForegroundColor Gray
Write-Host "- Notifications: http://localhost:5003" -ForegroundColor Gray

Write-Host "`nIntegrated API Endpoints:" -ForegroundColor White
Write-Host "- Health Check: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "- Authentication: http://localhost:8080/api/v2/auth/*" -ForegroundColor Cyan
Write-Host "- Users: http://localhost:8080/api/v2/users/*" -ForegroundColor Cyan
Write-Host "- Roles: http://localhost:8080/api/v2/rbac/roles/*" -ForegroundColor Cyan
Write-Host "- Credits: http://localhost:8080/api/v2/credits/*" -ForegroundColor Cyan
Write-Host "- Tenants: http://localhost:8080/api/v2/tenants/*" -ForegroundColor Cyan

Write-Host "`nWait 30-60 seconds for all services to be ready, then test:" -ForegroundColor Yellow
Write-Host "Invoke-RestMethod -Uri 'http://localhost:8080/health'" -ForegroundColor Gray

Write-Host "`nTo stop all services, run: .\stop-all-services.ps1" -ForegroundColor Red
