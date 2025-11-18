param(
  [string]$Secret
)

if (-not $Secret) {
  $Secret = [guid]::NewGuid().ToString("N")
}

Write-Host "Using stream secret: $Secret"

try {
  railway variables --set "ENABLE_SOLANA_STREAM_WEBHOOK=true"
  railway variables --set "SOLANA_STREAM_WEBHOOK_SECRET=$Secret"
  railway variables --set "SOLANA_STREAM_VERIFY_HMAC=true"
  Write-Host "✅ Set Railway stream envs."
  Write-Host "⚠️ Configure your provider with x-stream-secret: $Secret and enable signing."
} catch {
  Write-Error "Failed to set Railway variables. Ensure Railway CLI is installed and you're logged in (railway login)."
  exit 1
}
