# Solana Streams via Webhooks

This project can ingest Solana stream events via HTTP webhooks and aggregate metrics similar to Yellowstone Geyser (blocks/txs/logs/account changes) without running gRPC infra.

## Enable

Set the following envs on your deployment:

- `ENABLE_SOLANA_STREAM_WEBHOOK=true`
- `SOLANA_STREAM_WEBHOOK_SECRET=<your-shared-secret>`
- `SOLANA_STREAM_VERIFY_HMAC=true` (default true)

Endpoint to receive events:

- POST `https://<your-domain>/api/webhooks/solana/stream`
- Optional `:provider` suffix: `/api/webhooks/solana/stream/quicknode` or `/api/webhooks/solana/stream/helius`
- Provide header `x-stream-secret: <your-shared-secret>`

Metrics endpoints:

- GET `/api/metrics/stream/summary`
- GET `/api/metrics/stream/token/:mint`

## Providers

### QuickNode Streams

1. In QuickNode Streams, create a Solana stream.
2. Set Delivery Method to Webhook and use:
   - URL: `https://<your-domain>/api/webhooks/solana/stream/quicknode`
   - Header: `x-stream-secret: <your-shared-secret>`
3. Choose filters (e.g., program IDs, accounts, or all transactions) appropriate to your needs.

Notes: QuickNode/Helius send HMAC headers (`X-Quicknode-Signature`, `X-Helius-Signature`). We verify an HMAC-SHA256 over the raw request body using `SOLANA_STREAM_WEBHOOK_SECRET`. We accept `sha256=<hex>`, `<hex>`, or base64 signatures. You can still use `x-stream-secret` if HMAC is unavailable.

### Helius Webhooks

1. In Helius dashboard, create a webhook target:
   - URL: `https://<your-domain>/api/webhooks/solana/stream/helius`
   - Header: `x-stream-secret: <your-shared-secret>`
2. Select Enhanced Transactions and relevant program filters.

## What’s Collected

The receiver normalizes common payloads (Helius enhanced tx, QuickNode Streams tx) into events and updates a rolling 60-minute window with:

- Transactions/minute, blocks/minute, logs/minute, account updates/minute
- Per-mint activity: txCount and unique wallets (from transfers / token balance owners)

It’s an approximation of Geyser-style counts via webhook-compatible providers. For full Yellowstone features (slots, blocks, accounts, programs), a dedicated gRPC pipeline is required.

## Caveats

- Payload shapes vary; normalization is best-effort and focuses on transactions and token transfers.
- For high-volume global streams, ensure your deployment scales and use provider-side filters to reduce noise.
- HMAC signature verification is enabled by default; disable by setting `SOLANA_STREAM_VERIFY_HMAC=false` (not recommended).

## Filter Recommendations

To control volume and costs, configure provider-side filters:

- Start with transaction-level streams filtered to relevant programs (e.g., SPL Token, major DEXes) or specific token mints you monitor.
- Add account-level streams only if you need state diffs; transaction streams are usually sufficient for activity metrics.
- Prefer program/account selectors over global streams. Verify your metrics endpoints show growth as you widen filters.

### QuickNode: staged presets

Use transaction streams and enable request signing. Keep batches small at first. Expand gradually.

1) Minimal validation (lowest volume)

- Scope: only transactions that touch the SPL Token program(s) for mints you care about.
- Filter types:
   - Programs: SPL Token (classic) and SPL Token 2022
   - Accounts: optional list of specific token mints under evaluation
- Purpose: validates webhook + metrics wiring with very low noise and cost.

2) DEX-focused activity (moderate volume)

- Scope: transactions involving SPL Token + major DEX programs (Raydium, Orca). Keep mints list if you need to cap volume further.
- Filter types:
   - Programs: SPL Token (classic + 2022), Raydium AMM, Orca Whirlpool/AMM
   - Accounts: optional list of tracked mints
- Purpose: capture swaps/liquidity events that drive meaningful token activity metrics.

3) Broad token discovery (high volume; use with caution)

- Scope: global SPL Token transactions plus DEX programs, no mint filter.
- Purpose: discover new/moving tokens; expect higher costs and traffic. Ensure autoscaling and rate limits.

Notes

- Exact program IDs vary and are typically selectable in QuickNode’s UI by name; choose SPL Token (classic) and SPL Token 2022, then add known DEX programs you track. If unsure, start with SPL Token only.
- Prefer Transaction streams with “Enhanced” payloads if available; the receiver normalizes common shapes and extracts `tokenTransfers` and `postTokenBalances` for per-mint metrics.
- Keep `x-stream-secret` header configured and enable request signing; HMAC is verified server-side.

### Suggested QuickNode settings

- Delivery: Webhook
- URL: `https://<your-domain>/api/webhooks/solana/stream/quicknode`
- Headers: `x-stream-secret: <your-shared-secret>`
- Request signing: Enabled (HMAC-SHA256)
- Batch size: 10–50 (start small)
- Retries/Backoff: Enabled (provider defaults are fine initially)

### Sanity test sequence

1. Run the local smoke test with your secret to confirm `ok: true`:

```
scripts/smoke-test-stream-webhook.ps1 -Url https://<your-domain>/api/webhooks/solana/stream/quicknode -Secret <secret> -UseHmac
```

2. Open metrics to watch counters increment:

```
GET /api/metrics/stream/summary
GET /api/metrics/stream/token/<MINT>
```

3. Gradually widen filters in the QuickNode UI while observing volume and latency.

### JSON template (import/reference)

Copy `docs/QUICKNODE_PRESETS.sample.json` and replace placeholders:

- `<your-domain>`: your live domain (e.g., `rugkilleralphabot.fun`)
- `<your-shared-secret>`: matches `SOLANA_STREAM_WEBHOOK_SECRET`
- `<MINT_*>`: token mints to track (optional for discovery)
- `<RAYDIUM_AMM_PROGRAM_ID>`, `<ORCA_WHIRLPOOL_PROGRAM_ID>`, `<OPTIONAL_METEORA_PROGRAM_ID>`: confirm in QuickNode UI or official docs

SPL Token classic program ID is included for convenience:

```
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```

Token-2022 support is available; if desired, add the Token-2022 program via the QuickNode UI selector.

### Generator script (one-liner)

To produce a ready-to-import JSON for your domain and secret without committing secrets, run:

```
# DEX-focused with Orca + optional Meteora
powershell -File scripts/generate-quicknode-presets.ps1 -Domain rugkilleralphabot.fun -Secret <secret> -MintsCsv "<M1>,<M2>" -OrcaWhirlpoolProgramId "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc" -MeteoraProgramId "<METEORA_PROGRAM_ID>"

# Kitchen sink (adds Jupiter + Pump.fun + optional extras and global preset)
powershell -File scripts/generate-quicknode-presets.ps1 -Domain rugkilleralphabot.fun -Secret <secret> -IncludeJupiter -IncludePumpfun -KitchenSinkGlobal -ExtraProgramsCsv "<EXTRA_PROGRAM_ID_1>,<EXTRA_PROGRAM_ID_2>"
```

Notes:
- Default programs included: SPL Token (classic). Add Token-2022 with `-IncludeToken2022`. Raydium AMM v4 is included by default.
- Output file path: `docs/QUICKNODE_PRESETS.<domain>.local.json` (git-ignored).
- Paste the generated JSON into QuickNode Streams (or replicate settings in the UI).

### Confirmed program IDs

- SPL Token (classic): `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- SPL Token 2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- Raydium AMM v4: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
- Orca Whirlpool: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` (source: Orca Whirlpools README)
- Meteora DLMM: use QuickNode's program picker or Meteora docs to select the current mainnet program ID (pass via `-MeteoraProgramId`).

Optional but included in generator by default when flags are set:
- Jupiter Router v4: `JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB`
- Jupiter Router v6: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`
- Pump.fun: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`

## Troubleshooting

- Summary shows zeros: confirm `ENABLE_SOLANA_STREAM_WEBHOOK=true` and that your provider is posting successfully (check logs).
- 401 responses: ensure `x-stream-secret` matches `SOLANA_STREAM_WEBHOOK_SECRET`.
- Performance: use provider filters (program IDs, accounts, token mints) to limit event volume.
