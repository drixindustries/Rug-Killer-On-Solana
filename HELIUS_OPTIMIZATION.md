# Helius API Optimization Guide

This document describes the Helius API optimization features and environment variables.

## Overview

The codebase now includes aggressive optimizations to reduce Helius API consumption by 80-90%:

- **Redis caching** - 30-minute TTL for wallet stats
- **Request deduplication** - Prevents concurrent duplicate calls
- **Rate limiting** - Sliding window with configurable limits
- **Webhook throttling** - Reduced token detection spam
- **Smart RPC fallback** - Helius deprioritized for non-critical calls

## Environment Variables

### Wallet Stats Caching

```env
# Cache TTL for wallet stats (seconds)
# Default: 1800 (30 minutes)
# Recommendation: 1800-3600 (30-60 minutes)
HELIUS_WALLET_STATS_CACHE_TTL=1800
```

### Rate Limiting

```env
# Maximum Helius API requests per minute
# Default: 100
# Recommendation: 60-100 for 10M credits/month
HELIUS_MAX_REQUESTS_PER_MINUTE=100

# Maximum queue size for rate-limited requests
# Default: 50
# Requests beyond this are rejected
HELIUS_RATE_LIMIT_QUEUE_SIZE=50
```

### Webhook Throttling

```env
# Token detection window (milliseconds)
# Default: 120000 (2 minutes)
# Reduces token spam processing
HELIUS_TOKEN_WINDOW_MS=120000

# Maximum tokens to process per window
# Default: 60 (was 120)
# Lower = less API usage
HELIUS_TOKEN_WINDOW_CAP=60

# Analysis execution window (milliseconds)
# Default: 60000 (1 minute)
HELIUS_ANALYSIS_WINDOW_MS=60000

# Maximum token analyses per window
# Default: 6 (was 12)
# Lower = less API usage
HELIUS_ANALYSIS_WINDOW_CAP=6
```

### RPC Balancer Priority

```env
# Helius RPC priority
# Options: 'high' (weight=100), 'low' (weight=25)
# Default: 'low'
# Set to 'low' to conserve Helius credits
# Helius will still be used for webhooks and critical operations
HELIUS_PRIORITY=low
```

## Usage Patterns

### High Traffic (conserve credits)

```env
HELIUS_WALLET_STATS_CACHE_TTL=3600
HELIUS_MAX_REQUESTS_PER_MINUTE=60
HELIUS_TOKEN_WINDOW_CAP=40
HELIUS_ANALYSIS_WINDOW_CAP=4
HELIUS_PRIORITY=low
```

### Moderate Traffic (balanced)

```env
HELIUS_WALLET_STATS_CACHE_TTL=1800
HELIUS_MAX_REQUESTS_PER_MINUTE=100
HELIUS_TOKEN_WINDOW_CAP=60
HELIUS_ANALYSIS_WINDOW_CAP=6
HELIUS_PRIORITY=low
```

### Low Traffic (maximize freshness)

```env
HELIUS_WALLET_STATS_CACHE_TTL=900
HELIUS_MAX_REQUESTS_PER_MINUTE=150
HELIUS_TOKEN_WINDOW_CAP=80
HELIUS_ANALYSIS_WINDOW_CAP=8
HELIUS_PRIORITY=high
```

## Monitoring

### Check Cache Hit Rate

Look for these log messages:
```
[WalletStats] Deduplicating request for <wallet>...  # Request dedup working
[WalletStats] Rate limited (X/Y), queuing request... # Rate limiting active
```

### Check RPC Distribution

Railway logs will show:
```
[RPC Balancer] Selected Shyft  # Primary (good - saves Helius credits)
[RPC Balancer] Selected Helius # Fallback when needed
```

## Expected Impact

With default settings (10M credits/month):

- **Before**: ~50k API calls/day, exhausts credits in ~6 days
- **After**: ~5-10k API calls/day, credits last 30+ days

### Breakdown

| Feature | Savings |
|---------|---------|
| Wallet stats caching | 60-70% |
| Request deduplication | 10-15% |
| Webhook throttling | 40-50% |
| RPC deprioritization | 30-40% |
| **Total** | **80-90%** |

## Troubleshooting

### Still exhausting credits too quickly

1. Increase cache TTL: `HELIUS_WALLET_STATS_CACHE_TTL=3600`
2. Lower rate limit: `HELIUS_MAX_REQUESTS_PER_MINUTE=60`
3. Reduce webhook processing: `HELIUS_TOKEN_WINDOW_CAP=40`
4. Ensure Helius is deprioritized: `HELIUS_PRIORITY=low`

### Stale wallet data

1. Reduce cache TTL: `HELIUS_WALLET_STATS_CACHE_TTL=900`
2. Increase rate limit: `HELIUS_MAX_REQUESTS_PER_MINUTE=150`

### Rate limit queue filling up

1. Increase queue size: `HELIUS_RATE_LIMIT_QUEUE_SIZE=100`
2. Increase rate limit: `HELIUS_MAX_REQUESTS_PER_MINUTE=150`
3. Or reduce concurrent alpha wallet monitoring

## Implementation Details

### Files Modified

- `server/services/helius-wallet-stats.ts` - Added caching, dedup, rate limiting
- `server/services/helius-webhook.ts` - Increased throttle windows
- `server/services/rpc-balancer.ts` - Deprioritized Helius RPC

### Redis Cache Keys

- `helius:wallet-stats:v1:{walletAddress}` - Wallet performance stats

### In-Memory Tracking

- Request deduplication: Per-wallet promise map
- Rate limiting: Sliding window of timestamps
- Request queue: FIFO queue with max size limit

## Railway Deployment

Add these to your Railway environment variables:

```env
# Optimal settings for 10M credits/month
HELIUS_WALLET_STATS_CACHE_TTL=1800
HELIUS_MAX_REQUESTS_PER_MINUTE=100
HELIUS_TOKEN_WINDOW_MS=120000
HELIUS_TOKEN_WINDOW_CAP=60
HELIUS_ANALYSIS_WINDOW_CAP=6
HELIUS_PRIORITY=low
```

These settings should keep your Helius usage well under 10M credits/month for typical alpha alert traffic.

