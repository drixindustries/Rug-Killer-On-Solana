# Environment Variable Updates - Remove Ankr References

## Required Changes on Railway

### Remove or Update These Environment Variables:

1. **ALPHA_HTTP_RPC** (if set)
   - Current: Likely points to `https://rpc.ankr.com/premium-http/solana_mainnet/...`
   - Action: **DELETE** this variable (let system use RPC balancer with Helius)
   - OR Update to: Leave empty or remove entirely

2. **ANKR_API_KEY** (optional)
   - Action: Can **DELETE** since quota is exhausted
   - System will skip Ankr automatically if key is missing

### How to Update on Railway:

1. Go to Railway dashboard
2. Select your project
3. Click on "Variables" tab
4. Find `ALPHA_HTTP_RPC`
5. Click the trash icon to delete it
6. Redeploy

### Why This Fixes the Errors:

**Current Issue:**
```
[Alpha Alerts] Using explicit HTTP RPC override
[Alpha Alerts] HTTP-only RPC initialized: https://rpc.ankr.com/premium-http/solana_mainnet/3...
```

Then later:
```
[TGN] Graph build error: Error: 401 Unauthorized: API key disabled, reason: Freemium monthly quota exhausted
```

**After Fix:**
```
[Alpha Alerts] Using RPC balancer - selected Helius
[Alpha Alerts] HTTP-only RPC initialized: https://mainnet.helius-rpc.com/?api-key=...
```

### Verification After Redeploy:

Look for these logs:
```
✅ [Alpha Alerts] Using RPC balancer - selected Helius
✅ [RPC Balancer] Selected Helius (premium) - score: 100
✅ Discord bot logged in as RugKillerAlphaBot#0760
✅ Successfully reloaded Discord application (/) commands
```

Should NOT see:
```
❌ [TGN] Graph build error: Error: 401 Unauthorized
❌ Discord bot not loaded (silenced): "await" can only be used inside an "async" function
```

## GMGN API Error (Non-Critical)

The `[GMGN] API error: invalid argument` is a non-critical API call failure. GMGN is a third-party analytics service used for additional token data. This error doesn't break functionality - the system falls back to other data sources.

Can be safely ignored or the GMGN integration can be disabled if it continues.
