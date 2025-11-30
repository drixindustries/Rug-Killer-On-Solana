# ML Retraining Scheduled Task
# Runs daily at midnight EST (5 AM UTC)

param(
    [string]$ProjectRoot = "C:\Users\1337\Documents\GitHub\Rug-Killer-On-Solana",
    [string]$Dataset = "ml\dataset\latest.csv"
)

$ErrorActionPreference = "Stop"
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "ml-retrain-$(Get-Date -Format 'yyyy-MM-dd').log"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Write-Output $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

Write-Log "=== ML Retraining Job Started ==="
Write-Log "Project Root: $ProjectRoot"
Write-Log "Dataset: $Dataset"

try {
    Set-Location $ProjectRoot
    Write-Log "Working directory: $(Get-Location)"
    
    $DatasetPath = Join-Path $ProjectRoot $Dataset
    if (-not (Test-Path $DatasetPath)) {
        Write-Log "ERROR: Dataset not found at $DatasetPath"
        Write-Log "Using sample dataset as fallback"
        $DatasetPath = Join-Path $ProjectRoot "ml\dataset\sample-tokens.csv"
    }
    
    Write-Log "Running retrain script with dataset: $DatasetPath"
    $Output = & npx tsx scripts/retrain-ml.ts $DatasetPath 2>&1
    
    Write-Log "Retrain output:"
    $Output | ForEach-Object { Write-Log $_ }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "ERROR: Retrain script failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    
    Write-Log "Retrain completed successfully"
    
    # Optional: Restart service if running
    # Write-Log "Restarting bot service..."
    # Restart-Service -Name "RugKillerBot" -ErrorAction SilentlyContinue
    
    Write-Log "=== ML Retraining Job Completed Successfully ==="
    exit 0
    
} catch {
    Write-Log "FATAL ERROR: $_"
    Write-Log $_.ScriptStackTrace
    exit 1
}
