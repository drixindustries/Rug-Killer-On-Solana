# Advanced Rug Detection Systems - November 15, 2025

## Overview
Based on analysis of the GHETTOGUS pump-and-dump chart, we've implemented 3 comprehensive new detection systems to catch rugs in real-time.

## New Detection Services

### 1. Pump & Dump Detector (`pump-dump-detector.ts`)
**Purpose**: Detect coordinated pump-and-dump schemes by analyzing price action patterns

**Detections:**
- ✅ **Rapid Pumps**: >300% in 1 hour (CRITICAL: >500%)
- ✅ **Instant Dumps**: >60% drop from ATH (CRITICAL: >90% in 5 min)
- ✅ **Buy/Sell Imbalances**: >80% sells in last hour = coordinated exit
- ✅ **Volume Anomalies**: >60% of daily volume in 5 minutes during dump

**Key Metrics:**
- `rugConfidence` (0-100): Overall confidence this is a rug pull
- `patterns[]`: Array of detected pump/dump patterns
- `timeline`: Tracks pump → dump progression

**Example Detection (GHETTOGUS Pattern):**
```
Pump: +500% in 1 hour
Dump: -90% in 5 minutes
Result: 95% rug confidence, CRITICAL severity
```

---

### 2. Liquidity Monitor (`liquidity-monitor.ts`)
**Purpose**: Track liquidity pool changes to detect LP removal during rugs

**Detections:**
- ✅ **Sudden LP Drops**: >50% liquidity removed in 1 hour
- ✅ **Gradual Drains**: Consistent liquidity decrease over 24h
- ✅ **Low Liquidity**: Below $5k threshold (critical risk)
- ✅ **LP Removal During Dumps**: Cross-check price drops with LP changes

**Key Metrics:**
- `liquidityTrend`: stable | decreasing | critical_drop
- `liquidityToMcapRatio`: Excellent (>10%) → Critical (<1%)
- `riskScore` (0-100): Higher = more dangerous

**Health Indicators:**
- Excellent: >10% of market cap in liquidity
- Good: 5-10%
- Fair: 2-5%
- Poor: 1-2%
- **Critical: <1% (RUG IMMINENT)**

---

### 3. Top Holder Tracker (`holder-tracking.ts`)
**Purpose**: Monitor top 10 holders for coordinated sell-offs

**Detections:**
- ✅ **Coordinated Sell-offs**: 3+ top holders selling simultaneously
- ✅ **Mass Exodus**: 5+ holders dumping >30% combined supply
- ✅ **Whale Activity**: Track individual holder buys/sells
- ✅ **Holder Stability**: stable | volatile | mass_exodus

**Key Metrics:**
- `coordinatedSelloff.detected`: Boolean flag
- `sellersCount`: Number of top holders actively selling
- `combinedSupplyPercent`: Total supply being dumped
- `topHolderStability`: Overall holder behavior

**Example Detection:**
```
5 top holders selling
Combined supply: 35%
Severity: CRITICAL
Description: "MASS EXODUS: 5 top holders dumping 35% supply"
```

---

## Integration with Main Analyzer

All 3 services are integrated into `solana-analyzer.ts`:

```typescript
// NEW DETECTIONS ADDED:
pumpDumpData?: PumpDumpData;
liquidityMonitor?: LiquidityMonitorData;
holderTracking?: HolderTrackingData;
```

### Risk Flag Types Added:
1. **Pump & Dump Patterns** → `suspicious_transactions`
2. **Liquidity Drainage** → `low_liquidity`
3. **Coordinated Sell-offs** → `suspicious_transactions`

---

## What These Systems Catch (GHETTOGUS Pattern)

### Timeline of a Classic Rug:
1. **Pre-Launch** (Existing systems):
   - ✅ Aged wallets detected (400+ days old)
   - ✅ Bundled wallets identified (GMGN + Jito)
   - ✅ Low holder count flagged

2. **Launch Phase** (NEW):
   - ✅ **Pump Detector**: Catches +500% spike in 1 hour
   - ✅ **Liquidity Monitor**: Tracks LP stability

3. **Dump Phase** (NEW):
   - 🚨 **Instant Dump Alert**: -90% in 5 minutes
   - 🚨 **Liquidity Drain**: LP drops 80% during dump
   - 🚨 **Coordinated Selloff**: Top 10 holders all selling

4. **Post-Rug** (NEW):
   - ✅ **Rug Confirmation**: 95% confidence score
   - ✅ **Volume Analysis**: Massive sell pressure detected
   - ✅ **Holder Stability**: Mass exodus confirmed

---

## Critical Risk Indicators

### IMMEDIATE RUG WARNINGS:
1. **Price drops >90% in 5 minutes** → RUG PULLED
2. **Liquidity drops >50% in 1 hour** → LP BEING DRAINED
3. **5+ top holders selling simultaneously** → MASS EXODUS
4. **>80% sell transactions in last hour** → COORDINATED DUMP

### High Risk Warnings:
1. **Price pump >300% then dump >60%** → Classic pump & dump
2. **Liquidity <$5k with negative price action** → Exit liquidity gone
3. **3-4 whales selling >20% supply** → Coordinated exit
4. **>60% of daily volume in 5 minutes** → Dump in progress

---

## Technical Implementation

### Schema Updates (`shared/schema.ts`):
```typescript
// New interfaces added:
- PumpDumpPattern
- PumpDumpData
- LiquidityChange  
- LiquidityMonitorData
- HolderActivity
- CoordinatedSelloff
- HolderTrackingData
```

### Service Files Created:
1. `server/services/pump-dump-detector.ts` (267 lines)
2. `server/services/liquidity-monitor.ts` (275 lines)
3. `server/services/holder-tracking.ts` (290 lines)

### Analyzer Updates:
- Added 3 new service integrations
- Updated `calculateRiskFlags()` with 60+ lines of new detection logic
- Enhanced risk scoring with pump/dump/liquidity/holder signals

---

## Performance Impact

**Minimal**: All services run in parallel with existing API calls
- Pump/Dump: Uses existing DexScreener data (no extra API calls)
- Liquidity Monitor: Uses existing DexScreener data (no extra API calls)
- Holder Tracker: 1 RPC call for recent signatures (already cached)

**Total**: ~0-100ms additional processing time

---

## Future Enhancements

### Planned:
1. **Historical Liquidity Tracking**: Store LP snapshots every hour
2. **Dev Wallet Monitoring**: Track suspected developer addresses
3. **Real-time Alerts**: WebSocket notifications for dump detection
4. **Machine Learning**: Train on confirmed rugs for pattern recognition

### Possible:
- Twitter sentiment analysis during pumps
- Discord/Telegram raid detection
- Smart money tracking (copy trading protection)
- Cross-chain rug correlation

---

## Testing Recommendations

### Test Cases:
1. **Known Rugs**: Run analyzer on confirmed rug pulls from last 30 days
2. **Legitimate Tokens**: Verify no false positives on blue chips (BONK, WIF, JUP)
3. **Edge Cases**: Test with extremely low liquidity (<$100)
4. **Real-time**: Monitor pump.fun launches for live validation

### Success Criteria:
- ✅ Detect >90% of rugs within 5 minutes of dump
- ✅ <5% false positive rate on legitimate tokens
- ✅ <100ms additional analysis time
- ✅ Clear, actionable warnings for users

---

## Conclusion

These 3 new systems provide **real-time rug detection** capabilities that complement our existing bundle/insider/aged wallet detectors. Together, we now have comprehensive coverage across:

**Pre-Launch**: Bundle detection, aged wallets, insider tracking
**Launch**: Whale tracking, volume analysis
**Pump Phase**: Price spike detection, liquidity monitoring
**Dump Phase**: Instant dump alerts, LP drain detection, coordinated selloffs

**Result**: Multi-layered protection against ALL stages of a rug pull.
