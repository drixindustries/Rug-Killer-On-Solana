param(
  [Parameter(Mandatory=$true)][string]$Domain,
  [Parameter(Mandatory=$true)][string]$Secret,
  [string]$OutputPath,
  [string]$MintsCsv,
  [switch]$IncludeToken2022 = $true,
  [switch]$IncludeRaydium = $true,
  [switch]$IncludeJupiter = $true,
  [switch]$IncludePumpfun = $true,
  [string]$OrcaWhirlpoolProgramId,
  [string]$MeteoraProgramId,
  [string]$ExtraProgramsCsv,
  [switch]$KitchenSinkGlobal
)

# Known program IDs
$SPL_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
$SPL_TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
$RAYDIUM_AMM_V4 = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
# Aggregators & ecosystems (from repo usage)
$JUPITER_ROUTER_V4 = "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"
$JUPITER_ROUTER_V6 = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
$PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"

if (-not $OutputPath) {
  $OutputPath = Join-Path (Resolve-Path "$PSScriptRoot/..").Path ("docs/QUICKNODE_PRESETS.{0}.local.json" -f $Domain)
}

$programIdsBase = @($SPL_TOKEN)
if ($IncludeToken2022) { $programIdsBase += $SPL_TOKEN_2022 }
if ($IncludeRaydium) { $programIdsBase += $RAYDIUM_AMM_V4 }
if ($IncludeJupiter) { $programIdsBase += @($JUPITER_ROUTER_V4, $JUPITER_ROUTER_V6) }
if ($IncludePumpfun) { $programIdsBase += $PUMPFUN_PROGRAM }
if ($OrcaWhirlpoolProgramId) { $programIdsBase += $OrcaWhirlpoolProgramId }
if ($MeteoraProgramId) { $programIdsBase += $MeteoraProgramId }
if ($ExtraProgramsCsv) {
  $programIdsBase += ($ExtraProgramsCsv.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
}

$mints = @()
if ($MintsCsv) {
  $mints = $MintsCsv.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
}

function New-Delivery($domain, $secret) {
  return [pscustomobject]@{
    type = "webhook"
    url = "https://$domain/api/webhooks/solana/stream/quicknode"
    headers = @{ "x-stream-secret" = $secret }
    requestSigning = $true
  }
}

function New-Preset($name, $description, $delivery, $programIds, $mintsOpt, $batchSize=25) {
  $filters = @{}
  if ($programIds -and $programIds.Count -gt 0) { $filters.programIds = $programIds }
  if ($mintsOpt -and $mintsOpt.Count -gt 0) { $filters.accounts = @{ mints = $mintsOpt } }
  return [pscustomobject]@{
    name = $name
    description = $description
    delivery = $delivery
    filters = $filters
    options = @{ batchSize = $batchSize; retries = 3; backoffMs = 1000 }
  }
}

$delivery = New-Delivery -domain $Domain -secret $Secret

$presetMinimal = New-Preset `
  -name "Minimal SPL Token (by mint)" `
  -description "Low-volume stream for specific token mints; validates pipeline end-to-end." `
  -delivery $delivery `
  -programIds @($SPL_TOKEN) `
  -mintsOpt $mints `
  -batchSize 25

$presetDex = New-Preset `
  -name "DEX-focused (Raydium/Orca)" `
  -description "Moderate volume: SPL Token + major DEX programs. Add/remove mints to tune volume." `
  -delivery $delivery `
  -programIds $programIdsBase `
  -mintsOpt $mints `
  -batchSize 25

$presetBroad = New-Preset `
  -name "Broad discovery (high volume)" `
  -description "High-volume: SPL Token + DEX programs, no mint filters. Use with caution." `
  -delivery $delivery `
  -programIds $programIdsBase `
  -mintsOpt @() `
  -batchSize 50

if ($KitchenSinkGlobal) {
  $presetGlobal = New-Preset `
    -name "Kitchen sink (global transactions)" `
    -description "No program or mint filters. Extremely high volume. Use only if you have strong rate limits and autoscaling." `
    -delivery $delivery `
    -programIds @() `
    -mintsOpt @() `
    -batchSize 50
  $presets = @($presetMinimal, $presetDex, $presetBroad, $presetGlobal)
}
else {
  $presets = @($presetMinimal, $presetDex, $presetBroad)
}

$dir = Split-Path -Parent $OutputPath
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$presets | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "Wrote $OutputPath" -ForegroundColor Green
if ($KitchenSinkGlobal) { Write-Host "Kitchen sink preset added (no filters)." -ForegroundColor Yellow }
Write-Host "Programs included: " ($programIdsBase -join ', ')
if ($mints.Count -gt 0) { Write-Host "Mints: " ($mints -join ', ') }
