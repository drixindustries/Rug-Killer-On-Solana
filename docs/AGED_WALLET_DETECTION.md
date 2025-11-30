# Aged Wallet & Farming Pattern Detection

**Status:** ✅ Fully Implemented & Enhanced (Nov 29, 2025)

---

## Overview

Aged wallet detection identifies wallets that were created months or years ago and are now being used to create fake volume and legitimacy on new token launches. This is one of the most sophisticated scam techniques on Solana.

---

## How the Scam Works

1. **Preparation Phase** (3-24+ months before launch):
   - Scammers create 10-50+ wallets
   - Let them age naturally with occasional transactions
   - Build "organic" looking transaction history

2. **Funding Phase** (1-7 days before launch):
   - Fund all wallets from same source (Swopshop, FixedFloat)
   - Often use privacy mixers or instant exchanges
   - Amounts are similar across all wallets

3. **Attack Phase** (Token launch):
   - All aged wallets buy token within minutes
   - Creates appearance of "organic demand"
   - Never sells (fake volume holders)
   - Fools traders into thinking token is legitimate

---

## Detection Strategies

### 1. **Tiered Age Detection**

We use 4 risk tiers based on wallet age:

| Tier | Age Range | Risk Level | Points Added |
|------|-----------|------------|--------------|
| **Extreme** | 2+ years (730+ days) | Critical | +50 |
| **High** | 13+ months (400+ days) | High | +40 |
| **Medium** | 6+ months (180+ days) | Moderate | +25 |
| **Low** | 3+ months (90+ days) | Minor | +15 |

**Why This Matters:**
- 2+ year old wallets buying a new token for the first time is **extremely suspicious**
- Scammers often prepare wallets 6-18 months in advance
- Recent wallets (< 90 days) are less concerning

### 2. **Coordinated Buy Detection**

Flags when 5+ aged wallets buy within a **1-minute window**.

**Example:**
```
Wallet A: 2024-11-29 10:15:23 UTC
Wallet B: 2024-11-29 10:15:31 UTC
Wallet C: 2024-11-29 10:15:47 UTC
Wallet D: 2024-11-29 10:16:02 UTC
Wallet E: 2024-11-29 10:16:19 UTC
```
→ **+25 risk points** (Coordinated attack pattern)

### 3. **Similar Buy Amount Detection** ⭐ NEW!

Inspired by [1f1n/Dragon](https://github.com/1f1n/Dragon) repo.

Flags when 80%+ of aged wallets buy amounts are within **20% of the median**.

**Example:**
```
Wallet A: 1.2 SOL
Wallet B: 1.15 SOL  
Wallet C: 1.22 SOL
Wallet D: 1.18 SOL
Wallet E: 1.21 SOL
```
→ **+25 risk points** (Automated/scripted behavior)

### 4. **Same Funding Source Detection**

Tracks where wallets received their SOL from:

**High-Risk Sources:**
- Swopshop (42%)
- FixedFloat (10.5%)
- ChangeNOW
- SimpleSwap
- Godex
- StealthEX

**Example from Nova's detection:**
> "$PEKO is bundled with fresh wallets funded by Swopshop (42%) and FixedFloat (10.5%)"

→ **+30 risk points** if 5+ wallets from same source

### 5. **Similar Creation Age**

Flags wallets created within **7 days of each other**.

**Example:**
```
Wallet A: Created March 15, 2024
Wallet B: Created March 17, 2024
Wallet C: Created March 20, 2024
Wallet D: Created March 18, 2024
```
→ **+20 risk points** (Batch preparation detected)

### 6. **No-Sell Behavior**

Flags when 80%+ of aged wallets have **only buys, no sells**.

**Indicator of:** Fake volume holders who artificially inflate market cap without ever selling.

→ **+15 risk points**

---

## Risk Scoring System

**Total Score Range:** 0-100+

| Score | Risk Level | Action |
|-------|------------|--------|
| 0-25 | ✅ Low | Safe to trade |
| 26-50 | ⚠️ Moderate | Proceed with caution |
| 51-70 | 🚨 High | High risk - consider avoiding |
| 71-100+ | ☠️ Extreme | Likely scam - DO NOT BUY |

---

## Real-World Detection Example

**Token:** SCAM123...  
**Top 20 Holders Analysis:**

```
🚨 AGED WALLET DETECTION RESULTS:

Suspicious Wallets: 12
Total Fake Volume: 34.7% of supply
Risk Score: 85/100 (EXTREME RISK)

PATTERNS DETECTED:
✓ 7 wallets 2+ years old buying for first time - EXTREME RISK
✓ Multiple aged wallets funded from same source before buying
✓ Aged wallets created around the same time - batch preparation
✓ Aged wallets bought within narrow time window - coordinated
✓ Aged wallets bought similar amounts - automated/scripted behavior
✓ Aged wallets have only buys, no sells - fake volume holders

VERDICT: DO NOT BUY - Classic aged wallet farming scam
```

---

## Technical Implementation

### Key Components

1. **`aged-wallet-detector.ts`** - Core detection logic
2. **`funding-source-analyzer.ts`** - Tracks funding origins
3. **`holder-tracking.ts`** - Monitors holder behavior

### RPC Optimization

To avoid rate limits, we:
- Analyze only **top 10 wallets** for funding
- Limit signature fetches to **100 per wallet**
- Add **150ms delay** between wallet analyses
- Use RPC load balancing

### Accuracy Improvements (Nov 29, 2025)

**Before:**
- Fixed 400-day threshold only
- No buy amount analysis
- Simplified buy/sell detection

**After:**
- ✅ 4-tier age detection (90d, 180d, 400d, 730d)
- ✅ Similar buy amount detection (20% variance)
- ✅ Enhanced pattern correlation scoring
- ✅ Age distribution tracking

---

## Research References

Our implementation is inspired by cutting-edge open-source research:

### Core References

1. **[degenfrends/solana-rugchecker](https://github.com/degenfrends/solana-rugchecker)** (TypeScript)
   - Holder concentration analysis
   - Rug score computation
   - Customizable risk checks

2. **[1f1n/Dragon](https://github.com/1f1n/Dragon)** (Python)
   - Profitable wallet scraping
   - Bundle buy detection
   - PnL tracking for old wallets

3. **[0xthi/solana-rug-pull-checker](https://github.com/0xthi/solana-rug-pull-checker)** (TypeScript)
   - Legitimacy scoring (400+ threshold)
   - Helius API integration
   - Market data correlation

4. **[Solana StackExchange](https://solana.stackexchange.com)** (Community)
   - Transaction pagination patterns
   - Efficient wallet age calculation
   - High-tx wallet handling

### Additional Tools

- **archiesnipes/solana-new-token-monitor** - Real-time launch detection
- **safuco/solana-token-analyzer** - Honeypot simulation
- **ondrejvosmera/solana-wallet-tracker** - Activity analysis

---

## Future Enhancements

### Planned Improvements

1. **Full Transaction Pagination** (High Priority)
   - Current: Limited to 100 signatures
   - Target: Paginate backward to find true wallet creation date
   - Based on: StackExchange pagination code

2. **Actual Buy/Sell Detection** (High Priority)
   - Current: Simplified `hasOnlyBuys: true`
   - Target: Parse Raydium/Jupiter swap instructions
   - Option: Use Helius parsed transaction API

3. **Wallet Activity Scoring**
   - Track transaction frequency patterns
   - Detect "awakening" dormant wallets
   - Flag sudden activity spikes

4. **Cross-Token Analysis**
   - Track if aged wallets used on multiple rugs
   - Build scammer wallet database
   - Share intelligence across detections

---

## Configuration

### Thresholds (Adjustable)

```typescript
// In aged-wallet-detector.ts
private readonly MIN_WALLET_AGE_DAYS = 400;
private readonly EXTREME_WALLET_AGE_DAYS = 730;
private readonly SIMILAR_AGE_WINDOW_DAYS = 7;
private readonly COORDINATED_BUY_WINDOW_MS = 60000; // 1 minute
private readonly SIMILAR_AMOUNT_THRESHOLD = 0.20; // 20%
```

### Rate Limiting

```typescript
// In funding-source-analyzer.ts
const walletsToAnalyze = topHolders.slice(0, 10); // Analyze top 10
await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
```

---

## API Response Format

```json
{
  "agedWalletDetection": {
    "suspiciousAgedWallets": [
      {
        "wallet": "7xKXt...3Yz",
        "walletAge": 847.3,
        "buyAmount": 1.2,
        "buyTimestamp": 1732896000000,
        "firstTransactionDate": 1659680000000,
        "totalTransactions": 142,
        "hasOnlyBuys": true,
        "fundingSource": "Swopshop"
      }
    ],
    "agedWalletCount": 12,
    "totalFakeVolumePercent": 34.7,
    "riskScore": 85,
    "patterns": {
      "sameFundingSource": true,
      "similarAges": true,
      "coordinatedBuys": true,
      "noSells": true,
      "similarBuyAmounts": true
    },
    "ageTiers": {
      "extreme": 7,
      "high": 4,
      "medium": 1,
      "low": 0
    },
    "risks": [
      "7 wallets 2+ years old buying for first time - EXTREME RISK",
      "12 aged wallets detected - likely coordinated fake volume",
      "Multiple aged wallets funded from same source before buying",
      "Aged wallets created around the same time - batch preparation",
      "Aged wallets bought within narrow time window - coordinated",
      "Aged wallets bought similar amounts - automated/scripted behavior",
      "34.7% of supply in aged wallets - significant fake volume"
    ]
  }
}
```

---

## Testing

Test with known aged wallet scams:

```bash
# Test aged wallet detection
npx tsx scripts/test-aged-wallets.ts <TOKEN_ADDRESS>

# Scan 100 tokens for patterns
npx tsx scripts/scan-100-tokens.ts
```

---

## Security Notice

⚠️ **Auditing External Code:**

When reviewing GitHub repositories mentioned in this doc:
1. **Never** input private keys into unverified scripts
2. **Always** audit dependencies (check package.json)
3. **Use** devnet for testing unfamiliar code
4. **Trust** only established RPCs (Helius, QuickNode)

Recent reports highlight malicious Pump.fun bots stealing keys via obfuscated dependencies. ([Source: Cointelegraph](https://cointelegraph.com))

---

## Learn More

- [Advanced Rug Detection](./ADVANCED_RUG_DETECTION.md)
- [Funding Source Analysis](../server/services/funding-source-analyzer.ts)
- [Holder Tracking](../server/services/holder-tracking.ts)

---

**Built for the Solana community | Research-backed detection since 2025**
