param(
  [string]$EnvFile = "$PSScriptRoot/../server/.env",
  [switch]$DryRun
)

Write-Host "Loading env from $EnvFile"
if (!(Test-Path $EnvFile)) { Write-Error "Env file not found: $EnvFile"; exit 1 }

# Parse .env (KEY=VALUE), ignore comments/blank lines
$pairs = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { return }
  $k = $line.Substring(0, $idx).Trim()
  $v = $line.Substring($idx + 1)
  # Remove surrounding quotes if present
  if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) { $v = $v.Substring(1, $v.Length - 2) }
  $pairs[$k] = $v
}

$keys = @(
  'ALPHA_ALERTS_ENABLED',
  'ALPHA_ALERTS_DIRECT_SEND',
  'ALPHA_DISCORD_WEBHOOK',
  'ALPHA_TELEGRAM_CHAT_ID',
  'TELEGRAM_BOT_TOKEN',
  'ALPHA_TELEGRAM_BOT_TOKEN',
  'HELIUS_API_KEY',
  'ALPHA_HTTP_RPC',
  'ALPHA_WS_RPC',
  'NANSEN_API_KEY',
  'NANSEN_POLL_INTERVAL_MS',
  'NANSEN_LOOKBACK_MINUTES',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID'
)

foreach ($k in $keys) {
  if ($pairs.ContainsKey($k) -and $pairs[$k]) {
    $value = $pairs[$k]
    if ($DryRun) {
      Write-Host "DRYRUN railway variables --set \"$k=$value\"" -ForegroundColor Yellow
    } else {
      Write-Host "railway variables --set \"$k=***hidden***\"" -ForegroundColor Cyan
      railway variables --set "$k=$value"
    }
  }
}

Write-Host "Done. Variables updated in current Railway service context."
