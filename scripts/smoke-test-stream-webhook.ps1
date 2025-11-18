param(
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$false)][string]$Secret,
  [switch]$UseHmac
)

if (-not $Url) { throw "Url is required" }

$payload = @{
  transactions = @(
    @{
      signature = "dummySig"
      slot = 123
      blockTime = [int][double]::Parse((Get-Date -UFormat %s))
      transaction = @{
        signatures = @("dummySig")
        message = @{
          accountKeys = @("FhF9...Wallet1","8xyZ...Wallet2")
          instructions = @()
        }
      }
      meta = @{
        postTokenBalances = @(
          @{ mint = "So11111111111111111111111111111111111111112"; owner = "FhF9...Wallet1" }
        )
      }
      tokenTransfers = @(
        @{ mint = "So11111111111111111111111111111111111111112"; fromUserAccount = "FhF9...Wallet1"; toUserAccount = "8xyZ...Wallet2" }
      )
    }
  )
} | ConvertTo-Json -Depth 7

$headers = @{}
if ($UseHmac -and $Secret) {
  $raw = [Text.Encoding]::UTF8.GetBytes($payload)
  $h = New-Object System.Security.Cryptography.HMACSHA256 ([Text.Encoding]::UTF8.GetBytes($Secret))
  $hex = ($h.ComputeHash($raw) | ForEach-Object { $_.ToString('x2') }) -join ''
  $headers["X-Quicknode-Signature"] = "sha256=$hex"
} elseif ($Secret) {
  $headers["x-stream-secret"] = $Secret
}

Write-Host "POST $Url"
Invoke-RestMethod -Method Post -Uri $Url -Headers $headers -ContentType "application/json" -Body $payload
