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

## Troubleshooting

- Summary shows zeros: confirm `ENABLE_SOLANA_STREAM_WEBHOOK=true` and that your provider is posting successfully (check logs).
- 401 responses: ensure `x-stream-secret` matches `SOLANA_STREAM_WEBHOOK_SECRET`.
- Performance: use provider filters (program IDs, accounts, token mints) to limit event volume.
