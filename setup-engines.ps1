# Engine Setup Script for Neural Board Games
# Downloads Fairy-Stockfish engine and NNUE files if missing

$ErrorActionPreference = "Stop"

# Configuration
$NNUE_FILENAME = "nn-46832cfbead3.nnue"
$NNUE_URL = "https://tests.stockfishchess.org/api/nn/$NNUE_FILENAME"
$ENGINE_FILENAME = "fairy-stockfish-largeboard_x86-64-bmi2.exe"
$ENGINE_URL = "https://github.com/fairy-stockfish/Fairy-Stockfish/releases/download/fairy_sf_14/$ENGINE_FILENAME"

$ENGINES_DIR = "windows\chessapp\Assets\engines"
$SRC_ENGINES_DIR = "src\assets\engines"

Write-Host "=== Neural Board Games - Engine Setup ===" -ForegroundColor Cyan
Write-Host ""

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path $ENGINES_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $SRC_ENGINES_DIR | Out-Null

# Check and download NNUE file
$nnuePath = Join-Path $ENGINES_DIR $NNUE_FILENAME
if (Test-Path $nnuePath) {
    Write-Host "✓ NNUE file found: $NNUE_FILENAME" -ForegroundColor Green
} else {
    Write-Host "✗ NNUE file missing: $NNUE_FILENAME" -ForegroundColor Yellow
    Write-Host "  Downloading from: $NNUE_URL" -ForegroundColor Gray

    try {
        Invoke-WebRequest -Uri $NNUE_URL -OutFile $nnuePath -UseBasicParsing
        Write-Host "✓ Downloaded NNUE file ($('{0:N2}' -f ((Get-Item $nnuePath).Length / 1MB)) MB)" -ForegroundColor Green

        # Copy to src/assets/engines as well
        Copy-Item $nnuePath (Join-Path $SRC_ENGINES_DIR $NNUE_FILENAME)
    } catch {
        Write-Host "✗ Failed to download NNUE file: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please manually download from: $NNUE_URL" -ForegroundColor Yellow
        Write-Host "And place it in: $ENGINES_DIR" -ForegroundColor Yellow
        exit 1
    }
}

# Check and download engine
$enginePath = Join-Path $ENGINES_DIR $ENGINE_FILENAME
if (Test-Path $enginePath) {
    Write-Host "✓ Engine found: $ENGINE_FILENAME" -ForegroundColor Green
} else {
    Write-Host "✗ Engine missing: $ENGINE_FILENAME" -ForegroundColor Yellow
    Write-Host "  Downloading from: $ENGINE_URL" -ForegroundColor Gray

    try {
        Invoke-WebRequest -Uri $ENGINE_URL -OutFile $enginePath -UseBasicParsing
        Write-Host "✓ Downloaded engine ($('{0:N2}' -f ((Get-Item $enginePath).Length / 1MB)) MB)" -ForegroundColor Green

        # Copy to src/assets/engines as well
        Copy-Item $enginePath (Join-Path $SRC_ENGINES_DIR $ENGINE_FILENAME)
    } catch {
        Write-Host "✗ Failed to download engine: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please manually download from:" -ForegroundColor Yellow
        Write-Host "  $ENGINE_URL" -ForegroundColor Yellow
        Write-Host "And place it in: $ENGINES_DIR" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Engine files are ready in: $ENGINES_DIR" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run:" -ForegroundColor White
Write-Host "  npm run windows" -ForegroundColor Cyan
Write-Host ""
