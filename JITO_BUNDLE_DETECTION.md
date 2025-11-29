# Jito Bundle Detection Implementation

**Complete Implementation Date:** January 2025  
**Status:** ✅ Fully Integrated

## 📋 Overview

This implementation adds real-time **Jito MEV bundle detection** to the Rug Killer bot, enabling the detection and analysis of MEV (Maximal Extractable Value) bundles submitted through Jito's block engine. This helps identify coordinated token launches, priority access manipulation, and potential rug pull tactics.

## 🎯 What Are Jito Bundles?

Jito bundles are groups of transactions submitted together to Solana validators through Jito's block engine. Key characteristics:

- **Atomic Execution**: All transactions in a bundle execute together or not at all
- **Priority Access**: Bundles pay tips to validators for priority inclusion
- **MEV Protection**: Prevents front-running and sandwich attacks
- **Common in Token Launches**: Often used for coordinated buying at launch

### Bundle States

Bundles progress through several states tracked by our detector:

| State | Description | What It Means |
|-------|-------------|---------------|
| **ACCEPTED** ✅ | Forwarded to validator | Bundle passed initial checks |
| **PROCESSED** ⚡ | Reached processed commitment | Bundle executed successfully |
| **FINALIZED** 🎯 | Confirmed on-chain | Bundle fully confirmed |
| **REJECTED** ❌ | Not forwarded to validator | Bid too low or simulation failed |
| **DROPPED** ⚠️ | Accepted but didn't land | Blockhash expired or partial processing |

## 🏗️ Architecture

### Files Created/Modified

#### New Files
- **`server/services/jito-bundle-monitor.ts`** (507 lines)
  - Core bundle detection service
  - Real-time bundle result streaming
  - Transaction-to-bundle mapping
  - MEV tip detection (8 official Jito tip accounts)

#### Modified Files
- **`shared/schema.ts`**
  - Added `JitoBundleData` interface
  - Added `jitoBundleData` to `TokenAnalysisResponse`
  - Added `bundle_manipulation` risk flag type

- **`server/solana-analyzer.ts`**
  - Imported `getBundleMonitor` from jito-bundle-monitor
  - Added bundle detection to parallel data fetching
  - Integrated bundle analysis with token scanning
  - Added risk flag generation for high-confidence bundles

- **`server/bot-formatter.ts`**
  - Enhanced `bundle` field formatting
  - Added Jito-specific status emojis
  - Added tip amount and signal display
  - Prioritized Jito detection over timing-based detection

- **`package.json`**
  - Added `jito-ts: ^3.0.1` dependency

## 🔍 Detection Methods

### 1. Jito Tip Account Detection (HIGH Confidence)
Checks if transactions transfer lamports to official Jito tip accounts:

```typescript
export const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];
```

### 2. Bundle Result Streaming (Future Enhancement)
When `jito-ts` is fully integrated, enables real-time monitoring:

```typescript
const client = searcherClient(blockEngineUrl, authKeypair);
const cancelStream = client.onBundleResult(
  (bundleResult) => handleBundleResult(bundleResult),
  (error) => console.error('Stream error:', error)
);
```

### 3. Transaction Analysis Signals

| Signal | Description | Confidence Impact |
|--------|-------------|-------------------|
| `hasJitoTip` | Transfer to Jito tip account detected | HIGH |
| `tipAccountMatch` | Tip account in official list | HIGH |
| `highPriorityFee` | Priority fee > 10,000 lamports | MEDIUM |
| `consecutiveTxsInSlot` | Multiple txs in same slot | MEDIUM |

## 📊 Data Schema

### JitoBundleData Interface

```typescript
interface JitoBundleData {
  isBundle: boolean;
  bundleId?: string;
  status?: 'ACCEPTED' | 'PROCESSED' | 'FINALIZED' | 'REJECTED' | 'DROPPED' | 'UNKNOWN';
  tipAmount?: number; // Lamports
  tipAmountSol?: number; // SOL for display
  tipAccount?: string; // Jito tip account address
  slotLanded?: number;
  validatorIdentity?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  signals: {
    hasJitoTip: boolean;
    tipAccountMatch: boolean;
    consecutiveTxsInSlot: boolean;
    highPriorityFee: boolean;
  };
  bundleActivity?: {
    hasBundleActivity: boolean;
    bundleCount: number;
    totalTipAmount: number;
  };
  detectedAt: number;
}
```

## 🤖 Bot Display Format

### Discord/Telegram Message Example

```
🔴 **JITO BUNDLE DETECTED** ✅
• Status: FINALIZED
• Tip Paid: 0.0001 SOL
• Bundles Found: 3
• Total Tips: 0.00025 SOL
• Signals: Jito Tip ✅, High Fee 📈, Clustered 🎯
_MEV bundle may indicate coordinated launch_
```

### Confidence Indicators

- 🔴 **HIGH**: Jito tip detected + tip account match
- 🟡 **MEDIUM**: Jito tip OR high priority fee
- 🟢 **LOW**: No clear signals

### Status Emojis

- ✅ **FINALIZED**: Bundle confirmed on-chain
- ⚡ **PROCESSED**: Bundle executed successfully
- 🔄 **ACCEPTED**: Bundle forwarded to validator
- ❌ **REJECTED**: Bundle not forwarded
- ⚠️ **DROPPED**: Bundle accepted but didn't land

## 🚀 Usage Examples

### Analyzing a Single Transaction

```typescript
import { getBundleMonitor } from './services/jito-bundle-monitor.js';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const bundleMonitor = getBundleMonitor(connection);

// Detect bundle from transaction signature
const detection = await bundleMonitor.detectBundleFromTransaction(
  'YourTransactionSignatureHere'
);

if (detection.isBundle) {
  console.log(`Bundle detected with ${detection.confidence} confidence`);
  console.log(`Tip amount: ${detection.tipAmount} lamports`);
  console.log(`Status: ${detection.status}`);
}
```

### Analyzing Multiple Transactions (Token Launch)

```typescript
const bundleActivity = await bundleMonitor.detectBundleActivity([
  'signature1',
  'signature2',
  'signature3',
  // ... more signatures
]);

console.log(`Bundle count: ${bundleActivity.bundleCount}`);
console.log(`Total tips: ${(bundleActivity.totalTipAmount / 1e9).toFixed(6)} SOL`);
```

### Tracking Bundle Statistics

```typescript
const stats = bundleMonitor.getStatistics();

console.log(`Total bundles tracked: ${stats.totalBundles}`);
console.log(`Finalized: ${stats.statusBreakdown.FINALIZED}`);
console.log(`Rejected: ${stats.statusBreakdown.REJECTED}`);
console.log(`Average tip: ${(stats.averageTipAmount / 1e9).toFixed(6)} SOL`);
```

## ⚙️ Integration in Token Analysis

Bundle detection runs automatically during token analysis:

```typescript
// In solana-analyzer.ts
if (!options.skipExternal) {
  const connection = rpcBalancer.getConnection();
  const bundleMonitor = getBundleMonitor(connection);
  
  // Fetch recent transactions
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(tokenMintAddress),
    { limit: 50 },
    'confirmed'
  );
  
  // Analyze bundle activity
  const bundleActivity = await bundleMonitor.detectBundleActivity(
    signatures.map(sig => sig.signature)
  );
  
  // Add to response
  if (bundleActivity.hasBundleActivity) {
    response.jitoBundleData = { /* ... */ };
    
    // Add risk flag for high-confidence bundles
    if (firstBundle.confidence === 'HIGH') {
      response.redFlags.push({
        type: 'bundle_manipulation',
        severity: 'high',
        title: 'Jito Bundle Detected',
        description: `Token launch used Jito MEV bundles...`,
      });
    }
  }
}
```

## 🎓 Educational: Why Bundle Detection Matters

### Legitimate Uses
- **Anti-MEV Protection**: Prevents front-running
- **Atomic Swaps**: Multiple operations execute together
- **Fair Launches**: All participants get same execution slot

### Suspicious Patterns
- **Coordinated Sniping**: Multiple wallets buy simultaneously
- **Priority Manipulation**: Large tips for first-block execution
- **Bundle + High Holder Concentration**: Often indicates insider trading
- **New Token + Bundles**: May signal coordinated rug pull

## 📈 Risk Scoring Impact

Bundle detection affects token risk scoring:

| Scenario | Risk Impact | Explanation |
|----------|-------------|-------------|
| Bundle + New Token | +15 risk | Suspicious timing |
| Bundle + Top Holder Concentration | +10 risk | Coordinated insiders |
| Bundle alone (established token) | +5 risk | Normal MEV activity |
| No bundle detected | No change | Standard trading |

## 🔧 Configuration

### Environment Variables

```env
# Optional: Custom Jito block engine URL
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf

# Optional: Authentication keypair for streaming (future)
JITO_AUTH_KEYPAIR=/path/to/keypair.json
```

### Service Configuration

```typescript
// Adjust bundle cache TTL (default: 1 hour)
bundleMonitor.cleanup(); // Manual cleanup

// Auto-cleanup runs every 30 minutes
```

## 🧪 Testing

### Manual Testing

```bash
# Test bundle detection on a known token with bundle activity
npm run dev
# Then use bot command: /scan <token_address>
```

### Test Cases

1. **Known Pump.fun Launch with Bundles**
   - Expected: HIGH confidence detection
   - Should show: Multiple bundles, tip amounts, status

2. **Regular Raydium Token**
   - Expected: LOW confidence or no detection
   - Should show: Clean "No bundle detected"

3. **Recent Token (<24h)**
   - Expected: Recent signatures analyzed
   - Should show: Bundle count if detected

## 📚 References

### Official Jito Documentation
- **Jito Labs GitHub**: https://github.com/jito-labs
- **jito-ts SDK**: https://github.com/jito-labs/jito-ts
- **Block Engine API**: https://jito-labs.gitbook.io/mev/searcher-services/block-engine
- **Bundle Results**: https://jito-labs.gitbook.io/mev/searcher-services/bundle-results

### Related Implementations
- `server/services/holder-analysis.ts` - Holder concentration detection
- `server/temporal-gnn-detector.ts` - Temporal graph neural network
- `server/services/funding-source-analyzer.ts` - Wallet funding analysis

## ⚡ Performance Considerations

### Timeouts
- Bundle detection: 5-8 seconds max
- Parallel with other analysis tasks
- Fast-fail if detection unavailable

### Caching
- Bundle data cached for 1 hour
- Transaction-to-bundle mapping preserved
- Auto-cleanup prevents memory leaks

### RPC Usage
- Fetches last 50 signatures per analysis
- Single `getSignaturesForAddress` call
- Batch transaction fetching when needed

## 🔮 Future Enhancements

### Phase 1 (Current)
- ✅ Jito tip account detection
- ✅ Transaction analysis signals
- ✅ Bundle activity aggregation
- ✅ Bot message formatting

### Phase 2 (Planned)
- [ ] Real-time bundle streaming with `jito-ts`
- [ ] Historical bundle tracking per token
- [ ] Bundle rejection reason analysis
- [ ] Validator identity tracking

### Phase 3 (Advanced)
- [ ] Bundle pattern recognition (ML)
- [ ] Cross-token bundle correlation
- [ ] Bundler wallet reputation system
- [ ] Bundle size and complexity analysis

## 🐛 Troubleshooting

### Bundle Detection Not Working

```bash
# Check RPC connection
# Bundle detection requires valid RPC endpoint
tail -f logs/app.log | grep "JitoBundleMonitor"
```

### False Positives

- Jito bundles are common in DeFi - not always suspicious
- Look for **combination** of signals: bundle + new token + holder concentration
- HIGH confidence requires Jito tip account match

### Missing Bundle Data

- Token may be too old (signatures purged)
- Bundle may have been rejected/dropped
- RPC may not have full transaction history

## 📄 License

Part of Rug Killer On Solana - see main project LICENSE

---

**Implementation Complete** ✅  
For support: See main project README or open GitHub issue
