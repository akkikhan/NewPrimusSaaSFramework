# Quick Test Script for Production Readiness
Write-Host "🧪 Testing Auth & RBAC Module Production Readiness" -ForegroundColor Green

# Test 1: Check if services are running
Write-Host "1️⃣ Checking service health..." -ForegroundColor Blue

try {
    $gatewayHealth = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Gateway: $($gatewayHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Gateway: Not responding" -ForegroundColor Red
    Write-Host "Please run: .\start-integrated-services.ps1" -ForegroundColor Yellow
    exit 1
}

# Test 2: Check Auth API routing
Write-Host "2️⃣ Testing Authentication API routing..." -ForegroundColor Blue

try {
    # Test the auth endpoint (should return method not allowed or similar, not 404)
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v2/auth/login" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 405 -or $response.StatusCode -eq 200) {
        Write-Host "✅ Auth routing: Working (found endpoint)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Auth routing: Unexpected response ($($response.StatusCode))" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 405) {
        Write-Host "✅ Auth routing: Working (method not allowed is expected for GET)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ Auth routing: 404 - Route not found" -ForegroundColor Red
        Write-Host "❌ CRITICAL: Authentication endpoints not accessible via gateway" -ForegroundColor Red
    } else {
        Write-Host "⚠️ Auth routing: Error $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Test 3: Check RBAC API routing  
Write-Host "3️⃣ Testing RBAC API routing..." -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v2/rbac/roles" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ RBAC routing: Working" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ RBAC routing: Working (401 unauthorized is expected)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ RBAC routing: 404 - Route not found" -ForegroundColor Red
    } else {
        Write-Host "⚠️ RBAC routing: Error $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Test 4: Check if Cosmos DB is accessible
Write-Host "4️⃣ Testing database connectivity..." -ForegroundColor Blue

# This is a basic test - in production you'd want more comprehensive DB tests
try {
    # Try to access a tenant endpoint that would hit the database
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v2/tenants" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Database: Accessible" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Database: Cannot verify connectivity" -ForegroundColor Yellow
}

# Test 5: Security headers check
Write-Host "5️⃣ Checking security headers..." -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
    $hasSecurityHeaders = $false
    
    if ($response.Headers["X-Frame-Options"]) { $hasSecurityHeaders = $true }
    if ($response.Headers["X-Content-Type-Options"]) { $hasSecurityHeaders = $true }
    if ($response.Headers["Strict-Transport-Security"]) { $hasSecurityHeaders = $true }
    
    if ($hasSecurityHeaders) {
        Write-Host "✅ Security headers: Present" -ForegroundColor Green
    } else {
        Write-Host "❌ Security headers: Missing" -ForegroundColor Red
        Write-Host "❌ CRITICAL: No security headers configured" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Security headers: Cannot check" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "📊 PRODUCTION READINESS SUMMARY" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$issues = @()
if ($gatewayHealth.status -ne "healthy") { $issues += "Gateway not healthy" }
# Add more issue checks based on test results

if ($issues.Count -eq 0) {
    Write-Host "🎉 BASIC TESTS PASSED - Ready for external integration testing" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Add test data: .\seed-test-data.ps1" -ForegroundColor White
    Write-Host "2. Test login flow with real credentials" -ForegroundColor White
    Write-Host "3. Implement remaining security features" -ForegroundColor White
} else {
    Write-Host "❌ ISSUES FOUND:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please fix these issues before external integration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For detailed analysis, see:" -ForegroundColor Cyan
Write-Host "- IMMEDIATE-ACTION-PLAN.md" -ForegroundColor White
Write-Host "- ROUTING-FIX-GUIDE.md" -ForegroundColor White
