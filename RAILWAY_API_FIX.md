# Railway Environment Variable Fixes

## ❌ REMOVE These Invalid Variables (Causing 401/403 Errors):

1. **HELIUS_API_KEY** or any HELIUS_* variables
   - Status: Invalid API key (401 errors in logs)
   - Action: DELETE from Railway

## ✅ VERIFY These Are Valid:

2. **QUICKNODE_RPC_URL**
   - Current: Should be MAINNET (not devnet)
   - Check: URL should contain `solana-mainnet` NOT `solana-devnet`
   - Example: `https://xxx.solana-mainnet.quiknode.pro/...`

3. **ALCHEMY_KEY**
   - Current: Causing some 403 Forbidden errors
   - Check: Verify key has blockchain access enabled
   - Get new key: https://dashboard.alchemy.com/

4. **SHYFT_KEY**
   - Verify it's valid for mainnet

## 🆕 ADD These Critical Keys:

5. **BIRDEYE_API_KEY** (CRITICAL - Missing)
   - Why: Needed for token market data (price, volume, liquidity)
   - Get it: https://public-api.birdeye.so/ → Sign up → Get API key
   - Free tier: 100 requests/day

6. **RUGCHECK_API_KEY** (Optional but recommended)
   - Get it: https://rugcheck.xyz/api

## Summary of Current Errors:

```
❌ Helius: 401 Unauthorized (1000+ failures) 
❌ GMGN: invalid argument (still being called - code issue)
❌ QuillCheck: 403/429 errors (still being called - code issue)  
❌ Birdeye: No API key configured
❌ Some Alchemy calls: 403 Forbidden (permissions issue)
✅ Public RPCs: Working but rate limited (429 errors)
```

## Expected Result After Fixes:

- Scanner will find tokens ✅
- Holder counts will show ✅
- Market data (price, liquidity) will show ✅
- Wallet analysis will work ✅
- Scan time: ~5-10 seconds (vs 30+ seconds now)
