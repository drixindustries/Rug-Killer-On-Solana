# dRPC Performance Analysis & Decision

> **Update (2024-11-22):** dRPC has been fully removed from the stack (RPC balancer, webhook services, and documentation) after continued latency and stability issues.

## 🔍 The Issue

**Observed:** dRPC consistently showed 150ms+ latency spikes and erratic webhook delivery.  
**Impact:** Every time the balancer selected dRPC, token scans slowed down and alert latency increased, offsetting recent performance work.

## ✅ Final Decision: Remove dRPC

### New Provider Configuration
```typescript
// RPC Provider Weights (server/services/rpc-balancer.ts)
Ankr:   80 weight - Fast + exchange metadata
Helius: 75 weight - Fast + DAS API labels
Shyft:  60 weight - Reliable fallback
// dRPC: removed (was 30)
```

### Why Removal Was Necessary
1. **Latency Regression** – Even as a fallback, dRPC regularly added 150ms+ to scans, undoing the 3-5× gains from other optimizations.
2. **Unreliable Webhooks** – Maintaining a dedicated dRPC webhook path increased operational overhead while Helius + Ankr already covered the alerting surface.
3. **Simpler Operations** – Fewer env vars, services, and docs to maintain. The remaining providers already deliver the needed throughput.

### Changes Implemented
- Deleted the dRPC provider entry from `server/services/rpc-balancer.ts` (Ankr/Helius/Shyft only).
- Removed `server/services/drpc-webhook.ts` and the `/api/webhooks/drpc` route.
- Cleaned up Alpha Alerts, docs, and env instructions so no DRPC_* variables remain.

## 📈 Monitoring After Removal

- Expect logs such as `[RPC Balancer] Selected Ankr/Helius/Shyft ...` only.
- Webhook health endpoint now reports `helius` status plus timestamp.
- If additional redundancy is required, add another fast provider (e.g., Triton) instead of re-introducing dRPC.

## 🧭 Next Steps

1. Keep watching latency metrics—if Ankr or Helius approach their limits, onboard another premium RPC instead of reverting to dRPC.
2. Update deployment environments to drop any lingering `DRPC_*` secrets.
3. When communicating with users, emphasize that only Helius + Ankr drive Alpha Alerts to avoid confusion.

**Verdict:** ✅ Removing dRPC keeps scans predictable, reduces alert lag, and simplifies operations without sacrificing redundancy.
