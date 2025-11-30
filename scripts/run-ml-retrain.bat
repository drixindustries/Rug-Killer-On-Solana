@echo off
REM Batch wrapper for ML retraining scheduled task
REM Ensures proper working directory and environment

cd /d "%~dp0.."
SET PROJECT_ROOT=%CD%

echo [%date% %time%] Starting ML Retraining
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%\scripts\schedule-ml-retrain.ps1" -ProjectRoot "%PROJECT_ROOT%"
SET EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% NEQ 0 (
    echo [%date% %time%] ERROR: Retraining failed with exit code %EXIT_CODE%
    exit /b %EXIT_CODE%
)

echo [%date% %time%] Retraining completed successfully
exit /b 0
