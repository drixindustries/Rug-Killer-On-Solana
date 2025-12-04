# Railway Deployment Guide

## 🚀 Quick Start

### Step 1: Connect Your Repository

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository: `Rug-Killer-On-Solana`
4. Railway will automatically detect your `railway.json` and `Dockerfile`

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically create a `DATABASE_URL` environment variable
3. Your app will automatically connect to it!

### Step 3: Configure Environment Variables

Go to your service → **Variables** tab and add these:

## 📋 Required Environment Variables

### Core Configuration
```bash
NODE_ENV=production
PORT=8080  # Railway sets this automatically, but you can override
SESSION_SECRET=your-random-secret-key-here  # Generate with: openssl rand -hex 32
```

### Database (Auto-configured by Railway)
```bash
DATABASE_URL=postgresql://...  # Automatically set when you add PostgreSQL
```

### Solana RPC (Required)
```bash
# At least ONE of these is required:
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# OR use a premium RPC:
HELIUS_API_KEY=your-helius-api-key
ANKR_API_KEY=your-ankr-api-key
```

### Optional Services

#### Redis (for caching - recommended)
```bash
REDIS_URL=redis://...  # Add Redis service in Railway, or use external Redis
```

#### Telegram Bot (optional)
```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app/api/telegram/webhook
```

#### Discord Bot (optional)
```bash
DISCORD_ENABLED=true
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
```

#### Alpha Alerts (optional)
```bash
ALPHA_ALERTS_ENABLED=true
```

#### Whop Integration (optional)
```bash
WHOP_API_KEY=your-whop-api-key
```

#### Other Optional Services
```bash
# Dune Analytics (for smart wallet data)
DUNE_API_KEY=your-dune-api-key

# GitHub (for repo analysis)
GITHUB_TOKEN=your-github-token

# Webhook Services
ENABLE_ANKR_WS=true  # Enable Ankr WebSocket (requires ANKR_API_KEY)

# Debug (only in development)
DEBUG_ANALYZER=false
DEBUG_HOLDER_ANALYSIS=false
ENABLE_DEBUG_ENDPOINTS=false
```

## 🔧 Deployment Process

### Automatic Deployments
- Every push to `main` branch triggers a new deployment
- Railway builds your Docker image automatically
- Migrations run automatically on startup

### Manual Deployment
If you need to deploy manually:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## ✅ Verification

After deployment:

1. Check your service logs in Railway dashboard
2. Visit your app URL (Railway provides this automatically)
3. Test the health endpoint: `https://your-app.railway.app/api/health`
4. Check that migrations ran successfully in the logs

## 🐛 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Dockerfile is correct
- Check build logs in Railway dashboard

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running in Railway
- Ensure migrations directory exists

### App Crashes on Startup
- Check environment variables are all set
- Review logs in Railway dashboard
- Verify `SESSION_SECRET` is set (required for sessions)

### Migrations Not Running
- Check logs for migration errors
- Verify migrations directory is copied in Dockerfile
- Ensure database has proper permissions

## 📝 Notes

- Railway automatically provides `PORT` environment variable
- Your `railway.json` configures health checks at `/api/health`
- The Dockerfile builds both frontend and backend
- Migrations run automatically on each deployment
- Debug logging is disabled in production by default

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- Your app will be available at: `https://your-project-name.railway.app`

