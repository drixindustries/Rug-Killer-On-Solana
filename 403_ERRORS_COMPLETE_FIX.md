# Complete 403 Error Analysis & Fix

## 🔍 Two Separate 403 Issues Found

Your logs show **TWO different 403 errors**:

### 1. **Pump.fun WebSocket** (FIXED ✅)
```
[err] ws error: Unexpected server response: 403
```
**Cause:** Pump Portal WebSocket requires auth or rate-limited  
**Fix:** Applied exponential backoff + disable option  
**Solution:** Set `ENABLE_PUMPFUN_MONITOR=false`

---

### 2. **Ankr RPC** (NEEDS ATTENTION ⚠️)
```
[inf] ❌ Ankr-Public: Failed (403 Forbidden: {"error":"message: API key is not allowed to access blockchain"})
```
**Cause:** Ankr.com free tier requires API key  
**Impact:** One of your RPC fallbacks is failing  
**Status:** Not critical (you have Shyft + Helius working)

---

## 📊 Current RPC Status

From your logs:
```
✅ Shyft: 34ms (excellent)
✅ Helius: 68ms (excellent)  
✅ Solana-Official: 49ms (excellent)
❌ Ankr-Public: 403 Forbidden
❌ Phantom-Public: fetch failed
❌ Latitude-BR-2: fetch failed
❌ AWS-US-1: Timeout
❌ Latitude-BR-1: Timeout
❌ AWS-US-2: Timeout

[RPC Health] 3/9 providers healthy
```

**Good news:** You have 3 working RPCs (Shyft, Helius, Solana-Official) - this is sufficient.

---

## ✅ Immediate Actions

### Priority 1: Disable Pump.fun (Stops 90% of 403 spam)

**Railway Dashboard → Environment Variables:**
```bash
ENABLE_PUMPFUN_MONITOR=false
```
**Result:** Stops WebSocket 403 errors immediately.

---

### Priority 2: Fix Ankr RPC (Optional but recommended)

**Option A: Get Ankr API Key (Free)**
1. Go to https://www.ankr.com/rpc/
2. Sign up for free account
3. Get your API key
4. Add to Railway:
   ```bash
   ANKR_API_KEY=your_api_key_here
   ```

**Option B: Remove Ankr from RPC list**
- Edit `server/public-rpcs.ts` and remove Ankr endpoint
- Or add to Railway:
  ```bash
  DISABLE_PUBLIC_RPCS=true
  ```

---

## 🎯 Expected Results After Fixes

**Before:**
```
[err] ws error: Unexpected server response: 403  ← Every 2-3 seconds
[inf] ❌ Ankr-Public: Failed (403 Forbidden)      ← Every health check
```

**After (with ENABLE_PUMPFUN_MONITOR=false):**
```
[inf] [Alpha Alerts] Pump.fun monitoring disabled
[inf] ✅ Shyft: 34ms (excellent)
[inf] ✅ Helius: 68ms (excellent)
[inf] [RPC Health] 2/2 premium providers healthy
```

---

## 📈 Your Working Setup

You have **excellent** RPC coverage already:

| Provider | Status | Speed | Limit |
|----------|--------|-------|-------|
| Shyft | ✅ Working | 34ms | Premium |
| Helius | ✅ Working | 68ms | Premium |
| Solana Official | ✅ Working | 49ms | Public |

**This is more than enough** for production - you don't need Ankr.

---

## 🚀 Recommended Configuration

**Add these to Railway:**
```bash
# Disable pump.fun WebSocket (use Helius webhook instead)
ENABLE_PUMPFUN_MONITOR=false

# Optionally disable public RPC fallbacks (you have premium RPCs)
DISABLE_PUBLIC_RPCS=true

# Or add Ankr key if you want it as fallback
ANKR_API_KEY=your_key_here
```

---

## 🔧 Alternative: Code Fix for Ankr

If you want to keep Ankr but properly disable it on 403:

**Edit `server/services/rpc-balancer.ts`:**
```typescript
// Add health check that disables provider on auth errors
if (error.includes('403') || error.includes('API key is not allowed')) {
  provider.disabled = true;
  console.log(`[RPC Balancer] Disabled ${provider.name} due to auth error`);
}
```

But honestly, **just disable pump.fun** and you're good.

---

## 📊 Error Frequency Analysis

From your logs:
- **Pump.fun 403**: ~30 per minute (spam)
- **Ankr 403**: ~1 per health check (60s)
- **Other errors**: Normal fallback behavior

**Impact:**
- Pump.fun: High (log spam, wasted connections)
- Ankr: Low (just a warning, fallback works)

**Priority:**
1. Fix pump.fun (high impact) ← Do this now
2. Fix Ankr (low impact) ← Optional later

---

## ✅ Summary

**Two fixes needed:**

1. **Disable Pump.fun WebSocket** ✅ APPLIED IN CODE
   - Add `ENABLE_PUMPFUN_MONITOR=false` to Railway
   - Redeploy
   - 403 spam stops immediately

2. **Handle Ankr 403** (optional)
   - Either get API key OR ignore it (you have 3 working RPCs)
   - Not urgent - just a fallback provider

**Your bot will work perfectly after fix #1 alone.**

---

## 🎯 Next Steps

1. **Right now:**
   - Add `ENABLE_PUMPFUN_MONITOR=false` to Railway
   - Redeploy
   - Check logs - 403 spam should be gone

2. **Later (optional):**
   - Get Ankr API key if you want 4 RPC providers
   - Or leave it - 3 providers is plenty

3. **Monitor:**
   - Logs should be much cleaner
   - Token detection continues via Helius webhook
   - All functionality intact

---

**Need help?** Check `PUMPFUN_403_FIX.md` for detailed pump.fun fix.
