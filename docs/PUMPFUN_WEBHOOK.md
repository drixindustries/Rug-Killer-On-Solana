# Pump.fun Live Webhook Integration

## Overview

The Rug Killer platform now includes real-time auto-scanning of all new Pump.fun token launches through WebSocket integration.

## Features

### ✅ Live Pump.fun Webhook
- **Auto-scans every new token** launched on Pump.fun
- **Real-time WebSocket connection** to Pump.fun API
- **Automatic reconnection** with exponential backoff
- **Background processing** with event-driven architecture

### ✅ React Dashboard
- **Real-time scan history** with WebSocket updates
- **Search & filter** by symbol, name, or contract address
- **Grade badges**: Diamond, Gold, Silver, Bronze, Red Flag
- **Stats dashboard**: Total scans, avg risk score, honeypot count, whale alerts

### ✅ Smart Insights
- **Professional messaging** based on risk score
- **Whale accumulation alerts** with CEX wallet filtering
- **Bundle detection warnings** with confidence scores
- **Honeypot detection** with instant alerts

### ✅ Database Integration
- **Scan history storage** (last 100 scans)
- **PostgreSQL** with Drizzle ORM
- **Indexed queries** for fast retrieval
- **Analytics & statistics** API endpoints

## Architecture

```
┌─────────────────┐
│  Pump.fun API   │
│  (WebSocket)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PumpFunWebhook  │ ← Listens for new_token events
│    Service      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TokenAnalyzer   │ ← Full 52-metric scan
│    Service      │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│  Scan History   │  │ WebSocket    │
│   (Database)    │  │ Broadcast    │
└─────────────────┘  └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ React Client │
                     │  Dashboard   │
                     └──────────────┘
```

## Installation & Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Pump.fun Webhook
ENABLE_PUMPFUN_WEBHOOK=true
PUMP_FUN_WS_URL=wss://pumpportal.fun/api/data

# Database (automatically provided by Railway PostgreSQL)
DATABASE_URL=postgresql://...
```

### 2. Database Migration

Run migration to create scan_history table:

```bash
npm run db:push
```

This creates:
- `scan_history` table with indexes
- Stores: tokenAddress, symbol, riskScore, grade, whaleCount, etc.
- Auto-cleanup of old scans (keeps last 100)

### 3. Start the Server

```bash
npm run dev
```

The WebSocket service will:
- Connect to Pump.fun API
- Listen for `new_token` events
- Auto-scan each token
- Broadcast results to connected clients
- Save to database

## API Endpoints

### GET /api/scan-history
Get recent scan history

**Query Parameters:**
- `limit` (default: 50) - Number of scans to return
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "scans": [
    {
      "id": 123,
      "tokenAddress": "7xKj...9pL2",
      "symbol": "BARK",
      "riskScore": 92,
      "grade": "Diamond",
      "whaleCount": 1,
      "bundleScore": 15,
      "honeypotDetected": false,
      "insight": "Institutional-grade safety. LP locked, mint revoked.",
      "scannedAt": "2025-11-15T10:30:00Z"
    }
  ]
}
```

### GET /api/scan-stats
Get aggregate statistics

**Response:**
```json
{
  "totalScans": 1234,
  "avgRiskScore": 67,
  "honeypotCount": 45,
  "whaleDetectedCount": 234
}
```

### GET /api/live-scan/status
Get WebSocket connection status

**Response:**
```json
{
  "connected": true,
  "clientCount": 5,
  "pumpFunStatus": {
    "connected": true,
    "reconnectAttempts": 0,
    "wsUrl": "wss://pumpportal.fun/api/data"
  }
}
```

### WebSocket: /api/live-scans
Real-time scan feed

**Messages:**
```javascript
// Scan complete
{
  "type": "scan_complete",
  "data": {
    "tokenAddress": "...",
    "symbol": "BARK",
    "riskScore": 92,
    "grade": "Diamond",
    "whaleCount": 1,
    "insight": "...",
    "timestamp": 1700000000000
  },
  "timestamp": 1700000000000
}

// Status update
{
  "type": "status_update",
  "data": {
    "pumpFunConnected": true,
    "clientCount": 5
  },
  "timestamp": 1700000000000
}
```

## Frontend Integration

### 1. Navigate to Live Scans

```
https://your-domain.com/live-scans
```

### 2. WebSocket Connection

The dashboard automatically:
- Connects to `/api/live-scans` WebSocket
- Receives real-time scan updates
- Displays in card grid format
- Allows search & filtering

### 3. Search & Filter

- **Search**: By symbol, name, or contract address
- **Filters**:
  - All: Show all scans
  - Safe: Risk score ≥ 75
  - Risky: Risk score < 60
  - Honeypots: Honeypot detected = true

## Grade System

| Grade | Risk Score | Color | Meaning |
|-------|-----------|-------|---------|
| 💎 Diamond | 90-100 | Blue-Purple | Institutional-grade safety |
| 🥇 Gold | 75-89 | Yellow-Orange | Good risk profile |
| 🥈 Silver | 60-74 | Gray | Moderate risk |
| 🥉 Bronze | 40-59 | Orange-Red | High risk |
| 🚨 Red Flag | 0-39 | Red | Extreme risk |

## Insights Examples

### Diamond (90+)
> 💎 Institutional-grade safety. LP locked, mint revoked, no whale accumulation. Strong fundamentals.

### Gold (75-89)
> ✅ Good risk profile. Standard precautions apply - set stop-losses and monitor liquidity.

### Silver (60-74)
> 🟡 Moderate risk. Some concerning metrics detected. Only invest what you can afford to lose.

### Bronze (40-59)
> 🟠 High risk token. Not recommended for investment.

### Red Flag (0-39)
> 🔴 EXTREME RISK - Multiple red flags detected. Strong rug pull indicators. Avoid.

### Honeypot Alert
> 🚨 HONEYPOT DETECTED - Cannot sell tokens. Avoid at all costs.

## Deployment to Railway

### 1. Push to GitHub

```bash
git add .
git commit -m "Add Pump.fun webhook integration"
git push origin main
```

### 2. Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 3. Add PostgreSQL

1. Click "New" → "Database" → "PostgreSQL"
2. Railway automatically sets `DATABASE_URL`

### 4. Set Environment Variables

In Railway dashboard → Variables:

```
NODE_ENV=production
ENABLE_PUMPFUN_WEBHOOK=true
PUMP_FUN_WS_URL=wss://pumpportal.fun/api/data
```

### 5. Deploy

Railway automatically:
- Detects Node.js project
- Runs `npm install && npm run build`
- Starts server with `npm start`
- Enables WebSocket support

### 6. Database Migration

In Railway terminal:

```bash
npm run db:push
```

## Monitoring

### Check WebSocket Status

```bash
curl https://your-app.railway.app/api/live-scan/status
```

### View Scan History

```bash
curl https://your-app.railway.app/api/scan-history?limit=10
```

### WebSocket Test (Browser Console)

```javascript
const ws = new WebSocket('wss://your-app.railway.app/api/live-scans');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Performance

- **Auto-reconnect**: Exponential backoff (5s, 10s, 20s, ...)
- **Heartbeat**: 30-second ping/pong
- **Scan queue**: Background processing
- **Database**: Indexed queries < 10ms
- **WebSocket**: Broadcast to multiple clients
- **Memory**: Auto-cleanup old scans

## Troubleshooting

### WebSocket Not Connecting

1. Check `ENABLE_PUMPFUN_WEBHOOK=true`
2. Verify `PUMP_FUN_WS_URL` is correct
3. Check Railway logs for connection errors
4. Ensure port/firewall allows WebSocket

### No Scans Appearing

1. Check Pump.fun API status
2. Verify database connection
3. Check `/api/live-scan/status` endpoint
4. Review server logs for errors

### Scans Not Broadcasting

1. Check WebSocket client count > 0
2. Verify frontend WebSocket connection
3. Check browser console for errors
4. Test with WebSocket test script

## Future Enhancements

- [ ] Telegram/Discord alerts for high-grade tokens
- [ ] Email notifications for honeypots
- [ ] Advanced filters (LP burn %, whale threshold)
- [ ] Historical charts & analytics
- [ ] Token comparison tool
- [ ] Smart money tracking integration
- [ ] Portfolio auto-tracking from scans

## Support

For issues or questions:
- GitHub Issues: https://github.com/drixindustries/Rug-Killer-on-Solana
- Discord: [Your Discord Link]
- Telegram: [Your Telegram Link]

## License

MIT License - See LICENSE file for details

---

Built with ❤️ by the Rug Killer team
