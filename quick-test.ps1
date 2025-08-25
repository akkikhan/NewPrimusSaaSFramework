# Production Readiness Test
Write-Host "Testing Auth & RBAC Module Production Readiness" -ForegroundColor Green

# Test Gateway Health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
    Write-Host "Gateway Health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "Gateway: Not responding - Run start-integrated-services.ps1" -ForegroundColor Red
    exit 1
}

# Test Auth API Routing
Write-Host "Testing Authentication API routing..." -ForegroundColor Blue
try {
    Invoke-WebRequest -Uri "http://localhost:8080/api/v2/auth/login" -Method GET -TimeoutSec 5 -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 405) {
        Write-Host "Auth routing: WORKING (405 expected for GET)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Auth routing: FAILED - 404 Not Found" -ForegroundColor Red
    } else {
        Write-Host "Auth routing: Response $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Test RBAC API Routing
Write-Host "Testing RBAC API routing..." -ForegroundColor Blue
try {
    Invoke-WebRequest -Uri "http://localhost:8080/api/v2/rbac/roles" -Method GET -TimeoutSec 5 -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "RBAC routing: WORKING (401 unauthorized expected)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "RBAC routing: FAILED - 404 Not Found" -ForegroundColor Red
    } else {
        Write-Host "RBAC routing: Response $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "SUMMARY: Check output above for any FAILED tests" -ForegroundColor Cyan
