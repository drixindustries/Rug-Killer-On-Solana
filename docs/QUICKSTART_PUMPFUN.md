# Quick Start: Pump.fun Live Webhook

## 🚀 Get Started in 3 Steps

### Step 1: Set Environment Variable

Add to `.env`:

```bash
ENABLE_PUMPFUN_WEBHOOK=true
```

### Step 2: Run Database Migration

```bash
npm run db:push
```

Or manually run:

```bash
psql $DATABASE_URL -f migrations/add_scan_history_table.sql
```

### Step 3: Start the Server

```bash
npm run dev
```

✅ **That's it!** The webhook will:
- Auto-connect to Pump.fun
- Scan every new token
- Broadcast to live dashboard
- Save to database

## 📊 View Live Scans

Navigate to:

```
http://localhost:5000/live-scans
```

## 🔌 WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:5000/api/live-scans');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'scan_complete') {
    console.log('New scan:', message.data);
    // {
    //   tokenAddress: "7xKj...9pL2",
    //   symbol: "BARK",
    //   riskScore: 92,
    //   grade: "Diamond",
    //   whaleCount: 1,
    //   insight: "Institutional-grade safety..."
    // }
  }
};
```

## 🛠️ API Endpoints

### Get Recent Scans

```bash
curl http://localhost:5000/api/scan-history?limit=10
```

### Get Statistics

```bash
curl http://localhost:5000/api/scan-stats
```

### Check Status

```bash
curl http://localhost:5000/api/live-scan/status
```

## 🎯 Features Enabled

✅ Real-time Pump.fun webhook  
✅ Auto-scan on token launch  
✅ WebSocket broadcast  
✅ Database storage (100 scans)  
✅ Live dashboard  
✅ Search & filter  
✅ Whale detection  
✅ Honeypot alerts  
✅ Bundle detection  
✅ Smart insights  

## 🔧 Disable Webhook

Set in `.env`:

```bash
ENABLE_PUMPFUN_WEBHOOK=false
```

Restart server. All other features continue working.

## 📖 Full Documentation

See: `docs/PUMPFUN_WEBHOOK.md`

---

**Questions?** Check the main documentation or open an issue.
