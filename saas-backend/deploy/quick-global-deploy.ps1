# Quick Global Deployment Script
param(
    [string]$SubscriptionId = "your-subscription-id",
    [string]$ResourceGroupName = "saas-framework-global",
    [string]$Location = "East US",
    [string]$Environment = "production"
)

Write-Host "🚀 Quick Global Deployment for SaaS Framework" -ForegroundColor Green
Write-Host "This will deploy your Auth & RBAC modules for global access" -ForegroundColor Cyan

# Check if user is logged in to Azure
$currentUser = az account show --query user.name --output tsv 2>$null
if (-not $currentUser) {
    Write-Host "❌ Please login to Azure first: az login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in as: $currentUser" -ForegroundColor Green

# Set subscription
if ($SubscriptionId -ne "your-subscription-id") {
    az account set --subscription $SubscriptionId
    Write-Host "✅ Using subscription: $SubscriptionId" -ForegroundColor Green
}

# Create resource group
Write-Host "📁 Creating resource group: $ResourceGroupName" -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Deploy Container Apps Environment
Write-Host "🏗️ Deploying Container Apps infrastructure..." -ForegroundColor Blue
& ".\deploy-global-containerapp.ps1" -SubscriptionId $SubscriptionId -ResourceGroupName $ResourceGroupName -Location $Location -Environment $Environment

Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for deployment to complete (5-10 minutes)" -ForegroundColor White
Write-Host "2. Configure your custom domain" -ForegroundColor White
Write-Host "3. Set up SSL certificates" -ForegroundColor White
Write-Host "4. Test the APIs from external applications" -ForegroundColor White
Write-Host ""
Write-Host "🌍 Your APIs will be available at:" -ForegroundColor Cyan
Write-Host "Auth API: https://[your-domain]/api/v2/auth" -ForegroundColor White
Write-Host "RBAC API: https://[your-domain]/api/v2/rbac" -ForegroundColor White
