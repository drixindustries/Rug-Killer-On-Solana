# Helius-Powered Smart Money Scanner

This script integrates Helius Enhanced Webhooks to stream new Pump.fun/Raydium pool events, extracts all involved wallets, enriches them with winrate/PnL using Helius Enhanced Transactions API, and alerts when elite wallets (winrate ≥ 75%, profit ≥ $1M) are detected.

## Setup

### Env Vars

Create `.env` in the repo root:

```
HELIUS_API_KEY=your_key_here
SMART_MONEY_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... (fallback, bot relay preferred)
SMART_MONEY_CHANNEL_IDS=123456789012345678,234567890123456789 (Discord channels, fallback)
SMART_MONEY_TELEGRAM_CHAT_IDS=-1001234567890,-1009876543210 (Telegram chats, fallback)
TELEGRAM_BOT_TOKEN=7123456789:AAF... (for relay routing)
SOL_PRICE=200
PORT=8000
ELITE_WATCHLIST=4aKx7fV9pL2m...,Hx9mK2vN3vB1...
```

### Helius Webhook

- Webhooks → Add Webhook
  - Name: PumpFunNewPools
  - Transaction Types: CREATE_POOL, SWAP, TOKEN_MINT
  - Account Addresses: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` (Pump.fun), `4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4haw8tqK` (Raydium)
  - Webhook URL: `https://yourapp.domain/helius-webhook`
  - Output Format: ENHANCED

## Run Locally

```powershell
npm install tsx express body-parser node-fetch @solana/web3.js dotenv
npx tsx scripts/helius_scanner.ts
```

## Deploy

- Railway/Render → Set env vars → Expose `/helius-webhook` endpoint

## Notes

- Alerts do NOT tag `@everyone`; mass mentions are disabled.
- Enrichment is async and caps at top 20 wallets per event.
- Smart Money routing now goes through Discord/Telegram bots via internal relay (`smart-money-relay.ts`).
- Elite threshold: winrate ≥ 75% and profit ≥ $500,000 (adjust in `helius_scanner.ts`).
- Directives: PRIORITY WATCH / HIGH WATCH / ACCUMULATION SIGNAL / EARLY WATCH / INFO (see `smart-money-relay.ts`).
- For pre-known elites, use `ELITE_WATCHLIST` to skip enrichment API calls.

## Configure Channels

**Discord:**
- Use `/smart setchannel` in Discord OR set env `SMART_MONEY_CHANNEL_IDS=123,456,789` (comma-separated channel IDs).

**Telegram:**
- Use `/smart_here` in Telegram chat OR set env `SMART_MONEY_TELEGRAM_CHAT_IDS=-1001234567890,-1009876543210` (comma-separated chat IDs).
