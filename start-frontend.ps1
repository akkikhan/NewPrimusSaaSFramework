#!/usr/bin/env pwsh

Write-Host "Starting SaaS Framework Frontend..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework\saas-frontend"

# Install dependencies if node_modules doesn't exist
if (!(Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the Angular development server
Write-Host "Starting Angular development server on port 4200..." -ForegroundColor Green
npm start
