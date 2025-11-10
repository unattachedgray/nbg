# Neural Board Games - Run Script
# Automatically cleans up processes and locked directories before running

$ErrorActionPreference = "Continue"

Write-Host "=== Neural Board Games - Launcher ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any running instances
Write-Host "Checking for running instances..." -ForegroundColor Yellow
$processes = Get-Process -Name "chessapp" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "  Found $($processes.Count) running instance(s). Stopping..." -ForegroundColor Yellow
    Stop-Process -Name "chessapp" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  ✓ Stopped running instances" -ForegroundColor Green
} else {
    Write-Host "  ✓ No running instances found" -ForegroundColor Green
}

# Step 2: Clean up locked directories
Write-Host "Cleaning up locked directories..." -ForegroundColor Yellow
$appPackagesPath = "windows\AppPackages"
if (Test-Path $appPackagesPath) {
    try {
        Remove-Item -Path $appPackagesPath -Recurse -Force -ErrorAction Stop
        Write-Host "  ✓ Removed locked AppPackages directory" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Could not remove AppPackages (may not be locked)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✓ No locked directories to clean" -ForegroundColor Green
}

# Step 3: Check if Metro bundler is running
Write-Host "Checking Metro bundler..." -ForegroundColor Yellow
$metroProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*react-native*start*"
}

if (-not $metroProcess) {
    Write-Host "  Starting Metro bundler in background..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start", "cmd", "/k", "npx react-native start" -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Host "  ✓ Metro bundler started" -ForegroundColor Green
} else {
    Write-Host "  ✓ Metro bundler already running" -ForegroundColor Green
}

# Step 4: Build and run the app
Write-Host ""
Write-Host "Building and launching app..." -ForegroundColor Cyan
Write-Host "This may take a few minutes on first build..." -ForegroundColor Gray
Write-Host ""

npm run windows

Write-Host ""
Write-Host "=== Launcher Complete ===" -ForegroundColor Cyan
