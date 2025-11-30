# Register ML Retraining Scheduled Task
# Run this script as Administrator to set up daily midnight EST training

param(
    [string]$ProjectRoot = "C:\Users\1337\Documents\GitHub\Rug-Killer-On-Solana",
    [switch]$Unregister
)

$TaskName = "RugKiller-ML-Retrain-Daily"
$ScriptPath = Join-Path $ProjectRoot "scripts\schedule-ml-retrain.ps1"

if ($Unregister) {
    Write-Host "Unregistering task: $TaskName"
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Task unregistered successfully" -ForegroundColor Green
    exit 0
}

# Check if running as Administrator
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Setting up scheduled ML retraining task..." -ForegroundColor Cyan
Write-Host "Task Name: $TaskName"
Write-Host "Script: $ScriptPath"
Write-Host "Schedule: Daily at 12:00 AM EST (5:00 AM UTC)"
Write-Host ""

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Create action
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -ProjectRoot `"$ProjectRoot`""

# Create trigger for midnight EST (5 AM UTC)
$Trigger = New-ScheduledTaskTrigger -Daily -At "05:00"

# Create settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Register task to run as current user
$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Daily ML model retraining for Rug Killer bot at midnight EST" | Out-Null

Write-Host ""
Write-Host "✓ Scheduled task registered successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Task Details:" -ForegroundColor Cyan
Get-ScheduledTask -TaskName $TaskName | Format-Table -AutoSize

Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  View task:      Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Run now:        Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Disable:        Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Enable:         Enable-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Unregister:     .\scripts\register-ml-task.ps1 -Unregister"
Write-Host ""
Write-Host "Logs will be saved to: $ProjectRoot\logs\ml-retrain-YYYY-MM-DD.log" -ForegroundColor Cyan
