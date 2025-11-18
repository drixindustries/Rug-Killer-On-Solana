# Railway Deployment Instructions

## Required Environment Variables

Set these in your Railway dashboard under **Variables**:

```
# Core Settings
NODE_ENV=production
SESSION_SECRET=your-random-secret-here-change-me-minimum-32-characters
ENABLE_DEBUG_ENDPOINTS=false
DEBUG_ENDPOINTS_TOKEN=your-strong-random-debug-token

# Database (optional - uses in-memory if not set)
FORCE_IN_MEMORY_DB=true
DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# RPC Providers (recommended for production)
QUICKNODE_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/
SHYFT_KEY=your_shyft_api_key_here
HELIUS_API_KEY=your_helius_api_key_here

# API Keys (optional but recommended for best results)
BIRDEYE_API_KEY=c0ecda95a02f4b69ba76c48bd5f830b5

# Demo Mode (optional)
PHANTOM_WALLET_ADDRESS=Demo
```

## Critical API Keys

### Birdeye API Key
**Purpose**: Enhanced market data, social links (Twitter/Telegram/Website), LP burn status

**How to Set**:
1. Go to Railway Dashboard → Your Service → **Variables** tab
2. Click **"New Variable"**
3. Set **Name**: `BIRDEYE_API_KEY`
4. Set **Value**: `c0ecda95a02f4b69ba76c48bd5f830b5` (or your key)
5. Click **"Add"**

**Note**: Birdeye is optional - analyzer will work without it but won't have social links or enhanced market data.

### QuickNode RPC (Primary - Recommended)
**Purpose**: Primary Solana RPC provider for on-chain data

Setup steps:
1. Go to https://www.quicknode.com/
2. Sign up and create a new endpoint
3. Select "Solana" → "Mainnet"
4. Copy your HTTPS endpoint URL
5. Add to Railway Variables as `QUICKNODE_RPC_URL`

**Note**: If not set, the app will use Shyft, Helius, or fall back to the public Solana RPC.

### Shyft RPC (Secondary - Recommended)
**Purpose**: Secondary RPC provider for load balancing

Setup steps:
1. Go to https://shyft.to/
2. Sign up and get your API key
3. Add to Railway Variables as `SHYFT_KEY`

### Helius RPC (Tertiary - Optional)
**Purpose**: Additional RPC provider for reliability

Setup steps:
1. Go to https://www.helius.dev/
2. Sign up and get your API key
3. Add to Railway Variables as `HELIUS_API_KEY`

## How to Deploy

1. Push code to GitHub
2. Railway will auto-deploy
3. Check the build logs
4. Health check at `/api/health` should return `{"status":"ok"}`

## Troubleshooting

If deployment fails:
- Check Railway build logs for errors
- Verify all environment variables are set
- Ensure `nixpacks.toml` exists in server directory
- Check that `package.json` has `tsx` dependency

## Current Configuration

- **Runtime**: Node.js 20
- **Build**: `npm install`
- **Start**: `npm start` (runs `tsx index.ts`)
- **Database**: In-memory mode (no PostgreSQL needed)
- **Port**: Auto-assigned by Railway
