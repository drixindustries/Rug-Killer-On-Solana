# weekly-ml-training.ps1 - Weekly automated ML training for Windows
# Schedule with Windows Task Scheduler or run manually

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$MLDir = Join-Path $RootDir "ml"

Write-Host "=================================="  -ForegroundColor Cyan
Write-Host "WEEKLY ML TRAINING - STARTED" -ForegroundColor Cyan
Write-Host "=================================="  -ForegroundColor Cyan
Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Step 1: Download latest datasets
Write-Host ""
Write-Host "STEP 1: Downloading latest datasets..." -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Gray

Push-Location $MLDir
try {
    python download_latest_solrpds.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Dataset download had warnings, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Datasets downloaded successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Dataset download failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Step 2: Train model with hyperparameter tuning
Write-Host ""
Write-Host "STEP 2: Training XGBoost model (10-30 min)..." -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Gray

Push-Location $MLDir
try {
    python train_xgboost_pro.py
    if ($LASTEXITCODE -ne 0) {
        throw "Training failed with exit code $LASTEXITCODE"
    }
    Write-Host "✓ Model trained successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Model training failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Step 3: Copy model to production location (optional)
Write-Host ""
Write-Host "STEP 3: Deploying model to production..." -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Gray

$ModelSource = Join-Path $MLDir "models\xgboost_rug_model_latest.pkl"
$ModelDest = Join-Path $RootDir "server\ml\xgboost_rug_model_latest.pkl"

if (Test-Path $ModelSource) {
    # Create server/ml directory if it doesn't exist
    $ServerMLDir = Join-Path $RootDir "server\ml"
    if (-not (Test-Path $ServerMLDir)) {
        New-Item -ItemType Directory -Path $ServerMLDir | Out-Null
    }
    
    Copy-Item $ModelSource $ModelDest -Force
    Write-Host "✓ Model deployed to: $ModelDest" -ForegroundColor Green
} else {
    Write-Host "⚠️  Model file not found at: $ModelSource" -ForegroundColor Yellow
}

# Step 4: Log results
Write-Host ""
Write-Host "STEP 4: Logging results..." -ForegroundColor Yellow
Write-Host "----------------------------------" -ForegroundColor Gray

$LogFile = Join-Path $MLDir "training_history.log"
$LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Training completed successfully"
Add-Content -Path $LogFile -Value $LogEntry
Write-Host "✓ Log updated: $LogFile" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "=================================="  -ForegroundColor Cyan
Write-Host "WEEKLY ML TRAINING - COMPLETED" -ForegroundColor Cyan
Write-Host "=================================="  -ForegroundColor Cyan
Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Model is ready for production!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review model metrics in: $MLDir\models\" -ForegroundColor Gray
Write-Host "  2. Restart bot if needed to load new model" -ForegroundColor Gray
Write-Host "  3. Monitor performance for 24-48 hours" -ForegroundColor Gray
Write-Host ""
