# RPC Load Balancer Setup Guide

## Current Status ✅

Your RPC balancer is **already implemented and working**! The system automatically rotates between multiple RPC providers to avoid rate limits.

## What's Already Configured

- ✅ **Solana Public RPC** (40% weight) - Active
- ✅ **Helius RPC** (30% weight) - Needs API key
- ✅ **Alchemy RPC** (20% weight) - Needs API key  
- ✅ **Project Serum RPC** (10% weight) - Active

## How It Works

The balancer uses **weighted random selection** with health scoring:

1. **Automatic Rotation**: Selects providers based on weight (more weight = higher priority)
2. **Health Monitoring**: Pings all providers every 30 seconds
3. **Smart Failover**: If a provider fails, its health score drops and it's used less
4. **Auto-Recovery**: Providers automatically recover as health improves
5. **Retry Logic**: 3 attempts with exponential backoff before giving up

## Get Free API Keys (5 minutes)

### 1. Helius (Free: 100 req/sec)

1. Go to https://helius.dev
2. Sign up with email
3. Click "Create New Project"
4. Copy your API key (starts with `a1b2c3...`)

### 2. Alchemy (Free: 300M compute units/month)

1. Go to https://alchemy.com
2. Sign up with email
3. Click "Create App" → Select "Solana Mainnet"
4. Copy your API key (starts with `abc123...`)

## Set Environment Variables

Once you have both keys, run this command:

```powershell
railway variables --set HELIUS_KEY=<paste-helius-key-here> --set ALCHEMY_KEY=<paste-alchemy-key-here>
```

**Example:**
```powershell
railway variables --set HELIUS_KEY=a1b2c3d4e5f6g7h8 --set ALCHEMY_KEY=abc123def456ghi789
```

Railway will automatically redeploy with the new keys.

## Verify It's Working

After setting the keys, check the logs:

```powershell
railway logs --tail 50 | Select-String "RPC"
```

You should see:
```
[RPC Balancer] Selected provider: Helius (score: 100)
[RPC Balancer] Selected provider: Alchemy (score: 95)
[RPC Balancer] Selected provider: Public (score: 100)
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
