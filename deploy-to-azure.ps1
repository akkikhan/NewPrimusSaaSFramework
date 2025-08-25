# 🚀 Deploy SaaS Framework to Azure
Write-Host "🌍 Deploying SaaS Framework to Azure for Global Access..." -ForegroundColor Green

# Check prerequisites
Write-Host ""
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check AZD
try {
    azd version | Out-Null
    Write-Host "✅ Azure Developer CLI is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure Developer CLI not found" -ForegroundColor Red
    Write-Host "Please run: .\install-azd.ps1" -ForegroundColor Yellow
    exit 1
}

# Check Docker
try {
    docker version | Out-Null
    Write-Host "✅ Docker is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# Check Azure login
try {
    az account show | Out-Null
    Write-Host "✅ Azure CLI authenticated" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Azure CLI not authenticated" -ForegroundColor Yellow
    Write-Host "Running: az login" -ForegroundColor Cyan
    az login
}

Write-Host ""
Write-Host "🎯 Setting up environment variables..." -ForegroundColor Cyan

# Set default environment variables
$jwtSecret = Read-Host "Enter JWT Secret (or press Enter for default)"
if ([string]::IsNullOrEmpty($jwtSecret)) {
    $jwtSecret = "SaaS-Framework-Super-Secret-JWT-Key-$(Get-Random)-$(Get-Date -Format 'yyyyMMdd')"
}

azd env set JWT_SECRET $jwtSecret
azd env set JWT_ISSUER "https://saas-framework.com"
azd env set JWT_AUDIENCE "saas-framework-api"
azd env set COSMOS_DATABASE_NAME "SaaSFramework"
azd env set ASPNETCORE_ENVIRONMENT "Production"

Write-Host "✅ Environment variables configured" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Starting deployment..." -ForegroundColor Green
Write-Host "This will take 10-15 minutes..." -ForegroundColor Yellow

# Deploy to Azure
azd up

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Get your service URLs:" -ForegroundColor Cyan
    Write-Host "azd env get-values" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 View logs:" -ForegroundColor Cyan  
    Write-Host "azd logs" -ForegroundColor White
    Write-Host ""
    Write-Host "🌍 Your SaaS Framework is now globally accessible!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check the error messages above and try again" -ForegroundColor Yellow
}
