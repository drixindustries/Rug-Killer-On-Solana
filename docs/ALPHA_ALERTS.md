# Alpha Alerts Setup

Alpha Alerts watches smart-money flows and new launches, then delivers alerts to Discord and Telegram. By default, alerts are delivered by the bots (Discord/Telegram). Optionally, you can send messages directly via webhook/Telegram API using a feature flag.

## Quick Enable

Set these in `server/.env` (local) or your Railway service Variables (production):

```
# Core
ALPHA_ALERTS_ENABLED=true

# Optional: better RPC and WS for reliability
HELIUS_API_KEY=<helius_key>          # preferred; auto-wires HTTP+WS
# or explicitly
ALPHA_HTTP_RPC=https://api.mainnet-beta.solana.com
ALPHA_WS_RPC=wss://api.mainnet-beta.solana.com

# Nansen smart-money feed (optional but recommended)
NANSEN_API_KEY=<key>
NANSEN_POLL_INTERVAL_MS=45000        # default
NANSEN_LOOKBACK_MINUTES=15            # initial window

# Bots (recommended path)
DISCORD_ENABLED=true                  # plus DISCORD_BOT_TOKEN & DISCORD_CLIENT_ID already in your setup
TELEGRAM_BOT_TOKEN=<telegram_bot_token>

# Direct sends (optional – off by default)
ALPHA_ALERTS_DIRECT_SEND=true         # enable to send without bots
ALPHA_DISCORD_WEBHOOK=<discord_webhook_url>
ALPHA_TELEGRAM_CHAT_ID=<telegram_chat_id>
# TELEGRAM_BOT_TOKEN is used for direct Telegram; falls back to ALPHA_TELEGRAM_BOT_TOKEN if set
```

Local file location: create `server/.env` (the server reads from its own working directory).

On Railway: open your service → Variables → add the same keys/values.

## Delivery Modes

- Bot callbacks (default):
  - Start the Discord and Telegram bots. When each bot is “ready”, it registers a callback that relays alpha alerts to the configured destinations stored via `storage.getAlphaTargets()`.
  - Configure targets via the bot commands documented in `docs/DISCORD_BOT_SETUP.md` and `docs/TELEGRAM_WEBHOOK_SETUP.md` (e.g., choose the channel/chat to receive alpha alerts).

- Direct sends (optional):
  - Set `ALPHA_ALERTS_DIRECT_SEND=true`.
  - Discord: supply `ALPHA_DISCORD_WEBHOOK`.
  - Telegram: supply `TELEGRAM_BOT_TOKEN` (or `ALPHA_TELEGRAM_BOT_TOKEN`) and `ALPHA_TELEGRAM_CHAT_ID`.
  - This bypasses the bots and posts straight to the webhook/chat.

## How it Works

- Nansen feed: pulls smart money buy signals and emits `caller_signal` alerts.
- Wallet fallback: `monitorAlphaCaller()` registers a Solana logs listener for each tracked wallet to catch signals even without Nansen.
- Quality filter: tokens are checked via RugCheck and DexScreener basics before alerting.

## Verifying

1) Start the server from `server/`:
```
pnpm start    # or: npm run start / yarn start
```
2) Watch logs for:
```
✅ Alpha alerts service started - callbacks handled by individual bots
```
3) If using direct sends, you’ll also see startup messages posted to your webhook/chat.

## Troubleshooting

- No alerts? Check that `ALPHA_ALERTS_ENABLED=true`, bots are running, and targets are set via bot commands.
- Telegram duplicates? Ensure `ALPHA_ALERTS_DIRECT_SEND` is false when using bots (default is off).
- Websocket reliability: use `HELIUS_API_KEY` or set both `ALPHA_HTTP_RPC` and `ALPHA_WS_RPC`.
- Nansen errors: unset `NANSEN_API_KEY` to disable or increase `NANSEN_POLL_INTERVAL_MS`.

## Minimal Variables Reference

- Required to enable: `ALPHA_ALERTS_ENABLED=true`
- Recommended for bots: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `TELEGRAM_BOT_TOKEN`
- Optional smart feed: `NANSEN_API_KEY`
- Optional direct sends: `ALPHA_ALERTS_DIRECT_SEND`, `ALPHA_DISCORD_WEBHOOK`, `ALPHA_TELEGRAM_CHAT_ID`
# Alpha Alerts

Real-time tracking of new tokens and smart money wallet buys.

## Enable

Set the environment flag so the service starts on boot:

```powershell
railway variables --set ALPHA_ALERTS_ENABLED=true
```

## RPC Endpoints

Alpha requires a WebSocket-capable Solana RPC for `onLogs` subscriptions.

Recommended configuration (either provider works):

- Explicit endpoints
  - `ALPHA_HTTP_RPC`: HTTPS endpoint for JSON-RPC calls
  - `ALPHA_WS_RPC`: WSS endpoint for WebSocket subscriptions
- Helius (auto-fills HTTP+WS)
  - `HELIUS_API_KEY`: Your Helius API key
- QuickNode (premium Solana RPC)
  - `QUICKNODE_RPC_URL`: HTTP endpoint
  - Optionally `QUICKNODE_WS_URL`; otherwise WS is derived automatically

Examples (PowerShell):

```powershell
# Explicit HTTP + WS (recommended)
railway variables --set ALPHA_HTTP_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/
railway variables --set ALPHA_WS_RPC=wss://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/

# Or use Helius (auto-config HTTP+WS)
railway variables --set HELIUS_API_KEY=<YOUR_HELIUS_KEY>
```

## Discord Commands (admin)

- `/alpha status` — Show service status
- `/alpha start` — Start monitoring
- `/alpha stop` — Stop monitoring
- `/alpha add <wallet> <name>` — Add wallet to monitor (auto-starts if stopped)
- `/alpha remove <wallet>` — Remove wallet
- `/alpha setchannel [#channel]` — Set alert channel (mentions @everyone)
- `/alpha where` — Show alert channel

Smart Money routing (admin):
- `/smart setchannel [#channel]` — Route smart calls to channel
- `/smart where` — Show channel

## Telegram Commands (admin)

- `alpha_status`, `alpha_start`, `alpha_stop`
- `alpha_add <wallet> <name>`, `alpha_remove <wallet>`
- `alpha_here`, `alpha_clear`, `alpha_channel`

Smart Money routing (admin):
- `smart_here`, `smart_clear`, `smart_channel`

## Notes

- Alpha auto-starts when you add the first wallet via `add` if it is not running.
- The service also listens to the pump.fun live feed and applies quality filters (RugCheck score, honeypot, liquidity) before alerting.
- Alerts are broadcast to configured Discord/Telegram targets (see `/alpha setchannel` / `alpha_here`).
