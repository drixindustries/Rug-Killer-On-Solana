# RPC Load Balancer Setup Guide (2025)

## Current Status ✅

Your RPC balancer is **already implemented and working**! The system automatically rotates between multiple RPC providers to avoid rate limits.

## What's Currently Configured

- ✅ **QuickNode RPC** (PRIMARY) - Premium Solana RPC (Weight: 90, Rate limit: 1000 req/min)
- ✅ **Shyft RPC** (Secondary) - High-speed RPC (Weight: 60, Rate limit: 500 req/min)
- ✅ **Helius RPC** (Tertiary) - Premium RPC provider (Weight: 50, Rate limit: 1000 req/min)
- ✅ **Solana Public RPC** (Fallback) - Free public endpoint (Weight: 30, Rate limit: 40 req/min)

### ⚠️ DEPRECATED PROVIDERS (DO NOT USE)
- ❌ **Ankr** - Multichain endpoint doesn't properly support Solana (removed from codebase)
- ❌ **Alchemy** - Inconsistent for Solana (removed from codebase)
- ❌ **Project Serum** - Deprecated/shutdown
- ❌ **GenesysGo** - Deprecated/shutdown

## How It Works

The balancer uses **weighted random selection** with health scoring:

1. **Automatic Rotation**: Selects providers based on weight and health scores
2. **Health Monitoring**: Pings all providers every 20 seconds
3. **Smart Failover**: Automatically switches to healthy providers
4. **Auto-Recovery**: Providers automatically recover as health improves
5. **Retry Logic**: 3 attempts with exponential backoff before giving up

## Get Free API Keys (5 minutes)

### 1. QuickNode (PRIMARY - Recommended) 🔥

**Free Tier:** 50 million compute units/month

1. Go to https://www.quicknode.com/
2. Sign up with email or GitHub
3. Create a new endpoint → Select "Solana" → "Mainnet"
4. Copy your HTTPS endpoint URL

**Setup:**
```bash
QUICKNODE_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

### 2. Shyft (SECONDARY - Optional but Recommended) 

**Free Tier:** High-speed RPC with good limits

1. Go to https://shyft.to/
2. Sign up with email
3. Get your API key from dashboard
4. Copy your API key


**Setup:**
```bash
SHYFT_KEY=your_shyft_api_key_here
```

## Set Environment Variables

### For Railway Deployment:

```powershell
# Set QuickNode (PRIMARY - recommended)
railway variables --set QUICKNODE_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/

# Set Shyft (SECONDARY - recommended)
railway variables --set SHYFT_KEY=your_shyft_api_key_here

# Set Helius (TERTIARY - optional)
railway variables --set HELIUS_API_KEY=your_helius_api_key_here
```

### For Local Development:

Add to `server/.env`:
```bash
# QuickNode RPC (PRIMARY)
QUICKNODE_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/

# Shyft RPC (SECONDARY - optional)
SHYFT_KEY=your_shyft_api_key_here

# Helius RPC (TERTIARY - optional)
HELIUS_API_KEY=your_helius_api_key_here

# Solana Public RPC (automatically used as fallback, no key needed)
```

Railway will automatically redeploy with the new keys.

## Verify It's Working

After setting the keys, check the logs:

```powershell
railway logs --tail 50 | Select-String "RPC"
```

You should see:
```
[RPC Balancer] Selected QuickNode (premium) - score: 100
[RPC Balancer] Selected Shyft (premium) - score: 95
[RPC Balancer] Selected Solana-Public (fallback) - score: 100
```

## Current Behavior (Without API Keys)

Right now, the balancer only uses:
- **Solana Public RPC** (https://api.mainnet-beta.solana.com)
- **Project Serum RPC** (https://solana-api.projectserum.com)

This is why you're seeing rate limit errors in the logs:
```
[RPC Balancer] Rate limited on attempt 3, rotating provider...
Error fetching top holders after 3 attempts: 429 Too Many Requests
```

## After Adding API Keys

With Helius and Alchemy configured, you'll have:
- **4x more capacity** (4 providers instead of 2)
- **Higher rate limits** (Helius: 100 req/sec, Alchemy: very high)
- **Better reliability** (failover across paid providers)
- **Faster responses** (paid RPCs are optimized)

## Technical Details

**RPC Balancer Code**: `server/services/rpc-balancer.ts`

**Provider Weights**:
- Public: 40% (high reliability, moderate limits)
- Helius: 30% (premium speed, high limits)
- Alchemy: 20% (enterprise-grade, very high limits)
- Serum: 10% (backup provider)

**Health Scoring**:
- Successful request: +5 points (max 100)
- Failed request: -10 points (min 0)
- Providers below 50 score are temporarily excluded

**Retry Strategy**:
- Attempt 1: Immediate
- Attempt 2: Wait 1 second, rotate provider
- Attempt 3: Wait 2 seconds, rotate provider
- After 3 fails: Return error

## No Action Required If...

If you're okay with occasional rate limits during high traffic, you can leave it as is. The public RPCs work fine for moderate usage.

## Recommended Action

Add the API keys for production-grade reliability. Both Helius and Alchemy have generous free tiers that should handle thousands of requests per day.
