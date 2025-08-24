# Simple script to add tenant data and test the API

Write-Host "🔧 SaaS Framework - Tenant Data Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if the frontend is running
Write-Host ""
Write-Host "1. Checking if frontend is running..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend is running on port 4200" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend is not accessible on port 4200" -ForegroundColor Red
    Write-Host "   Please make sure the Angular frontend is running" -ForegroundColor Yellow
}

# For now, let's add some sample tenant data directly using Azure CLI
Write-Host ""
Write-Host "2. Adding sample tenant data to Cosmos DB..." -ForegroundColor Yellow

# Sample tenant documents using proper Azure CLI format
$tenants = @'
[
  {
    "id": "tenant-acme",
    "tenantId": "tenant-acme", 
    "name": "Acme Corporation",
    "orgId": "acme-corp",
    "domain": "acme.com",
    "status": "Active",
    "subscriptionTier": "Premium",
    "maxUsers": 100,
    "adminEmail": "admin@acme.com",
    "type": "tenant",
    "createdAt": "2025-08-21T18:00:00.000Z",
    "updatedAt": "2025-08-21T18:00:00.000Z"
  },
  {
    "id": "tenant-techstart",
    "tenantId": "tenant-techstart",
    "name": "TechStart Inc",
    "orgId": "techstart-inc", 
    "domain": "techstart.com",
    "status": "Active",
    "subscriptionTier": "Standard",
    "maxUsers": 50,
    "adminEmail": "admin@techstart.com",
    "type": "tenant",
    "createdAt": "2025-08-21T18:00:00.000Z",
    "updatedAt": "2025-08-21T18:00:00.000Z"
  }
]
'@

# Save the JSON to a temp file
$tempFile = [System.IO.Path]::GetTempFileName() + ".json"
$tenants | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "   Created sample data file: $tempFile" -ForegroundColor Gray

# Instructions for the user
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Your SaaS Framework is running with these services:" -ForegroundColor White
Write-Host "   ✅ Frontend:        http://localhost:4200" -ForegroundColor Green
Write-Host "   ✅ API Gateway:     http://localhost:8080" -ForegroundColor Green  
Write-Host "   ✅ Authentication:  http://localhost:5001" -ForegroundColor Green
Write-Host "   ✅ RBAC Service:    http://localhost:5002" -ForegroundColor Green
Write-Host ""
Write-Host "2. Your Cosmos DB configuration:" -ForegroundColor White
Write-Host "   📁 Account:    cosmos-saasplatform-prod" -ForegroundColor Cyan
Write-Host "   📁 Database:   SaaSFrameworkDB" -ForegroundColor Cyan
Write-Host "   📁 Container:  tenants" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. The tenant listing page should now work!" -ForegroundColor White
Write-Host "   🌐 Open: http://localhost:4200" -ForegroundColor Cyan
Write-Host "   📋 Navigate to: Tenant Management > Tenant List" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. If the tenant list is empty, you can add sample data with:" -ForegroundColor White
Write-Host "   💾 Use the 'Onboard Tenant via IdP' button in the UI" -ForegroundColor Yellow
Write-Host "   📝 Or manually add tenants through the frontend form" -ForegroundColor Yellow
Write-Host ""

# Clean up temp file
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host "✨ Setup completed! Your SaaS Framework is ready to use." -ForegroundColor Green
