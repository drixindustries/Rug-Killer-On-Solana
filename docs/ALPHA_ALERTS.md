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
- Ankr
  - `ANKR_API_KEY` or `ANKR_RPC_URL`: HTTP
  - Optionally `ANKR_WS_URL`; otherwise WS is derived automatically

Examples (PowerShell):

```powershell
# Explicit HTTP + WS (recommended)
railway variables --set ALPHA_HTTP_RPC=https://rpc.ankr.com/premium-http/solana_mainnet/<API_KEY>
railway variables --set ALPHA_WS_RPC=wss://rpc.ankr.com/premium-ws/solana_mainnet/<API_KEY>

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
