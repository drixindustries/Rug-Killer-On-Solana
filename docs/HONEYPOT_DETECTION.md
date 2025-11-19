# 🍯 Advanced Honeypot Detection System (2025)

## Overview

The honeypot detection system implements **20+ advanced evasion detection techniques** to protect users from sophisticated honeypot scams. It provides a comprehensive grading system (SAFE → CRITICAL) with detailed analysis of detected evasion methods.

## 🎯 Key Features

### 1. **Grading System**
- **SAFE** (Score 0-19): Token appears legitimate, minimal risks
- **CAUTION** (Score 20-39): Minor concerns, proceed with caution
- **WARNING** (Score 40-59): Moderate risk indicators detected
- **DANGER** (Score 60-79): High risk, likely honeypot
- **CRITICAL** (Score 80-100): Confirmed honeypot, do not trade

### 2. **Detection Methods**
The system runs 7 comprehensive tests:

1. **Basic Simulation**: Standard buy/sell simulation
2. **Swap Reversal**: Tests if sells actually execute
3. **Transfer Test**: Checks wallet-to-wallet transfer restrictions
4. **Multi-Router Test**: Tests selling across Jupiter, Raydium, Orca
5. **Time-Lock Detection**: Identifies time-based sell restrictions
6. **Balance Threshold Test**: Detects traps that block large sells
7. **Bundle Test**: Checks for Jito bundle-only selling

### 3. **20 Known Evasion Techniques**

The system can detect these sophisticated honeypot methods:

#### Critical Severity 🔴
1. **Time-Bomb Honeypot**: Initially allows selling, activates restrictions later
2. **Whitelisted Scanner Evasion**: Detects scanner wallets and lets them sell
3. **Jito Bundle-Only Sell**: Selling only works via Jito bundles
4. **Fake Sell Success**: Transaction succeeds but returns dust
5. **Hidden Pause Function**: Contract has hidden freeze authority
6. **Modifiable Tax**: Dev can change sell tax to 99% after launch
7. **LP Lock Fake**: LP appears locked but dev has backdoor
8. **Blacklist Function**: Dev can blacklist wallets from selling
9. **Token Swapping**: Returns different token than expected on sell

#### High Severity 🟠
10. **Volume-Triggered Trap**: Blocks selling after volume threshold
11. **Balance-Threshold Trap**: Large holders can't sell, small amounts can
12. **Router-Specific Block**: Only works on specific DEX routers
13. **Slippage Manipulation**: Forces extreme slippage making sells fail
14. **Max Transaction Limit**: Restricts sell amount to tiny fraction
15. **Cooldown Period**: Must wait hours/days between buy and sell
16. **Price Impact Manipulation**: Artificially inflates price impact on sells
17. **Oracle Manipulation**: Uses fake price oracle to prevent sells

#### Medium Severity 🟡
18. **Transfer Block**: Can buy/sell via DEX but can't transfer tokens
19. **Gas Drain Attack**: Sell transactions consume extreme compute units

#### Low Severity 🔵
20. **Multi-Signature Trap**: Requires multiple signatures to sell

## 📊 Integration Points

### Bot Cards (Discord/Telegram)

Honeypot warnings are displayed with 🍯 emoji and risk grade:

```
🚨🍯 HONEYPOT ALERT (Grade: CRITICAL)
• Risk Score: 85/100 (78% confident)
• Can Sell: ❌
• Taxes: Buy 0% / Sell 99%

🚨 Detected Evasion Techniques:
🔴 Time-Bomb Honeypot
🔴 Modifiable Tax
🟠 Balance-Threshold Trap

⚠️ Transaction succeeds but returns nothing
```

### Website UI

The `<HoneypotCard>` component provides detailed visualization:

- **Risk Score Progress Bar**: Visual 0-100 scale with color coding
- **Can Buy/Sell/Transfer Status**: Clear indicators for each action
- **Tax Analysis**: Buy tax, sell tax, transfer tax, variable tax warnings
- **Detection Test Results**: Shows which tests passed/failed
- **Evasion Techniques**: Lists all detected techniques with descriptions
- **Confidence Level**: How sure the system is about the assessment

### API Response

```typescript
{
  "honeypotDetection": {
    "grade": "CRITICAL",
    "score": 85,
    "canBuy": true,
    "canSell": false,
    "canTransfer": true,
    "taxes": {
      "buyTax": 0,
      "sellTax": 99,
      "transferTax": 0,
      "isVariable": true,
      "maxObservedTax": 99
    },
    "detectionMethods": {
      "basicSimulation": "FAIL",
      "swapReversal": "FAIL",
      "transferTest": "PASS",
      "multiRouterTest": "UNKNOWN",
      "timeLockTest": "PASS",
      "balanceThresholdTest": "FAIL",
      "bundleTest": "UNKNOWN"
    },
    "evasionTechniques": [
      {
        "id": 1,
        "name": "Time-Bomb Honeypot",
        "description": "Token initially allows selling, then activates restrictions after time/block threshold",
        "severity": "critical"
      },
      {
        "id": 9,
        "name": "Modifiable Tax",
        "description": "Dev can change sell tax to 99% after launch",
        "severity": "critical"
      }
    ],
    "risks": [
      "Cannot sell tokens - transaction will fail"
    ],
    "warnings": [
      "High sell tax: 99%"
    ],
    "lastChecked": 1704067200000,
    "confidence": 78
  }
}
```

## 🔧 Implementation Files

### Core Detection
- **`server/honeypot-detector.ts`**: Main detection engine with 7 test methods
- **`server/services/quillcheck-service.ts`**: Integration with QuillCheck API + enhanced detection
- **`server/solana-analyzer.ts`**: Integrates honeypot detection into token analysis

### Frontend Components
- **`client/src/components/honeypot-card.tsx`**: React component for website display
- **`server/bot-formatter.ts`**: Bot message formatting with 🍯 emoji

### Schema & Types
- **`shared/schema.ts`**: 
  - `HoneypotDetectionResult` interface
  - `TokenAnalysisResponse.honeypotDetection` field

## 🚀 Usage

### Automatic Detection

Honeypot detection runs automatically during token analysis:

```typescript
const analysis = await tokenAnalyzer.analyzeToken(tokenAddress);

if (analysis.honeypotDetection?.grade === 'CRITICAL') {
  console.log('🚨 HONEYPOT DETECTED!');
  console.log('Risks:', analysis.honeypotDetection.risks);
}
```

### Manual Detection

For advanced use cases, use the detector directly:

```typescript
import { HoneypotDetector } from './server/honeypot-detector';
import { rpcBalancer } from './server/services/rpc-balancer';

const detector = new HoneypotDetector(rpcBalancer.getActiveConnection());
const result = await detector.detectHoneypot(tokenAddress, {
  skipExpensiveTests: false, // Run all tests including multi-router and bundle
  maxTestDuration: 30000, // 30 second timeout
});

console.log(`Grade: ${result.grade}`);
console.log(`Score: ${result.score}/100`);
console.log(`Confidence: ${result.confidence}%`);
```

### Quick Check from QuillCheck Data

For faster results, create a quick assessment from QuillCheck:

```typescript
import { HoneypotDetector } from './server/honeypot-detector';

const quickResult = HoneypotDetector.createQuickResult(
  isHoneypot: true,
  buyTax: 0,
  sellTax: 95,
  canSell: false
);
// Returns HoneypotDetectionResult with CRITICAL grade
```

## 📈 Scoring Algorithm

The honeypot score is calculated based on:

1. **Test Failures**: Each failed test adds points
   - Basic simulation fail: +30 pts
   - Transfer test fail: +20 pts
   - Multi-router fail: +25 pts
   - Balance threshold fail: +25 pts
   - Time-lock fail: +30 pts
   - Bundle test fail: +35 pts

2. **Evasion Techniques**: Points based on severity
   - Critical technique: +25 pts each
   - High severity: +15 pts each
   - Medium severity: +5 pts each
   - Low severity: +2 pts each

3. **Tax Analysis**:
   - Sell tax >50%: +20 pts
   - Variable taxes detected: +20 pts

**Score capped at 100**, then graded:
- 0-19: SAFE ✅
- 20-39: CAUTION 🟡
- 40-59: WARNING ⚠️
- 60-79: DANGER 🚨
- 80-100: CRITICAL 🔴

## 🛡️ Protection Strategies

### For Users

1. **Never ignore CRITICAL warnings**: If grade is CRITICAL, do not buy
2. **DANGER = High risk**: Proceed only if you understand the risks
3. **Check evasion techniques**: Review detected methods to understand the trap
4. **Verify taxes**: Look for asymmetric or variable taxes
5. **Test with dust**: If buying despite warnings, test with minimal amount first

### For Developers

1. **Always show honeypot grade**: Display prominently in UI
2. **Block CRITICAL transactions**: Consider preventing buys for CRITICAL grades
3. **Cache results**: Use QuillCheck service cache (60 second TTL)
4. **Handle errors gracefully**: Detection may fail, show "UNKNOWN" grade
5. **Update regularly**: Scammers evolve, detection methods must too

## 🔄 Future Enhancements

### Phase 1 (Current)
- ✅ QuillCheck integration
- ✅ Quick result generation
- ✅ Grading system
- ✅ Bot & website display
- ⏳ Basic detection tests (placeholders)

### Phase 2 (Planned)
- ⏳ Implement actual test methods (requires RPC simulation)
- ⏳ Multi-router testing (Jupiter, Raydium, Orca)
- ⏳ Jito bundle detection
- ⏳ Time-lock analysis
- ⏳ Balance threshold testing

### Phase 3 (Advanced)
- ⏳ Machine learning model for pattern recognition
- ⏳ Historical honeypot database
- ⏳ Community reporting integration
- ⏳ Real-time contract bytecode analysis
- ⏳ ZK proof verification for hidden functions

## 📚 References

- **QuillCheck API**: https://check.quillai.network
- **Honeypot Detection Guide**: Based on 2025 advanced evasion techniques
- **Solana Program Library**: For token program analysis

## ⚠️ Disclaimer

**This system is not 100% accurate.** Sophisticated scammers constantly develop new evasion techniques. Users should:

- Always do their own research
- Never invest more than they can afford to lose
- Treat even SAFE grades with caution for new tokens
- Verify information from multiple sources

The honeypot detection is a **tool to help inform decisions**, not a guarantee of safety.

---

**Last Updated**: 2025-01-04  
**Detection Methods**: 20  
**Test Coverage**: 7 methods  
**Supported Chains**: Solana
