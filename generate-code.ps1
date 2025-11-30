# Quick Redemption Code Generator (PowerShell)
# Usage: .\generate-code.ps1 [OPTIONS]

param(
    [string]$Tier = "lifetime",
    [int]$MaxUses = 1,
    [string]$Expires = "null",
    [string]$Prefix = "RUG",
    [string]$ApiUrl = "http://localhost:3000",
    [string]$AdminToken = $env:DEBUG_ENDPOINTS_TOKEN ?? "test-alpha-2025",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Usage: .\generate-code.ps1 [OPTIONS]

Options:
  -Tier <tier>          Tier: lifetime, individual, or group (default: lifetime)
  -MaxUses <number>     Max uses (default: 1, use 0 for unlimited)
  -Expires <days>       Expires in X days (default: null for never)
  -Prefix <prefix>      Code prefix (default: RUG)
  -ApiUrl <url>         API URL (default: http://localhost:3000)
  -AdminToken <token>   Admin token (default: from DEBUG_ENDPOINTS_TOKEN env)
  -Help                 Show this help message

Examples:
  .\generate-code.ps1
  .\generate-code.ps1 -Tier lifetime -MaxUses 10
  .\generate-code.ps1 -Prefix PROMO -Expires 30
"@
    exit 0
}

# Build JSON payload
$maxUsesValue = if ($MaxUses -eq 0) { "null" } else { $MaxUses }
$expiresValue = if ($Expires -eq "null") { "null" } else { $Expires }

$body = @{
    tier = $Tier
    maxUses = $maxUsesValue
    expiresInDays = $expiresValue
    codePrefix = $Prefix
} | ConvertTo-Json

Write-Host "Generating redemption code..." -ForegroundColor Cyan
Write-Host "Tier: $Tier"
Write-Host "Max Uses: $MaxUses"
Write-Host "Expires: $Expires days"
Write-Host "Prefix: $Prefix"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/admin/codes/generate?token=$AdminToken" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"

    if ($response.success) {
        $code = $response.code.code
        Write-Host "✅ Success!" -ForegroundColor Green
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
        Write-Host "   CODE: $code" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Share this code with users to redeem:"
        Write-Host "  Website: https://your-site.com/subscription"
        Write-Host "  Telegram: /redeem $code"
        Write-Host "  Discord: /redeem $code"
    } else {
        Write-Host "❌ Error: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error generating code:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
