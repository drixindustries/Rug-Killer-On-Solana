# Jito Bundle Detection - Quick Reference

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start bot
npm run dev

# 3. Test detection
/scan <token_address>
```

## 📁 Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `server/services/jito-bundle-monitor.ts` | NEW - Core detection service | 507 |
| `shared/schema.ts` | Added JitoBundleData type | +30 |
| `server/solana-analyzer.ts` | Integrated bundle detection | +65 |
| `server/bot-formatter.ts` | Enhanced bundle display | +50 |
| `package.json` | Added jito-ts dependency | +1 |
| `JITO_BUNDLE_DETECTION.md` | NEW - Full documentation | 400+ |
| `JITO_IMPLEMENTATION_COMPLETE.md` | NEW - Summary doc | 350+ |

## 🎯 Key Features

✅ **8 Official Jito Tip Accounts** tracked  
✅ **5 Bundle States** detected (ACCEPTED, PROCESSED, FINALIZED, REJECTED, DROPPED)  
✅ **Confidence Scoring** (HIGH, MEDIUM, LOW)  
✅ **Tip Amount Tracking** in SOL  
✅ **Bundle Activity Aggregation** across transactions  
✅ **Risk Flag Generation** for suspicious bundles  
✅ **Bot Message Integration** with emojis & formatting  
✅ **Auto-cleanup** (1-hour cache TTL)  

## 🔍 Detection Logic

```typescript
// HIGH confidence: Jito tip account transfer detected
if (hasJitoTip && tipAccountMatch) → HIGH

// MEDIUM confidence: Signals without direct tip
if (hasJitoTip || highPriorityFee) → MEDIUM

// LOW confidence: No clear indicators
else → LOW
```

## 📊 Jito Tip Accounts

```typescript
'96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'
'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe'
'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY'
'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49'
'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh'
'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt'
'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'
'3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'
```

## 🤖 Bot Display

```
🔴 **JITO BUNDLE DETECTED** ✅
• Status: FINALIZED
• Tip Paid: 0.0001 SOL
• Bundles Found: 3
• Total Tips: 0.00025 SOL
• Signals: Jito Tip ✅, High Fee 📈
_MEV bundle may indicate coordinated launch_
```

## 🎨 Status Emojis

| Status | Emoji | Meaning |
|--------|-------|---------|
| FINALIZED | ✅ | Confirmed on-chain |
| PROCESSED | ⚡ | Executed successfully |
| ACCEPTED | 🔄 | Forwarded to validator |
| REJECTED | ❌ | Not forwarded |
| DROPPED | ⚠️ | Didn't land |
| UNKNOWN | ❓ | Status unclear |

## 🎯 Confidence Indicators

| Level | Emoji | Criteria |
|-------|-------|----------|
| HIGH | 🔴 | Jito tip + account match |
| MEDIUM | 🟡 | Signals present |
| LOW | 🟢 | No clear indicators |

## 💻 Code Examples

### Detect Single Transaction
```typescript
import { getBundleMonitor } from './services/jito-bundle-monitor.js';

const bundleMonitor = getBundleMonitor(connection);
const detection = await bundleMonitor.detectBundleFromTransaction(signature);

if (detection.isBundle) {
  console.log(`Confidence: ${detection.confidence}`);
  console.log(`Tip: ${detection.tipAmount} lamports`);
}
```

### Analyze Bundle Activity
```typescript
const activity = await bundleMonitor.detectBundleActivity(signatures);

console.log(`Bundles: ${activity.bundleCount}`);
console.log(`Tips: ${(activity.totalTipAmount / 1e9).toFixed(6)} SOL`);
```

### Get Statistics
```typescript
const stats = bundleMonitor.getStatistics();

console.log(`Total: ${stats.totalBundles}`);
console.log(`Finalized: ${stats.statusBreakdown.FINALIZED}`);
console.log(`Avg tip: ${(stats.averageTipAmount / 1e9).toFixed(6)} SOL`);
```

## 🔧 Integration Points

### In solana-analyzer.ts
```typescript
// Automatically runs during token analysis
const bundleActivity = await bundleMonitor.detectBundleActivity(signatures);
response.jitoBundleData = { /* ... */ };
```

### In bot-formatter.ts
```typescript
// Automatically formats for Discord/Telegram
if (analysis.jitoBundleData?.isBundle) {
  bundle = `🔴 **JITO BUNDLE DETECTED** ...`;
}
```

## 📈 Risk Scoring

| Scenario | Risk Impact |
|----------|-------------|
| Bundle + New Token | +15 points |
| Bundle + High Concentration | +10 points |
| Bundle alone | +5 points |

## 🧪 Testing Commands

```bash
# Check logs
tail -f logs/app.log | grep "JitoBundleMonitor"
tail -f logs/app.log | grep "JITO BUNDLE"

# Test with Discord bot
/scan 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr

# Test with Telegram bot
/analyze 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr
```

## 🐛 Troubleshooting

### No Bundle Detected
- Check if token has recent transactions (last 50 sigs)
- Verify RPC connection is working
- Look for "JitoBundleMonitor" in logs

### False Positives
- Bundles are common in DeFi - not always suspicious
- Check confidence level (ignore LOW)
- Look for combination: bundle + new token + concentration

### Error Logs
```bash
# Check for errors
grep "bundle detection failed" logs/app.log
grep "JitoBundleMonitor.*error" logs/app.log
```

## 📚 Documentation

- **Full Docs**: `JITO_BUNDLE_DETECTION.md`
- **Implementation Summary**: `JITO_IMPLEMENTATION_COMPLETE.md`
- **Jito Labs**: https://github.com/jito-labs/jito-ts

## ⚙️ Configuration

```typescript
// In jito-bundle-monitor.ts
const SIGNATURE_LIMIT = 50; // Transactions to analyze
const CACHE_TTL = 3600000; // 1 hour cache
const CLEANUP_INTERVAL = 1800000; // 30 min cleanup
```

## 🚀 Deployment

```bash
# 1. Install
npm install

# 2. Build
npm run build

# 3. Deploy
npm start
# Or: Deploy via Railway/Vercel
```

## ✅ Success Checklist

- [x] Service created
- [x] Types defined
- [x] Analyzer integrated
- [x] Bot formatting added
- [x] Dependencies updated
- [x] Documentation complete
- [ ] npm install run
- [ ] Testing completed
- [ ] Production deployment

---

**Status**: ✅ Ready for Testing  
**Next Step**: Run `npm install` and test with `/scan`
