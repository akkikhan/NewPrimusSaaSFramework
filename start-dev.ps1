Write-Host "Starting SaaS Framework Development Environment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "  Gateway Service - Ready (compiles successfully)" -ForegroundColor Green
Write-Host "  Authentication Service - Needs fixes (User model issues)" -ForegroundColor Red
Write-Host "  RBAC Service - Needs fixes (duplicate method)" -ForegroundColor Red
Write-Host "  Notifications Service - Needs fixes (missing models)" -ForegroundColor Red
Write-Host "  Frontend - Ready (Angular app)" -ForegroundColor Green

Write-Host ""
Write-Host "What you can do now:" -ForegroundColor White
Write-Host "1. Start the Gateway service (working)" -ForegroundColor Yellow
Write-Host "2. Start the Frontend (working)" -ForegroundColor Yellow
Write-Host "3. Fix remaining backend services" -ForegroundColor Yellow

Write-Host ""
Write-Host "Azure Resources:" -ForegroundColor White
Write-Host "  Cosmos DB: cosmos-saasframework" -ForegroundColor Green
Write-Host "  Key Vault: saas-platform-kv-prod" -ForegroundColor Green
Write-Host "  Container Registry: acrssframework" -ForegroundColor Green

Write-Host ""
Write-Host "Connection Info:" -ForegroundColor White
Write-Host "  Gateway API: http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "  Database: Azure Cosmos DB (configured)" -ForegroundColor Cyan
Write-Host "  SMTP: Office365 (dev-saas@primussoft.com)" -ForegroundColor Cyan

Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor White
Write-Host "  Start Gateway:  ./start-gateway.ps1" -ForegroundColor Green
Write-Host "  Start Frontend: ./start-frontend.ps1" -ForegroundColor Green
Write-Host "  Build All:      cd saas-backend; dotnet build" -ForegroundColor Yellow

Write-Host ""
Write-Host "Remaining Issues:" -ForegroundColor White
Write-Host "  - User model missing properties" -ForegroundColor Red
Write-Host "  - Method signature mismatches" -ForegroundColor Red
Write-Host "  - Missing Notification models" -ForegroundColor Red
Write-Host "  - Duplicate methods in RBAC controller" -ForegroundColor Red

Write-Host ""
Write-Host "Choose an option:" -ForegroundColor White
Write-Host "[1] Start Gateway service only" -ForegroundColor Green
Write-Host "[2] Start Frontend only" -ForegroundColor Green
Write-Host "[3] Start both Gateway and Frontend" -ForegroundColor Green
Write-Host "[4] Exit" -ForegroundColor Gray

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "Starting Gateway service..." -ForegroundColor Green
        ./start-gateway.ps1
    }
    "2" {
        Write-Host "Starting Frontend..." -ForegroundColor Green
        ./start-frontend.ps1
    }
    "3" {
        Write-Host "Starting both services..." -ForegroundColor Green
        Write-Host "Opening Gateway in new window..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "./start-gateway.ps1"
        
        Start-Sleep -Seconds 2
        Write-Host "Starting Frontend in current window..." -ForegroundColor Yellow
        ./start-frontend.ps1
    }
    "4" {
        Write-Host "Goodbye!" -ForegroundColor Cyan
        exit
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    }
}
