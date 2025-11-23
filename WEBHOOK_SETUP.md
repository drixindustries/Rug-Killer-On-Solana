# Webhook Integration Guide

This guide explains how to set up and use webhooks for real-time token monitoring.

## Overview

Webhook services provide instant notifications when:
- New tokens are created
- Large transactions occur
- DEX trades happen
- Smart money wallets make moves

## Supported Providers

### 1. Helius Enhanced WebSockets

**Features:**
- Real-time transaction monitoring
- Token creation detection
- Smart money tracking
- Low latency (~100ms)

**Setup:**
1. Get API key from [Helius](https://helius.dev)
2. Add to environment:
   ```bash
   HELIUS_API_KEY=your_api_key_here
   AUTO_ANALYZE_NEW_TOKENS=true  # Optional: auto-analyze detected tokens
   ```

**Webhook Endpoint:**
- URL: `https://your-domain.com/api/webhooks/helius`
- Method: POST
- Configure in Helius dashboard

### 2. Ankr WebSocket Monitoring

**Features:**
- Real-time Pump.fun program monitoring
- Alpha wallet activity tracking
- Token creation detection via RPC WebSocket
- Low latency (~50-100ms)
- Persistent WebSocket connections reduce API overhead

**Setup:**
1. Get API key from [Ankr](https://www.ankr.com/)
2. Add to environment:
   ```bash
   ANKR_API_KEY=your_ankr_api_key
   ```

**How it works:**
- Monitors Pump.fun program (6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P) for new token launches
- Subscribes to individual alpha wallet addresses for real-time trade detection
- Uses Solana's native WebSocket RPC (accountSubscribe, logsSubscribe)
- Automatically connects when ANKR_API_KEY is set

**Events Emitted:**
- `token_created` - New token detected on Pump.fun
- `alpha_wallet_trade` - Monitored wallet makes a trade
- `wallet_activity` - Account changes for subscribed wallets

### 3. Pump.fun WebSocket

**Features:**
- Real-time Pump.fun token launches
- Graduation events
- Bonding curve updates

**Setup:**
Already configured! Uses WebSocket connection (no HTTP webhook needed).

```bash
PUMP_FUN_WS_URL=wss://pumpportal.fun/api/data  # Default
```

## Environment Variables

```bash
# Helius
HELIUS_API_KEY=your_helius_api_key
HELIUS_WEBHOOK_SECRET=optional_webhook_secret

# Ankr
ANKR_API_KEY=your_ankr_api_key

# Pump.fun
PUMP_FUN_WS_URL=wss://pumpportal.fun/api/data

# Features
AUTO_ANALYZE_NEW_TOKENS=true  # Auto-analyze detected tokens
```

## Testing Webhooks

### Health Check
```bash
curl https://your-domain.com/api/webhooks/health
```

Response:
```json
{
  "helius": {
    "isMonitoring": true,
    "hasApiKey": true,
    "processedCount": 1234
  },
  "ankr": {
    "isConnected": true,
    "activeSubscriptions": 15,
    "monitoredWallets": 12
  },
  "pumpfun": {
    "isConnected": true,
    "reconnectAttempts": 0
  }
}
```

### Test Endpoint (Development Only)
```bash
curl -X POST https://your-domain.com/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Event Listeners

You can listen to webhook events in your code:

```typescript
import { heliusWebhook } from './services/helius-webhook';
import { ankrWebSocket } from './services/ankr-websocket';

// Listen for new tokens via Helius
heliusWebhook.on('token_created', async (event) => {
  console.log('New token:', event.mint);
  // Your custom logic here
});

// Listen for new tokens via Ankr WebSocket
ankrWebSocket.on('token_created', async (event) => {
  console.log('New token via Ankr:', event.mint);
  await yourAutoScanFunction(event.mint);
});

// Listen for alpha wallet activity
ankrWebSocket.on('alpha_wallet_trade', async (event) => {
  console.log('Alpha trade:', event.wallet, '→', event.mint);
  // Alert your users about alpha activity
});

// Subscribe to specific wallets
await ankrWebSocket.subscribeToWallet('YourAlphaWalletAddress...');
await ankrWebSocket.subscribeToAlphaWallets([
  'wallet1...',
  'wallet2...',
  'wallet3...'
]);

// Listen for large transfers
heliusWebhook.on('large_transfer', async (event) => {
  console.log('Whale movement:', event.mint, event.amount);
});

// Listen for completed analysis
heliusWebhook.on('token_analyzed', async (event) => {
  console.log('Analysis:', event.analysis.riskLevel);
});
```

## Webhook Security

### Signature Verification (Recommended)

Set webhook secrets:
```bash
HELIUS_WEBHOOK_SECRET=your_secret_key
```

The webhook handlers will verify signatures from the headers:
- Helius: `x-helius-signature`

## Performance

| Provider | Latency | Rate Limit | Cost |
|----------|---------|------------|------|
| Ankr WebSocket | ~50-100ms | 500 req/min | Paid tier required |
| Helius WebSocket | ~100ms | 1000 req/min | Paid tier required |
| Pump.fun WebSocket | ~500ms | Unlimited | Free |
| 80+ Public RPCs | 1-3s | Varies | Free |

## Troubleshooting

### Webhooks not receiving events

1. Check service status:
   ```bash
   curl https://your-domain.com/api/webhooks/health
   ```

2. Verify environment variables are set
3. Check Railway/hosting logs for errors
4. Ensure webhook URL is publicly accessible

### Rate limiting

If hitting rate limits:
- Use multiple RPC endpoints (80+ configured)
- Enable webhook monitoring to reduce polling
- Upgrade to premium tier on Helius

### Connection issues

Pump.fun WebSocket will auto-reconnect. Check logs for:
```
[PumpFun] WebSocket connected
[PumpFun] Subscribed to events: ["new_token", "graduation"]
```

## Best Practices

1. **Use webhooks for real-time, polling for backfill**: Webhooks catch new events instantly, but use the RPC balancer for historical data
2. **Enable AUTO_ANALYZE_NEW_TOKENS**: Automatically scan new tokens as they're created
3. **Monitor webhook health**: Set up alerts if webhook services go down
4. **Use signature verification**: Prevent spoofed webhook calls
5. **Implement rate limiting**: Protect your endpoints from abuse

## Railway Deployment

Webhooks work automatically on Railway! Just set the environment variables and deploy.

The webhook URL will be:
```
https://your-railway-app.up.railway.app/api/webhooks/helius
```

Configure this URL in your Helius dashboard.

## Support

For issues or questions:
- GitHub: https://github.com/drixindustries/Rug-Killer-On-Solana
- Docs: /docs folder in repository
