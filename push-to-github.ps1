# Push Primus SaaS Framework to GitHub
param(
    [string]$RepoUrl = ""
)

Write-Host ""
Write-Host "=============================================" -ForegroundColor Blue
Write-Host "    Primus SaaS Framework - GitHub Push" -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue
Write-Host ""

# Test Git installation
try {
    $gitVersion = git --version 2>$null
    Write-Host "Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git: https://git-scm.com/download/windows" -ForegroundColor Yellow
    exit 1
}

# Show project info
Write-Host ""
Write-Host "Project Information:" -ForegroundColor Blue
Write-Host "  Repository: Primus SaaS Framework" -ForegroundColor Green
Write-Host "  Structure: Multi-service architecture" -ForegroundColor Green
Write-Host "  Components:" -ForegroundColor Green
Write-Host "    - Authentication Service" -ForegroundColor Green
Write-Host "    - Gateway Service" -ForegroundColor Green
Write-Host "    - RBAC Service" -ForegroundColor Green
Write-Host "    - Notifications Service" -ForegroundColor Green
Write-Host "    - Angular Frontend" -ForegroundColor Green
Write-Host "    - Monitoring System" -ForegroundColor Green
Write-Host "    - Azure Integration Scripts" -ForegroundColor Green
Write-Host ""

# Get repository URL if not provided
if (-not $RepoUrl) {
    Write-Host "No repository URL provided." -ForegroundColor Yellow
    Write-Host "Please create a repository on GitHub first:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://github.com/new" -ForegroundColor Yellow
    Write-Host "  2. Repository name: primus-saas-framework" -ForegroundColor Yellow
    Write-Host "  3. Description: Primus SaaS Framework - Multi-tenant SaaS platform" -ForegroundColor Yellow
    Write-Host "  4. Choose public or private" -ForegroundColor Yellow
    Write-Host "  5. DO NOT initialize with README, .gitignore, or license" -ForegroundColor Yellow
    Write-Host "  6. Click 'Create repository'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please provide your GitHub repository URL:" -ForegroundColor Yellow
    Write-Host "Examples:" -ForegroundColor Blue
    Write-Host "  https://github.com/yourusername/primus-saas-framework.git" -ForegroundColor Blue
    Write-Host "  git@github.com:yourusername/primus-saas-framework.git" -ForegroundColor Blue
    Write-Host ""
    
    do {
        $RepoUrl = Read-Host "Repository URL"
        if ($RepoUrl -match "github\.com") {
            break
        }
        Write-Host "Please enter a valid GitHub repository URL" -ForegroundColor Red
    } while ($true)
}

Write-Host "Target repository: $RepoUrl" -ForegroundColor Green

# Add files and commit
Write-Host "Adding files to git..." -ForegroundColor Blue
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to add files to git" -ForegroundColor Red
    exit 1
}

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes..." -ForegroundColor Blue
    $commitMessage = "Update: Prepare for GitHub push - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to commit changes" -ForegroundColor Red
        exit 1
    }
    Write-Host "Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "No new changes to commit" -ForegroundColor Green
}

# Set up remote
Write-Host "Setting up remote repository..." -ForegroundColor Blue

$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $existingRemote) {
    Write-Host "Remote 'origin' already exists: $existingRemote" -ForegroundColor Yellow
    $choice = Read-Host "Do you want to update it? (y/N)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        git remote set-url origin $RepoUrl
        Write-Host "Remote origin updated" -ForegroundColor Green
    }
} else {
    git remote add origin $RepoUrl
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Remote origin added" -ForegroundColor Green
    } else {
        Write-Host "Failed to add remote origin" -ForegroundColor Red
        exit 1
    }
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Blue
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Your Primus SaaS Framework has been pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Blue
    Write-Host "  1. Visit your repository: $($RepoUrl -replace '\.git$', '')" -ForegroundColor Blue
    Write-Host "  2. Set up GitHub Actions for CI/CD (if needed)" -ForegroundColor Blue
    Write-Host "  3. Configure branch protection rules" -ForegroundColor Blue
    Write-Host "  4. Add collaborators" -ForegroundColor Blue
    Write-Host "  5. Create issues and project boards" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Repository URL: $($RepoUrl -replace '\.git$', '')" -ForegroundColor Blue
} else {
    Write-Host "Failed to push to GitHub. Please check the error messages above." -ForegroundColor Red
    Write-Host "This might be because:" -ForegroundColor Yellow
    Write-Host "  1. The repository doesn't exist on GitHub" -ForegroundColor Yellow
    Write-Host "  2. You don't have permission to push" -ForegroundColor Yellow
    Write-Host "  3. Authentication failed" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Push to GitHub completed!" -ForegroundColor Green