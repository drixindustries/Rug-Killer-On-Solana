# Pump.fun WebSocket 403 Error Fix

## 🔴 Problem

Logs show constant `ws error: Unexpected server response: 403` from Pump Portal WebSocket:

```
[err] ws error: Unexpected server response: 403
[err] ws error: Unexpected server response: 403
[err] ws error: Unexpected server response: 403
```

## 🎯 Root Cause

**Pump Portal** (`wss://pumpportal.fun/api/data`) has changed to **require authentication** or has **rate-limited/blocked your IP** due to excessive connection attempts.

Your bot was trying to reconnect every 10 seconds infinitely, causing more 403 errors.

## ✅ Solution Implemented

### 1. **Better Error Handling**
- Detects 403 errors specifically
- Logs clear warning: "Authentication required or IP blocked"
- Stops aggressive reconnection on 403

### 2. **Exponential Backoff**
- Reconnect delays: 5s → 10s → 20s → 30s (max)
- Max 5 reconnect attempts (was infinite)
- If 403 detected, waits 5 minutes before retry

### 3. **Disable Option**
Add to Railway environment variables:
```bash
ENABLE_PUMPFUN_MONITOR=false
```

This completely disables pump.fun WebSocket (you still get tokens via Helius webhook).

## 🚀 Quick Fix Options

### Option 1: Disable Pump.fun Monitoring (Recommended)

Since you already have **Helius webhook** detecting new tokens, pump.fun is redundant.

**Railway Dashboard:**
1. Go to your service → Variables
2. Add: `ENABLE_PUMPFUN_MONITOR=false`
3. Redeploy

**Result:** 403 errors stop immediately, you still get all tokens via Helius.

---

### Option 2: Get Pump Portal API Key

If you need pump.fun specifically:

1. Contact **pumpportal.fun** or check their docs for API access
2. They may have introduced paid/authenticated WebSocket access
3. Add API key to connection (if they provide one)

**Check their status:**
- Website: https://pumpportal.fun
- API docs: https://docs.pumpportal.fun (if exists)
- Discord/Telegram: Ask about 403 errors

---

### Option 3: Use Alternative Endpoints

Some alternatives to pump.fun WebSocket:

1. **Pump.fun API (REST)**: Poll their API instead of WebSocket
2. **Helius Webhooks**: Already implemented ✅
3. **QuickNode Streams**: Already configured ✅
4. **DexScreener API**: Detects new token pairs

---

## 📊 Current Status

**After this fix:**
- ✅ 403 errors logged with clear explanation
- ✅ Stops spamming reconnection attempts
- ✅ Can be completely disabled via env var
- ✅ Fallback to Helius webhook for token detection

**Your token detection still works via:**
1. ✅ Helius webhook (real-time)
2. ✅ QuickNode streams (if configured)
3. ✅ Manual scans via API
4. ❌ Pump.fun WebSocket (403 blocked)

---

## 🔍 Verify Fix

**Check logs after redeploying:**

Before (spammy):
```
[err] ws error: Unexpected server response: 403
[err] ws error: Unexpected server response: 403
[err] ws error: Unexpected server response: 403
```

After (clean):
```
[inf] [Alpha Alerts] Pump.fun WebSocket closed: 1006
[inf] [Alpha Alerts] Reconnecting to pump.fun in 5s (attempt 1/5)
[err] [Alpha Alerts] ❌ Pump.fun 403 - Authentication required or IP blocked
[inf] [Alpha Alerts] Skipping pump.fun reconnect - recent 403 error (auth required)
```

Or if disabled:
```
[inf] [Alpha Alerts] Pump.fun monitoring disabled (ENABLE_PUMPFUN_MONITOR=false)
```

---

## 💡 Recommendation

**Disable pump.fun monitoring** by setting `ENABLE_PUMPFUN_MONITOR=false` because:

1. ✅ You already have Helius webhook (better coverage)
2. ✅ Stops 403 error spam in logs
3. ✅ Saves bandwidth and connection resources
4. ✅ No functionality loss (Helius catches all new tokens)

---

## 🛠️ Technical Details

**Files Modified:**
- `server/alpha-alerts.ts` - Added 403 detection, backoff, disable option
- `server/services/pumpfun-webhook.ts` - Better error messages

**New Logic:**
```typescript
// Detects 403 and stops reconnecting
if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
  this.last403Error = Date.now();
  console.error('[Alpha Alerts] ❌ Pump.fun 403 - Authentication required');
  ws.close();
  this.pumpFunReconnectAttempts = this.maxPumpFunReconnects;
}

// Exponential backoff: 5s, 10s, 20s, 30s
const backoff = Math.min(30000, 5000 * Math.pow(2, attempts - 1));
```

---

## ✅ Action Items

1. **Add env var to Railway:**
   ```
   ENABLE_PUMPFUN_MONITOR=false
   ```

2. **Redeploy service**

3. **Check logs** - 403 errors should stop

4. **Verify token detection still works** via Helius webhook

---

## 📞 Support

If 403 errors persist after disabling pump.fun:
- Check other WebSocket connections in logs
- Verify Ankr API key isn't causing other 403s
- Consider IP unblocking if you need pump.fun access

**Pump Portal Support:**
- Check if they have Discord/Telegram for API access
- May need to pay for authenticated WebSocket access
- Or wait for IP ban to expire (usually 24hrs)
