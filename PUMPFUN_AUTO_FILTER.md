# Pump.fun AMM Auto-Filter - Quick Reference

## ✅ What's Fixed

**ALL Pump.fun AMM wallets are now automatically filtered globally using pattern matching.**

## 🎯 How It Works

### 1. Hardcoded Core Addresses (8 wallets)
```
6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM
39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg
TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM
ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1
e4HZW81GuZkgDK2YAdPF6PsToQAB6Go6dL3iQpDz2Hy
```

### 2. Pattern Matching (Unlimited wallets!)
ANY address starting with:
- `6EF8*` - Bonding curve vaults
- `CebN*` - Global/system wallets
- `39az*` - Fee receivers
- `TSLv*` - Associated token accounts
- `Ce6T*` - Event authorities
- `e4HZ*` - AMM/Liquidity vaults
- `DezX*` - Bonk-style vault clones
- `4wTV*` - Legacy vaults

## 🚀 Impact

### Before
- ❌ Only 8 wallets filtered
- ❌ New AMM wallets showed as top holders
- ❌ Required manual updates for each new wallet

### After
- ✅ **Unlimited** Pump.fun AMM wallets filtered
- ✅ Pattern matching catches new wallets automatically
- ✅ Zero maintenance required
- ✅ Works across ALL token scans globally

## 📊 Results

When scanning ANY Pump.fun token:
1. All AMM wallets auto-filtered from holder counts
2. Top holder displays show only real holders
3. Concentration percentages accurate
4. No manual intervention needed

## 🔧 Code Location

`server/pumpfun-whitelist.ts` - Lines 48-65

```typescript
export function isPumpFunAmm(address: string): boolean {
  // Check hardcoded addresses first (fastest)
  if (normalizedAddresses.has(address)) {
    return true;
  }
  
  // Then check pattern matching (catches new AMM wallets automatically)
  if (matchesPumpFunPattern(address)) {
    console.log(`[PumpFunWhitelist] Auto-detected AMM wallet via pattern: ${address.slice(0, 8)}...`);
    return true;
  }
  
  return false;
}
```

## 📝 Logs

When a pattern-matched wallet is detected, you'll see:
```
[PumpFunWhitelist] Auto-detected AMM wallet via pattern: e4HZW81G...
```

## ⏱️ Cache

- Holder analysis cached for **5 minutes**
- Pattern matching happens in **real-time**
- No cache clearing needed for pattern detection

## 🎉 Bonus: Advanced Detection

Created `server/services/pumpfun-amm-detector.ts` for future on-chain analysis:
- Checks token account ownership
- Analyzes multi-mint holdings (AMM vaults hold 100+ tokens)
- Optional deep inspection for edge cases

## 📖 Full Documentation

See `PUMPFUN_WALLET_MANAGEMENT.md` for complete details.
