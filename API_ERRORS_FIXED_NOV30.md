# API Errors Fixed - November 30, 2025

## Issues Fixed

### 1. ❌ Ankr API Quota Exhausted
**Error:** `401 Unauthorized: API key disabled, reason: Freemium monthly quota exhausted`

**Solution:** 
- Removed Ankr from premium RPC providers in `rpc-balancer.ts`
- Helius is now the primary free RPC provider (weight: 100)
- Shyft remains as secondary (weight: 35)
- Public fallbacks: Solana-Official, Alchemy-Public, PublicNode

**Files Changed:**
- `server/services/rpc-balancer.ts` - Disabled Ankr, enabled Helius as primary

### 2. ❌ SmartMoneyRelay ESM Module Error
**Error:** `ReferenceError: require is not defined`

**Root Cause:** Using CommonJS `require()` in ESM module context

**Solution:**
- Changed `require('./services/smart-money-relay.ts')` to `await import('./services/smart-money-relay.js')`
- Fixed ESM compatibility issue in Discord bot

**Files Changed:**
- `server/discord-bot.ts` - Line 2798: Changed require to dynamic import

### 3. ✅ Updated Log Messages
- Changed `Helius + Ankr` to just `Helius` in alpha-alerts logging
- Removed outdated Ankr references

**Files Changed:**
- `server/alpha-alerts.ts` - Updated webhook listener log message

## Current RPC Configuration

### Premium Tier (Requires API Keys)
1. **Helius** - Primary (weight: 100) ✅ FREE TIER
   - 30 req/s rate limit
   - Generous free tier
   - Main provider

2. **Shyft** - Secondary (weight: 35) ✅ FREE TIER
   - 100 req/min rate limit
   - Good speed/reliability

### Fallback Tier (Public, No Keys)
3. **Solana-Official** (weight: 20)
4. **Alchemy-Public** (weight: 15)
5. **PublicNode** (weight: 12)

### Disabled
- ❌ **Ankr** - Free quota exhausted (commented out in code)

## Verification

After Railway redeploys:
1. ✅ No more 401 Ankr errors
2. ✅ Helius will be selected as primary RPC
3. ✅ SmartMoneyRelay will load without ESM errors
4. ✅ `/graderepo` command will be registered in Discord

## Railway Logs to Watch

Look for:
```
[RPC Balancer] Selected Helius (premium) - score: 100
✅ Successfully reloaded Discord application (/) commands
✅ Alpha alert callback registered for Discord
```

Should NOT see:
```
❌ Ankr: Failed (HTTP 401: Unauthorized)
[SmartMoneyRelay] Failed to register listener: ReferenceError: require is not defined
```

## Next Steps

1. Wait for Railway to redeploy (~2 minutes)
2. Check logs for successful Helius connection
3. Test `/graderepo` command in Discord
4. Monitor for any new errors

## If Helius Also Runs Out

If Helius free tier is exhausted in future:
1. Can upgrade Helius to paid tier
2. Can add more free RPC providers
3. Fallback tier (Solana-Official, Alchemy, PublicNode) will handle load automatically
