# Start Frontend Angular Application
$FrontendPath = "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework\saas-frontend"

Write-Host "Starting Angular Frontend Application..." -ForegroundColor Green

# Change to frontend directory and start Angular dev server
cd $FrontendPath

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Starting Angular development server on port 4200..." -ForegroundColor Yellow
npm start

Write-Host "`nFrontend will be available at: http://localhost:4200" -ForegroundColor Cyan
