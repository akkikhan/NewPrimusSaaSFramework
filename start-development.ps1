# Complete SaaS Framework Local Development Setup
$BackendPath = "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework\saas-backend"
$FrontendPath = "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework\saas-frontend"

Write-Host "===== SaaS Framework Local Development Environment =====" -ForegroundColor Cyan
Write-Host ""

# Clean up any existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*ng serve*" } | Stop-Process -Force
Start-Sleep 2

Write-Host "✅ Environment cleaned" -ForegroundColor Green
Write-Host ""

# Step 1: Start Backend Services
Write-Host "🚀 Starting Backend Services..." -ForegroundColor Cyan

# Start Authentication Service
Write-Host "  Starting Authentication Service (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\Authentication'; dotnet run --urls=http://localhost:5001" -WindowStyle Normal
Start-Sleep 3

# Start RBAC Service  
Write-Host "  Starting RBAC Service (Port 5002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\RBAC'; dotnet run --urls=http://localhost:5002" -WindowStyle Normal
Start-Sleep 3

# Start Notifications Service
Write-Host "  Starting Notifications Service (Port 5003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\Notifications'; dotnet run --urls=http://localhost:5003" -WindowStyle Normal
Start-Sleep 3

# Start Gateway Service (last, as it routes to other services)
Write-Host "  Starting Gateway Service (Port 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath\src\Gateway'; dotnet run --urls=http://localhost:8080" -WindowStyle Normal
Start-Sleep 5

Write-Host "✅ Backend services started" -ForegroundColor Green
Write-Host ""

# Step 2: Start Frontend
Write-Host "🎨 Starting Frontend Application..." -ForegroundColor Cyan
Write-Host "  Starting Angular Development Server (Port 4201)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$FrontendPath'; ng serve --port 4201" -WindowStyle Normal
Start-Sleep 3

Write-Host "✅ Frontend application started" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "🎉 SaaS Framework Development Environment Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Services are available at:" -ForegroundColor Cyan
Write-Host "  🌐 Frontend Application:  http://localhost:4201" -ForegroundColor White
Write-Host "  🚪 API Gateway:           http://localhost:8080" -ForegroundColor White
Write-Host "  🔐 Authentication API:    http://localhost:5001" -ForegroundColor White
Write-Host "  🛡️  RBAC API:             http://localhost:5002" -ForegroundColor White
Write-Host "  📧 Notifications API:     http://localhost:5003" -ForegroundColor White
Write-Host ""
Write-Host "Azure Services:" -ForegroundColor Cyan
Write-Host "  🗃️  Cosmos DB:            cosmos-saasframework" -ForegroundColor White
Write-Host "  🔑 Key Vault:            saas-platform-kv-prod" -ForegroundColor White
Write-Host "  📦 Container Registry:    acrssframework" -ForegroundColor White
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  📧 SMTP:                 Office365 (dev-saas@primussoft.com)" -ForegroundColor White
Write-Host "  🏢 Multi-tenant:         Cosmos DB partition-based isolation" -ForegroundColor White
Write-Host "  🔒 Authentication:       JWT + Azure AD MSAL" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`n🛑 Stopping all services..." -ForegroundColor Red
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*ng serve*" } | Stop-Process -Force
Write-Host "✅ All services stopped." -ForegroundColor Green
