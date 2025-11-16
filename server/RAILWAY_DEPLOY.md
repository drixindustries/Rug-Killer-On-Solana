# Railway Deployment Instructions

## Required Environment Variables

Set these in your Railway dashboard under **Variables**:

```
# Core Settings
NODE_ENV=production
SESSION_SECRET=your-random-secret-here-change-me-minimum-32-characters

# Database (optional - uses in-memory if not set)
FORCE_IN_MEMORY_DB=true
DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# RPC Provider (primary)
# Option 1: Full URL
ANKR_RPC_URL=https://rpc.ankr.com/solana/YOUR_ANKR_API_KEY
# Option 2: Just the key (server will build the URL)
# ANKR_API_KEY=YOUR_ANKR_API_KEY

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

### Ankr RPC (URL or Key)
**Purpose**: Primary Solana RPC provider for on-chain data

You can set either:
- `ANKR_RPC_URL` as the full HTTPS endpoint, or
- `ANKR_API_KEY` as the raw key (the server constructs `https://rpc.ankr.com/solana/<KEY>`)

Setup steps:
1. Sign in at https://www.ankr.com
2. Create a Web3 API project → add Solana
3. Copy either the endpoint (for `ANKR_RPC_URL`) or just the key (for `ANKR_API_KEY`)
4. Add to Railway Variables

Notes:
- Do not include quotes or trailing spaces in variable values
- If both are set, `ANKR_RPC_URL` takes precedence
- If none is set, the app falls back to the public Solana RPC

Verify after deploy:
- GET `/api/debug/rpc` → should list `Ankr-Premium` with `host: rpc.ankr.com`
- GET `/api/debug/ping-rpc?count=3` → shows latency and slots

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
