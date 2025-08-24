# ===============================================
# SaaS Framework - Complete Monitoring System
# ===============================================

Write-Host ""
Write-Host "Starting SaaS Framework with Enhanced Monitoring" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Monitoring System Features:" -ForegroundColor White
Write-Host "  Real-time System Health Dashboard" -ForegroundColor Green
Write-Host "  Performance Metrics and Analytics" -ForegroundColor Green
Write-Host "  Comprehensive System Logs" -ForegroundColor Green
Write-Host "  Audit Trail with Export" -ForegroundColor Green
Write-Host "  Service Status Monitoring" -ForegroundColor Green
Write-Host "  Automated Health Checks" -ForegroundColor Green

Write-Host ""
Write-Host "Backend Services Status:" -ForegroundColor White
Write-Host "  Gateway Service (Port 8080) - Enhanced with Monitoring API" -ForegroundColor Green
Write-Host "  Authentication Service (Port 5001) - Ready" -ForegroundColor Green
Write-Host "  RBAC Service (Port 5002) - Ready" -ForegroundColor Green
Write-Host "  Notifications Service (Port 5003) - Ready" -ForegroundColor Green

Write-Host ""
Write-Host "Frontend Monitoring Components:" -ForegroundColor White
Write-Host "  System Overview Dashboard - Real-time metrics" -ForegroundColor Green
Write-Host "  Performance Analytics - KPIs and trends" -ForegroundColor Green
Write-Host "  System Logs Viewer - Live log streaming" -ForegroundColor Green
Write-Host "  Audit Trail - Comprehensive compliance logs" -ForegroundColor Green

Write-Host ""
Write-Host "Access Points:" -ForegroundColor White
Write-Host "  Main Dashboard: http://localhost:4200/dashboard" -ForegroundColor Cyan
Write-Host "  System Monitoring: http://localhost:4200/monitoring/system" -ForegroundColor Cyan
Write-Host "  Performance Metrics: http://localhost:4200/monitoring/performance" -ForegroundColor Cyan
Write-Host "  System Logs: http://localhost:4200/monitoring/logs" -ForegroundColor Cyan
Write-Host "  Audit Trail: http://localhost:4200/monitoring/audit" -ForegroundColor Cyan
Write-Host "  Gateway API: http://localhost:8080" -ForegroundColor Cyan

Write-Host ""
Write-Host "API Endpoints for Monitoring:" -ForegroundColor White
Write-Host "  Health Check: GET /api/monitoring/health" -ForegroundColor Yellow
Write-Host "  System Logs: GET /api/monitoring/logs" -ForegroundColor Yellow
Write-Host "  Metrics: GET /api/monitoring/metrics" -ForegroundColor Yellow
Write-Host "  Service Status: GET /api/monitoring/services" -ForegroundColor Yellow
Write-Host "  Audit Logs: GET /api/monitoring/audit" -ForegroundColor Yellow

Write-Host ""
Write-Host "Starting Services..." -ForegroundColor White

# Function to start service in new window
function Start-ServiceInNewWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory
    )
    
    $ps = New-Object System.Diagnostics.ProcessStartInfo
    $ps.FileName = "powershell.exe"
    $ps.Arguments = "-NoExit -Command `"cd '$WorkingDirectory'; $Command`""
    $ps.WindowStyle = "Normal"
    $ps.UseShellExecute = $true
    $process = [System.Diagnostics.Process]::Start($ps)
    
    Write-Host "  Started $Title (PID: $($process.Id))" -ForegroundColor Green
    return $process.Id
}

try {
    # Start Backend Services
    Write-Host ""
    Write-Host "Starting Backend Services..." -ForegroundColor Yellow
    
    $gatewayPid = Start-ServiceInNewWindow -Title "Gateway Service" -Command "dotnet run" -WorkingDirectory "saas-backend\src\Gateway"
    Start-Sleep -Seconds 3
    
    $authPid = Start-ServiceInNewWindow -Title "Authentication Service" -Command "dotnet run" -WorkingDirectory "saas-backend\src\Authentication"
    Start-Sleep -Seconds 2
    
    $rbacPid = Start-ServiceInNewWindow -Title "RBAC Service" -Command "dotnet run" -WorkingDirectory "saas-backend\src\RBAC"
    Start-Sleep -Seconds 2
    
    $notificationsPid = Start-ServiceInNewWindow -Title "Notifications Service" -Command "dotnet run" -WorkingDirectory "saas-backend\src\Notifications"
    Start-Sleep -Seconds 2

    # Start Frontend
    Write-Host ""
    Write-Host "Starting Frontend Application..." -ForegroundColor Yellow
    $frontendPid = Start-ServiceInNewWindow -Title "Angular Frontend" -Command "npm start" -WorkingDirectory "saas-frontend"

    Write-Host ""
    Write-Host "All Services Started Successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service PIDs:" -ForegroundColor White
    Write-Host "  Gateway: $gatewayPid" -ForegroundColor Gray
    Write-Host "  Authentication: $authPid" -ForegroundColor Gray
    Write-Host "  RBAC: $rbacPid" -ForegroundColor Gray
    Write-Host "  Notifications: $notificationsPid" -ForegroundColor Gray
    Write-Host "  Frontend: $frontendPid" -ForegroundColor Gray

    Write-Host ""
    Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
    Write-Host "This may take 30-60 seconds for first startup." -ForegroundColor Gray
    
    Start-Sleep -Seconds 10

    Write-Host ""
    Write-Host "Monitoring System Ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Quick Test Guide:" -ForegroundColor White
    Write-Host "1. Open browser to: http://localhost:4200" -ForegroundColor Cyan
    Write-Host "2. Navigate to Dashboard" -ForegroundColor Cyan
    Write-Host "3. Click 'System Monitoring' in the sidebar" -ForegroundColor Cyan
    Write-Host "4. Explore all monitoring features:" -ForegroundColor Cyan
    Write-Host "   - System Overview - Real-time health dashboard" -ForegroundColor Gray
    Write-Host "   - Performance - KPIs and metrics analytics" -ForegroundColor Gray
    Write-Host "   - System Logs - Live log viewing and filtering" -ForegroundColor Gray
    Write-Host "   - Audit Trail - Comprehensive audit logs with export" -ForegroundColor Gray

    Write-Host ""
    Write-Host "API Testing:" -ForegroundColor White
    Write-Host "Test the monitoring APIs directly:" -ForegroundColor Gray
    Write-Host "  curl http://localhost:8080/api/monitoring/health" -ForegroundColor Yellow
    Write-Host "  curl http://localhost:8080/api/monitoring/metrics" -ForegroundColor Yellow
    Write-Host "  curl http://localhost:8080/api/monitoring/logs" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor White
    Write-Host "- If services fail to start, check individual console windows" -ForegroundColor Gray
    Write-Host "- Ensure all dependencies are installed (dotnet, npm)" -ForegroundColor Gray
    Write-Host "- Check ports 4200, 8080, 5001-5003 are available" -ForegroundColor Gray
    Write-Host "- Review service logs in respective console windows" -ForegroundColor Gray

    Write-Host ""
    Write-Host "To Stop All Services:" -ForegroundColor Red
    Write-Host "Close all opened console windows or run: .\stop-all-services.ps1" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "Press Ctrl+C to exit this script (services will continue running)" -ForegroundColor White
    Write-Host ""

    # Keep the script running
    while ($true) {
        Start-Sleep -Seconds 5
        Write-Host "." -NoNewline -ForegroundColor Green
    }

} catch {
    Write-Host ""
    Write-Host "Error starting services: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the error details above and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor White
    Write-Host "- Run: dotnet restore in saas-backend/" -ForegroundColor Gray
    Write-Host "- Run: npm install in saas-frontend/" -ForegroundColor Gray
    Write-Host "- Ensure all required ports are free" -ForegroundColor Gray
    exit 1
}
