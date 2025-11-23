# Ankr API Integration Setup

## Overview
This project now integrates Ankr API in two ways:
1. **Backend**: Solana RPC endpoint for blockchain queries
2. **Frontend**: React hooks for token/NFT data (EVM chains)

## Backend Setup (Solana RPC)

### 1. Get Your Ankr API Key
1. Visit [Ankr.com](https://www.ankr.com/)
2. Sign up or log in
3. Navigate to API section
4. Create a new Solana endpoint
5. Copy your API key

### 2. Configure Environment Variable
Edit your `.env` file and replace the placeholder:

```bash
# Replace this:
ANKR_API_KEY=YOUR_ANKR_API_KEY_HERE

# With your actual key:
ANKR_API_KEY=your_actual_api_key_here_no_quotes
```

**Important**: Remove any quotes around the key. The system will handle it correctly.

### 3. Verify Backend Configuration
The backend will automatically:
- Build the Ankr RPC URL: `https://rpc.ankr.com/solana/{YOUR_KEY}`
- Use it as a premium RPC provider with 65% weight
- Log connection status on startup

Check logs for:
```
[Ankr Config] ANKR_API_KEY present: true
[Ankr Config] Ankr URL configured
```

## Frontend Setup (React Hooks)

### 1. Add Frontend Environment Variable
Create or update `.env` with the Vite-specific variable:

```bash
# For frontend React hooks (optional - for EVM chains)
VITE_ANKR_API_KEY=your_ankr_api_key_here
```

**Note**: Vite requires the `VITE_` prefix for environment variables accessible in the browser.

### 2. Usage in React Components

The Ankr Provider is already configured in `App.tsx`. Use the custom hooks:

```typescript
import { useAnkrAccountBalance, useAnkrTokenHolders } from '@/hooks/use-ankr-token-data';

function MyComponent() {
  // Get account balance (EVM chains)
  const { balances, totalBalanceUsd } = useAnkrAccountBalance(
    '0x1234...', 
    ['eth', 'polygon', 'bsc']
  );

  // Get token holders (EVM chains)
  const { holders } = useAnkrTokenHolders(
    '0xTokenAddress...',
    'eth'
  );

  return <div>Balance: ${totalBalanceUsd}</div>;
}
```

### 3. Important: Solana vs EVM

**Ankr React Hooks** are designed for EVM-compatible chains (Ethereum, BSC, Polygon, etc.).

For **Solana-specific data**, use:
- Backend API endpoints (already configured)
- Solana web3.js directly
- Existing `/api/scan` endpoints

Example:
```typescript
// For Solana tokens, use backend API:
const response = await fetch('/api/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    contractAddress: 'SolanaTokenAddress...',
    scanType: 'token'
  })
});
```

## Testing

### Backend (Solana RPC)
```bash
# The system will auto-test on startup
npm run dev

# Look for these logs:
# [Ankr Config] ANKR_API_KEY present: true
# [RPC Balancer] Ankr provider available and healthy
```

### Frontend (React Hooks)
```bash
# Start the dev server
npm run dev

# Open browser console and check for:
# - No Ankr provider errors
# - Successful API calls (if using EVM chains)
```

## Supported Chains

### Backend (Solana RPC)
- ✅ Solana Mainnet
- ✅ Solana Devnet (configure different endpoint)

### Frontend (React Hooks)
- ✅ Ethereum (eth)
- ✅ BSC (bsc)
- ✅ Polygon (polygon)
- ✅ Arbitrum (arbitrum)
- ✅ Avalanche (avalanche)
- ✅ Optimism (optimism)
- ✅ Fantom (fantom)
- ✅ Base (base)

**Note**: Solana support for React hooks is limited. Use backend API for Solana.

## Troubleshooting

### "No Ankr API key found"
- Check `.env` file exists in project root
- Verify `ANKR_API_KEY` is set without quotes
- Restart the server after changing `.env`

### "Ankr: Failed (Expected type | type but received [object Object] [union])"
This is the error from your screenshot. It indicates:
- Type mismatch in API response
- Usually caused by incorrect API endpoint
- **Solution**: Ensure you're using the correct Solana endpoint format

### Rate Limiting
- Free tier: 500 requests/minute
- Premium tier: Higher limits
- Backend auto-handles rate limiting with fallback RPCs

## Performance

The RPC balancer prioritizes providers:
1. **dRPC** (70% weight) - Primary
2. **Ankr** (65% weight) - Secondary ✨
3. **Shyft** (60% weight) - Tertiary
4. **Helius** (50% weight) - Quaternary
5. Public fallbacks (30% weight) - Last resort

Ankr provides:
- Low latency
- High reliability
- Automatic failover
- Connection pooling

## Resources

- [Ankr Documentation](https://www.ankr.com/docs/)
- [Ankr React Hooks](https://www.ankr.com/docs/advanced-api/react-hooks/)
- [Get API Key](https://www.ankr.com/rpc/)
- [Pricing Plans](https://www.ankr.com/rpc/pricing/)
