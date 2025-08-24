#!/usr/bin/env pwsh

Write-Host "Starting SaaS Framework Gateway Service..." -ForegroundColor Green

# Navigate to Gateway directory
Set-Location "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework\saas-backend\src\Gateway"

# Build and run the Gateway service
Write-Host "Building Gateway service..." -ForegroundColor Yellow
dotnet build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Gateway built successfully. Starting service on port 8080..." -ForegroundColor Green
    dotnet run --urls=http://localhost:8080
} else {
    Write-Host "Gateway build failed. Please check the errors above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
