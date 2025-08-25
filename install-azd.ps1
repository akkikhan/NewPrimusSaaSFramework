# 🔧 Install Azure Developer CLI (AZD)
Write-Host "🚀 Installing Azure Developer CLI..." -ForegroundColor Green

try {
    # Check if winget is available
    winget --version | Out-Null
    Write-Host "✅ Winget found, installing AZD..." -ForegroundColor Green
    winget install microsoft.azd
} catch {
    Write-Host "⚠️ Winget not available, using PowerShell method..." -ForegroundColor Yellow
    powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' | Invoke-Expression"
}

Write-Host ""
Write-Host "✅ Azure Developer CLI installation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor White
Write-Host "2. Start Docker Desktop" -ForegroundColor White  
Write-Host "3. Run: azd auth login" -ForegroundColor White
Write-Host "4. Run: azd up" -ForegroundColor White
