# Railway Deployment Instructions

## Required Environment Variables

Set these in your Railway dashboard under **Variables**:

```
FORCE_IN_MEMORY_DB=true
DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
SESSION_SECRET=your-random-secret-here-change-me
PHANTOM_WALLET_ADDRESS=Demo
NODE_ENV=production
```

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
