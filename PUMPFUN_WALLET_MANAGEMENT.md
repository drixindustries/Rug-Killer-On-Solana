# Pump.fun AMM Wallet Management

This document explains how Pump.fun AMM/system wallets are filtered globally from holder counts and top holder displays.

## Problem

Pump.fun tokens often show system wallets (AMM vaults, fee receivers, bonding curve contracts) as "top holders", which:
- Inflates holder counts
- Shows misleading concentration percentages
- Confuses users about real holder distribution

## Solution

All Pump.fun system wallets are maintained in a **hardcoded whitelist** at `server/pumpfun-whitelist.ts`.

### Current Whitelisted Addresses

```typescript
const CORE_PUMPFUN_ADDRESSES = new Set([
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun Program (bonding curve vault)
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump.fun Global
  '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg', // Pump.fun Fee Receiver
  'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM',  // Pump.fun Associated Token Account
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',  // Associated Token Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // Token Program
  'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1',  // Pump.fun Event Authority
  'e4HZW81GuZkgDK2YAdPF6PsToQAB6Go6dL3iQpDz2Hy',  // Pump.fun AMM/Liquidity Vault
]);
```

## How to Add New Wallets

### Method 1: Using the Script (Recommended)

```bash
# Add a wallet with automatic formatting
npm run add-pumpfun-wallet <wallet_address> ["Optional Label"]

# Example:
npm run add-pumpfun-wallet e4HZW81GuZkgDK2YAdPF6PsToQAB6Go6dL3iQpDz2Hy "Pump.fun Liquidity Vault"
```

The script will:
- ✅ Validate the wallet address
- ✅ Check if it already exists
- ✅ Add it to the hardcoded Set with proper formatting
- ✅ Provide next steps

### Method 2: Manual Edit

1. Open `server/pumpfun-whitelist.ts`
2. Add the wallet address to `CORE_PUMPFUN_ADDRESSES`:
   ```typescript
   'YOUR_WALLET_ADDRESS',  // Your comment here
   ```
3. Save and restart the server

### After Adding

1. **Restart the server** - Changes take effect immediately
2. **Wait 5 minutes** - Holder analysis is cached for 5 min, or manually clear Redis cache
3. **Commit changes**:
   ```bash
   git add server/pumpfun-whitelist.ts
   git commit -m "Add [wallet] to Pump.fun whitelist"
   git push origin main
   ```

## Where Filtering Happens

The filtering is applied **globally** in these locations:

1. **Holder Analysis** (`server/services/holder-analysis.ts`)
   - Filters wallets from holder count
   - Removes from top 20 holder list
   - Excludes from concentration calculations

2. **Frontend Display**
   - Holder distribution charts
   - Top holder tables
   - Concentration percentages

## Cache Behavior

- **TTL**: 5 minutes
- **Cache Key**: `holder-analysis:v3:{tokenAddress}`
- **Storage**: Redis (if configured)

To force immediate refresh:
1. Clear Redis cache for specific token: `DEL holder-analysis:v3:{tokenAddress}`
2. Or wait 5 minutes for automatic expiration

## Verification

After adding a wallet, verify it's filtered:

1. Scan a token that contains the wallet
2. Check the holder list - wallet should NOT appear
3. Check holder count - should exclude the filtered wallet
4. Check logs for: `[HolderAnalysis DEBUG] Filtered X Pump.fun AMM wallets`

## Common Pump.fun Wallets to Watch For

If you see these patterns in top holders, they should be added:
- Wallets starting with `6EF8`, `CebN`, `39az` (bonding curve related)
- Wallets appearing in EVERY Pump.fun token scan
- Wallets with very high balances (>10% supply) but labeled as "Pump.fun"

## Technical Details

### Function: `isPumpFunAmm(address: string): boolean`

Returns `true` if the address is in the whitelist.

Used by:
- `holder-analysis.ts` - filters from holder scans
- `solana-analyzer.ts` - builds filtering metadata
- Various frontend components - display logic

### Optional: Generated Whitelist

You can also generate a dynamic list from Solscan:
```bash
npm run pumpfun:sync
```

This creates `server/generated/pumpfun-amm.json` which is merged with core addresses.

**Note**: The hardcoded `CORE_PUMPFUN_ADDRESSES` always takes priority and cannot be overridden.
