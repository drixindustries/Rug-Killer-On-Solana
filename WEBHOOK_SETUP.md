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

### 2. QuickNode Streams

**Features:**
- Account monitoring
- Transaction filtering
- Function call tracking
- Ultra-low latency (~200ms)

**Setup:**
1. Get stream URL from [QuickNode](https://quicknode.com)
2. Add to environment:
   ```bash
   QUICKNODE_STREAM_URL=your_stream_url
   QUICKNODE_STREAM_ID=your_stream_id
   AUTO_ANALYZE_NEW_TOKENS=true
   ```

**Webhook Endpoint:**
- URL: `https://your-domain.com/api/webhooks/quicknode`
- Method: POST
- Configure in QuickNode dashboard

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

# QuickNode
QUICKNODE_RPC_URL=https://your-quicknode-endpoint.com
QUICKNODE_STREAM_URL=https://your-stream-url.com
QUICKNODE_STREAM_ID=your_stream_id
QUICKNODE_WEBHOOK_SECRET=optional_webhook_secret

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
  "quicknode": {
    "isActive": true,
    "hasStreamUrl": true,
    "processedCount": 567
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
import { quickNodeWebhook } from './services/quicknode-webhook';

// Listen for new tokens
heliusWebhook.on('token_created', async (event) => {
  console.log('New token:', event.mint);
  // Your custom logic here
});

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
QUICKNODE_WEBHOOK_SECRET=your_secret_key
```

The webhook handlers will verify signatures from the headers:
- Helius: `x-helius-signature`
- QuickNode: `x-qn-signature`

## Performance

| Provider | Latency | Rate Limit | Cost |
|----------|---------|------------|------|
| Helius WebSocket | ~100ms | 1000 req/min | Paid tier required |
| QuickNode Streams | ~200ms | Based on plan | Paid tier required |
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
- Upgrade to premium tier on Helius/QuickNode

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

The webhook URLs will be:
```
https://your-railway-app.up.railway.app/api/webhooks/helius
https://your-railway-app.up.railway.app/api/webhooks/quicknode
```

Configure these URLs in your Helius/QuickNode dashboards.

## Support

For issues or questions:
- GitHub: https://github.com/drixindustries/Rug-Killer-On-Solana
- Docs: /docs folder in repository
