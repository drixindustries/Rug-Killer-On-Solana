# Server Test Script
Write-Host "`n=== COMPREHENSIVE SERVER TEST ===`n" -ForegroundColor Cyan

# Kill any existing node processes
Write-Host "[1/7] Stopping existing node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Set environment variables
$Env:FORCE_IN_MEMORY_DB="true"
$Env:PHANTOM_WALLET_ADDRESS="TestWallet"
$Env:NODE_ENV="development"

# Start server in background
Write-Host "[2/7] Starting server..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock {
    Set-Location "c:\Users\thoma\OneDrive\Desktop\Rug-Killer-on-Solana\Rug-Killer-on-Solana\server"
    $Env:FORCE_IN_MEMORY_DB="true"
    npm run dev
}

# Wait for server to initialize
Write-Host "[3/7] Waiting for server initialization (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test health endpoint
Write-Host "`n[4/7] TESTING ENDPOINTS:" -ForegroundColor Cyan
try {
    $health = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "[PASS] /api/health: OK" -ForegroundColor Green
    Write-Host "       Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "       Time: $($healthData.time)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] /api/health: $_" -ForegroundColor Red
}

# Test RPC health endpoint
try {
    $rpcHealth = Invoke-WebRequest -Uri "http://localhost:5000/api/rpc/health" -UseBasicParsing -TimeoutSec 5
    $rpcData = $rpcHealth.Content | ConvertFrom-Json
    Write-Host "[PASS] /api/rpc/health: OK" -ForegroundColor Green
    Write-Host "       Available: $($rpcData.availableProviders)" -ForegroundColor Gray
    Write-Host "       Healthy: $($rpcData.healthyProviders)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] /api/rpc/health: $_" -ForegroundColor Red
}

# Check server process
Write-Host "`n[5/7] SERVER PROCESS STATUS:" -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "[RUNNING] Node process (PID: $($nodeProcesses[0].Id))" -ForegroundColor Green
    Write-Host "          Runtime: $((Get-Date) - $nodeProcesses[0].StartTime)" -ForegroundColor Gray
} else {
    Write-Host "[STOPPED] No node process found" -ForegroundColor Red
}

# Check job status
Write-Host "`n[6/7] BACKGROUND JOB STATUS:" -ForegroundColor Cyan
$jobState = Get-Job -Id $job.Id
Write-Host "Job State: $($jobState.State)" -ForegroundColor Gray

# Show recent job output
Write-Host "`n[7/7] RECENT SERVER OUTPUT:" -ForegroundColor Cyan
Receive-Job -Id $job.Id | Select-Object -Last 20

# Cleanup
Write-Host "`nCleaning up..." -ForegroundColor Yellow
Stop-Job -Id $job.Id -ErrorAction SilentlyContinue
Remove-Job -Id $job.Id -ErrorAction SilentlyContinue
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "`n=== TEST COMPLETE ===`n" -ForegroundColor Cyan
