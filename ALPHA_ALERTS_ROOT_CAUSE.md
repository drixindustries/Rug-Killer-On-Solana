# 🚨 ALPHA ALERTS NOT WORKING - Root Cause Analysis

## Summary
**Alpha alerts are NOT triggering** due to missing webhook configuration. System is healthy but has no way to receive transaction notifications.

---

## 🔍 Issues Found

### 1. **CRITICAL: Discord Webhook Not Configured**
```
ALPHA_DISCORD_WEBHOOK: SET_ME  ❌ (placeholder, not real webhook)
ALPHA_ALERTS_DIRECT_SEND: true ✅
```

**Impact:** Alerts never reach Discord even if triggered.

**Fix Required:**
```bash
railway variables --set ALPHA_DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_ACTUAL_WEBHOOK_URL
```

To get Discord webhook URL:
1. Go to Discord server settings → Integrations → Webhooks
2. Create new webhook for #alpha-alerts channel
3. Copy webhook URL
4. Set environment variable

---

### 2. **CRITICAL: Helius Webhook Not Registered**
```
HELIUS_WEBHOOK_ID: undefined ❌
```

**Impact:** No real-time transaction monitoring - can't detect when alpha wallets buy tokens.

**Current State:**
- 25 wallets loaded: ✅
  ```
  [Alpha Alerts] Wallet 90p registered for webhook-based monitoring
  [Alpha Alerts] Wallet top1 registered for webhook-based monitoring
  ...25 total wallets
  ```
- Wallets registered locally: ✅
- BUT: **Helius has no webhook configured** to notify us when these wallets transact

**Fix Required:**

#### Option A: Set up Helius Webhook (Recommended)
```bash
# 1. Create webhook at https://dashboard.helius.dev/webhooks
# 2. Configure webhook to send to: https://rugkilleralphabot.fun/api/webhooks/helius
# 3. Add wallet addresses to monitor (25 wallets from database)
# 4. Set webhook ID:
railway variables --set HELIUS_WEBHOOK_ID=your_webhook_id_from_dashboard
```

#### Option B: Set up dRPC Webhook (Alternative)
```bash
# 1. Create webhook at https://drpc.org/webhooks
# 2. Configure webhook to send to: https://rugkilleralphabot.fun/api/webhooks/drpc
# 3. Add wallet addresses (25 wallets)
# 4. Set secret:
railway variables --set DRPC_WEBHOOK_SECRET=your_secret_key
```

---

### 3. **BUG FIXED: meteoraFilteredPercent Crash**
```
[HolderAnalysis] Helius fetch failed: ReferenceError: meteoraFilteredPercent is not defined
```

**Status:** ✅ FIXED - Added missing calculation in Helius method

---

## 📊 System Status

### ✅ Working Components
- Alpha alerts service: **Started**
- 25 smart wallets loaded from database
- Discord bot: **Online** (RugKillerAlphaBot#0760)
- Telegram bot: **Online**
- RPC balancer: **5/5 providers healthy**
- Temporal GNN detector: **Initialized**
- Migration detector: **Running**

### ❌ Not Working
- Discord webhook: **Placeholder URL** ("SET_ME")
- Helius webhook: **Not configured** (undefined)
- dRPC webhook: **Not configured**
- **Result: Zero alerts triggered in 12 hours**

---

## 🎯 Why No Alerts Detected

**Expected Flow:**
```
Alpha Wallet Buys Token
    ↓
Helius/dRPC Webhook Receives Transaction
    ↓
POST to https://rugkilleralphabot.fun/api/webhooks/helius
    ↓
Alpha Alert Service Processes
    ↓
Quality Check (TGN + heuristics)
    ↓
Send to ALPHA_DISCORD_WEBHOOK
    ↓
Alert Appears in Discord #alpha-alerts
```

**Actual Flow:**
```
Alpha Wallet Buys Token
    ↓
❌ No webhook configured - transaction never reaches our server
    ↓
❌ Alpha Alert Service never notified
    ↓
❌ No alerts triggered
```

---

## 🛠️ Complete Fix Checklist

### Step 1: Configure Discord Webhook
```bash
# Get webhook URL from Discord server settings
railway variables --set ALPHA_DISCORD_WEBHOOK=https://discord.com/api/webhooks/1234567890/abcdefghijk

# Verify
railway run -- node -e "console.log(process.env.ALPHA_DISCORD_WEBHOOK)"
```

### Step 2: Set Up Helius Webhook
1. Go to https://dashboard.helius.dev/webhooks
2. Click "Create Webhook"
3. Configure:
   - **URL:** `https://rugkilleralphabot.fun/api/webhooks/helius`
   - **Type:** Transaction
   - **Wallet Addresses:** Add all 25 wallets (see list below)
   - **Events:** TOKEN_TRANSFER, SWAP
4. Copy webhook ID
5. Set env var:
   ```bash
   railway variables --set HELIUS_WEBHOOK_ID=your_webhook_id_here
   ```

### Step 3: Test Alert System
```bash
# Send test alert to Discord
railway run -- node -e "
const { getAlphaAlertService } = require('./server/alpha-alerts.js');
const service = getAlphaAlertService();
await service.sendStartupTest('🧪 TEST: Alpha alerts are now configured!');
"
```

### Step 4: Monitor for Real Alerts
```bash
# Watch logs for alert triggers
railway logs --tail 100 | Select-String "ALPHA ALERT|caller.*bought"
```

---

## 📋 25 Monitored Wallets

These wallets are loaded and ready, just need webhook configuration:

```
1.  90p         - GLjXK7H8...
2.  top1        - EJvokC7v...
3.  top2        - GnVdeU72...
4.  top3        - GwyG5FQR...
5.  top4        - C3nLTNMK...
6.  top16       - 78N177fz...
7.  top24       - AtvnQYaJ...
8.  top26       - 6RTjXExc...
9.  top28       - HRo7vREJ...
10. top32       - 57GyUSKi...
11. top44       - 9x61A7J5...
12. top46       - 8iLrmsxY...
13. top48       - k9bwi68P...
14. top53       - BtMBMPko...
15. top53       - DAFiYe1D...
16. top57       - 8xMqAo5H...
17. top59       - D6nUhQ7o...
18. top 62      - 4qyYcBA8...
19. top64       - GgDGFZzr...
20. top 71      - 9KLJMsoe...
21. top75       - 8deJ9xeU...
22. top66       - ESwdWuCT...
23. top 85      - 215nhcAH...
24. top 89      - 95nrZPWV...
25. Gake        - DNfuF1L6...
```

All 25 wallets need to be added to Helius webhook configuration.

---

## 🔧 Quick Fix Commands

```bash
# 1. Set Discord webhook
railway variables --set ALPHA_DISCORD_WEBHOOK=YOUR_ACTUAL_DISCORD_WEBHOOK_URL

# 2. Set Helius webhook ID (after creating on dashboard)
railway variables --set HELIUS_WEBHOOK_ID=YOUR_HELIUS_WEBHOOK_ID

# 3. Redeploy to apply changes
git add -A
git commit -m "Fix alpha alerts webhook configuration"
git push origin main

# 4. Wait for Railway auto-deploy (~30s)

# 5. Test
railway run -- node -e "require('./server/alpha-alerts.js').getAlphaAlertService().sendStartupTest()"
```

---

## ✅ Expected Logs After Fix

```
[Alpha Alerts] ✅ Service started using webhook-based monitoring
[Alpha Alerts] Registered 25 wallets for tracking
[Helius Webhook] ✅ HTTP-based monitoring active
[Helius Webhook] New transaction from monitored wallet: GLjXK7H8...
[Alpha Alerts] 🎯 Caller Signal: 90p bought Do6N8m8ssowyAvXs2tkGKkJ8vaNC8H5oRkMdr9shpump
[Alpha Alerts] Running quality check...
[Alpha Alerts] ✅ Quality token detected - sending alert
[ALPHA ALERTS] 🚀 Sending alert to Discord webhook
[ALPHA ALERTS] ✅ Alert sent successfully
```

---

## 📖 Related Documentation

- `ALPHA_ALERTS_FIX.md` - Previous fix attempts
- `ALPHA_ALERTS_TROUBLESHOOTING.md` - Debugging guide
- `docs/STREAMS_WEBHOOKS.md` - Webhook setup guide
- `server/services/helius-webhook.ts` - Webhook implementation
- `server/alpha-alerts.ts` - Alert service logic

---

## 💡 Prevention

Add health check to verify webhook configuration on startup:

```typescript
// In alpha-alerts.ts start() method
if (!process.env.ALPHA_DISCORD_WEBHOOK || process.env.ALPHA_DISCORD_WEBHOOK === 'SET_ME') {
  console.error('❌ [Alpha Alerts] ALPHA_DISCORD_WEBHOOK not configured! Alerts will not be sent.');
}

if (!process.env.HELIUS_WEBHOOK_ID) {
  console.warn('⚠️ [Alpha Alerts] HELIUS_WEBHOOK_ID not set - no real-time monitoring');
}
```

This will make configuration issues obvious in logs.
