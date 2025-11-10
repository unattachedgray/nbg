# NNUE Setup Script for Neural Board Games
# Downloads NNUE neural network file if missing
# Note: Engine binaries are included in the repository

$ErrorActionPreference = "Stop"

# Configuration
$NNUE_FILENAME = "nn-46832cfbead3.nnue"
$NNUE_URL = "https://tests.stockfishchess.org/api/nn/$NNUE_FILENAME"

$ENGINES_DIR = "windows\chessapp\Assets\engines"
$SRC_ENGINES_DIR = "src\assets\engines"

Write-Host "=== Neural Board Games - NNUE Setup ===" -ForegroundColor Cyan
Write-Host ""

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path $ENGINES_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $SRC_ENGINES_DIR | Out-Null

# Check and download NNUE file
$nnuePath = Join-Path $ENGINES_DIR $NNUE_FILENAME
$srcNnuePath = Join-Path $SRC_ENGINES_DIR $NNUE_FILENAME

if ((Test-Path $nnuePath) -or (Test-Path $srcNnuePath)) {
    Write-Host "✓ NNUE file found: $NNUE_FILENAME" -ForegroundColor Green
} else {
    Write-Host "✗ NNUE file missing: $NNUE_FILENAME" -ForegroundColor Yellow
    Write-Host "  Downloading from: $NNUE_URL" -ForegroundColor Gray
    Write-Host "  Size: ~46 MB" -ForegroundColor Gray

    try {
        Invoke-WebRequest -Uri $NNUE_URL -OutFile $nnuePath -UseBasicParsing
        Write-Host "✓ Downloaded NNUE file ($('{0:N2}' -f ((Get-Item $nnuePath).Length / 1MB)) MB)" -ForegroundColor Green

        # Copy to src/assets/engines as well
        Copy-Item $nnuePath $srcNnuePath
        Write-Host "✓ Copied to src/assets/engines/" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to download NNUE file: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please manually download from: $NNUE_URL" -ForegroundColor Yellow
        Write-Host "And place it in: $ENGINES_DIR" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "NNUE neural network is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run:" -ForegroundColor White
Write-Host "  npm run windows" -ForegroundColor Cyan
Write-Host ""
