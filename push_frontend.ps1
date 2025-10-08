# -----------------------------------------------
# push_frontend.ps1
# Automates staging, committing, and pushing frontend files
# -----------------------------------------------

param (
    [string]$commitMessage = "chore: update frontend"
)

# Path to git executable
$gitExe = "C:\Program Files\Git\cmd\git.exe"

# Ensure we are in the repository
Set-Location "C:\Client Solana"

# Initialize git if not already
if (-not (Test-Path ".git")) {
    & $gitExe init
    & $gitExe remote add origin https://github.com/mvele88/01.git
}

# Ensure branch is main
& $gitExe branch -M main

# Stage all frontend files
Write-Host "Staging frontend files..."
& $gitExe add *.html
& $gitExe add *.js
& $gitExe add *.css -ErrorAction SilentlyContinue

# Commit
Write-Host "Committing changes..."
& $gitExe commit -m $commitMessage

# Push to origin/main
Write-Host "Pushing to GitHub..."
& $gitExe push -u origin main

Write-Host "Frontend update pushed successfully!"
