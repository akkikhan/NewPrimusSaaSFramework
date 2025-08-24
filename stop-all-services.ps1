# ===============================================
# SaaS Framework - Stop All Services
# ===============================================

Write-Host ""
Write-Host "🛑 Stopping SaaS Framework Services" -ForegroundColor Red
Write-Host "====================================" -ForegroundColor Red

Write-Host ""
Write-Host "Stopping services by port..." -ForegroundColor Yellow

# Function to stop process by port
function Stop-ProcessByPort {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                   Select-Object -ExpandProperty OwningProcess -First 1
        
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Stopped $ServiceName (Port $Port)" -ForegroundColor Green
        } else {
            Write-Host "  ⚪ $ServiceName (Port $Port) - Not running" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ⚠️  Could not stop $ServiceName (Port $Port)" -ForegroundColor Yellow
    }
}

# Stop services by their known ports
Stop-ProcessByPort -Port 4200 -ServiceName "Angular Frontend"
Stop-ProcessByPort -Port 8080 -ServiceName "Gateway Service"
Stop-ProcessByPort -Port 5001 -ServiceName "Authentication Service"
Stop-ProcessByPort -Port 5002 -ServiceName "RBAC Service"
Stop-ProcessByPort -Port 5003 -ServiceName "Notifications Service"

Write-Host ""
Write-Host "Stopping any remaining .NET and Node processes..." -ForegroundColor Yellow

# Stop any remaining dotnet processes
try {
    Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Stopped all .NET processes" -ForegroundColor Green
} catch {
    Write-Host "  ⚪ No .NET processes to stop" -ForegroundColor Gray
}

# Stop any remaining node processes
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Stopped all Node.js processes" -ForegroundColor Green
} catch {
    Write-Host "  ⚪ No Node.js processes to stop" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 All services stopped successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To restart the monitoring system, run:" -ForegroundColor White
Write-Host "  .\start-monitoring-system.ps1" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2
