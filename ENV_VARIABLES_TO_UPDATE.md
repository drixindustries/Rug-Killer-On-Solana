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

---

## Whop Integration & Access Control (NEW)

### New Environment Variables for Access Control:

```bash
# Whop Integration (Payment & Subscription Management)
WHOP_API_KEY=your_whop_api_key_here           # Get from Whop dashboard
WHOP_PRODUCT_ID=your_whop_product_id          # Your product ID on Whop
WHOP_PLAN_ID=your_whop_plan_id                # Plan ID for subscriptions

# Token Gating (10M Token Requirement)
RUG_KILLER_TOKEN_MINT=YourTokenMintAddress    # Your project's token mint address
```

### What This Enables:

1. **7-Day Trial** - All new users/groups get free 7-day access
2. **Token Gating** - Users with 10M+ tokens get free access (use `/linkwallet`)
3. **Paid Subscriptions** - Whop payment integration for premium access
4. **Group Access** - Discord servers/Telegram groups get access for all members

### Setup Instructions:

1. **Create Whop Account**: Visit [whop.com](https://whop.com) and create seller account
2. **Create Product**: Set up your bot access product
3. **Get API Keys**: Copy API key, Product ID, and Plan ID
4. **Add to Railway**: Add the 4 new environment variables
5. **Run Migration**: Database migration runs automatically on deploy

### Optional - Leave Blank to Disable:

- If `WHOP_API_KEY` is not set, Whop features are disabled (token-gating and trials still work)
- If `RUG_KILLER_TOKEN_MINT` is not set, token-gating is disabled (trials and Whop still work)

See [WHOP_INTEGRATION_GUIDE.md](./WHOP_INTEGRATION_GUIDE.md) for complete setup instructions.
