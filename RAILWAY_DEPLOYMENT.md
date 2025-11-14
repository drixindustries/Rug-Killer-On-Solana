# 🚂 Railway Deployment Guide

Complete guide to deploying Solana Rug Killer on Railway with PostgreSQL, custom domain, and SSL.

---

## 📋 Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub account with repository access
- Custom domain (optional, e.g., `rugkilleralphabot.fun`)
- API keys for external services

---

## 🚀 Step 1: Create Railway Project

1. **Sign in to Railway** → [railway.app](https://railway.app)
2. **New Project** → "Deploy from GitHub repo"
3. **Connect GitHub** → Select `Rug-Killer-On-Solana` repository
4. **Select Branch** → `main`

Railway will automatically detect the Node.js project and start building.

---

## 🗄️ Step 2: Add PostgreSQL Database

1. **Click "New"** in your project
2. **Select "Database"** → **"Add PostgreSQL"**
3. Railway automatically provisions a PostgreSQL instance

**Important:** The database is created but NOT automatically linked to your service.

---

## 🔗 Step 3: Link Database to Service

### Manual Variable Linking

1. **Go to your service** (Rug-Killer-On-Solana)
2. **Click "Variables" tab** (at the top, next to "Deployments")
3. **Add New Variable:**
   - **Name:** `DATABASE_URL`
   - **Value:** Click the dropdown → Select **`${{Postgres.DATABASE_URL}}`**

This creates a dynamic reference that auto-updates if the database credentials change.

### Alternative: Copy Raw URL

If the reference doesn't work:
1. Go to **Postgres service** → **Variables tab**
2. Copy the `DATABASE_URL` value
3. Paste it into your **service's Variables** tab

---

## ⚙️ Step 4: Environment Variables

Add these variables in your service's **Variables** tab:

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=${{PORT}}
BASE_URL=https://rugkilleralphabot.fun

# Database (already added in Step 3)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Solana RPC (comma-separated for load balancing)
SOLANA_RPC_ENDPOINTS=https://api.mainnet-beta.solana.com,https://mainnet.helius-rpc.com

# API Keys
HELIUS_API_KEY=your_helius_key_here
BIRDEYE_API_KEY=your_birdeye_key_here
GOPLUS_API_KEY=your_goplus_key_here
OPENAI_API_KEY=your_openai_key_here
```

### Optional Bot Variables

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_INVITE_URL=https://discord.gg/your_invite
```

### Optional Subscription Management

```bash
# Whop (payment/subscriptions)
WHOP_API_KEY=your_whop_api_key
WHOP_PLAN_IDS=plan_free,plan_pro,plan_whale
```

---

## 🔧 Step 5: Build Configuration

Railway auto-detects settings from `package.json`, but verify:

### Build Settings (in Railway Settings tab)

- **Build Command:** `npm run build`
- **Start Command:** `npm run start`
- **Install Command:** `npm install`

These should be auto-detected. If not, set them manually in **Settings** → **Build**.

---

## 🌐 Step 6: Custom Domain Setup

### Add Domain in Railway

1. **Go to service Settings** → **Domains**
2. **Click "Generate Domain"** (optional - for Railway subdomain)
3. **Click "Custom Domain"** → Enter `rugkilleralphabot.fun`

### Configure DNS at Domain Provider (Porkbun/Cloudflare/etc)

Add these DNS records:

#### Option A: CNAME (Recommended)
```
Type: CNAME
Name: @
Value: your-service.up.railway.app
TTL: Auto/3600
```

#### Option B: A Record
```
Type: A
Name: @
Value: [Railway provides the IP]
TTL: Auto/3600
```

#### Add WWW Subdomain (Optional)
```
Type: CNAME
Name: www
Value: rugkilleralphabot.fun
TTL: Auto/3600
```

**Note:** DNS propagation takes 5-60 minutes.

---

## 🔒 Step 7: SSL/HTTPS

Railway **automatically provisions SSL certificates** for all domains. No manual configuration needed!

- ✅ Automatic SSL via Let's Encrypt
- ✅ Auto-renewal
- ✅ HTTPS enforced

**The SSL files in `./ssl/` are NOT needed for Railway** - they're only for manual server deployments.

---

## 🗃️ Step 8: Database Migrations

Railway doesn't auto-run migrations, so you need to run them manually after first deployment:

### Option A: Local Migration (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to Project:**
   ```bash
   railway link
   ```

4. **Run Migration:**
   ```bash
   railway run npm run db:push
   ```

### Option B: One-time Deployment Script

Add to `package.json` scripts:
```json
{
  "scripts": {
    "railway:migrate": "npm run db:push",
    "start": "npm run db:push && node dist/index.js"
  }
}
```

**⚠️ Warning:** This runs migrations on every deploy. Remove after first successful migration.

---

## 📊 Step 9: Verify Deployment

### Check Deployment Logs

1. **Go to service** → **Deployments** tab
2. **Click latest deployment** → View logs
3. **Look for:**
   ```
   ✅ Database connected
   📡 serving on port 5000
   ✅ Discord bot logged in
   ✅ Telegram bot started
   ```

### Test Endpoints

Visit your domain:
- `https://rugkilleralphabot.fun` - Frontend should load
- `https://rugkilleralphabot.fun/api/health` - Should return `{"status":"ok"}`

### Common Errors

#### `DATABASE_URL must be set`
- **Fix:** Add DATABASE_URL variable reference in Variables tab

#### `Cannot find package 'dd-trace'`
- **Fix:** Already fixed - ensure latest code is deployed (commit `479c29e`)

#### `Cannot find package 'pg'`
- **Fix:** Run `npm install pg` locally, commit `package.json`

#### Database Connection Failed
- **Fix:** Verify DATABASE_URL reference is `${{Postgres.DATABASE_URL}}`

---

## 🔄 Step 10: Continuous Deployment

Railway automatically redeploys when you push to GitHub:

1. **Make code changes locally**
2. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. **Railway detects push** → Builds → Deploys automatically

---

## 🎛️ Railway Dashboard Overview

### Service Tabs

- **Deployments** - View build/deploy logs, rollback versions
- **Variables** - Manage environment variables
- **Metrics** - CPU, memory, network usage
- **Settings** - Domain, build commands, restart policy
- **Observability** - Logs, traces (if enabled)

### Postgres Tabs

- **Data** - Browse database tables (limited)
- **Variables** - View DATABASE_URL and credentials
- **Metrics** - Database performance
- **Settings** - Backup, scaling options

---

## 💰 Costs

Railway pricing (as of 2025):

- **Free Tier:** $5 credit/month
- **Pro Plan:** $20/month + usage
  - ~$0.000463/GB-hour for memory
  - ~$0.000231/vCPU-hour for CPU
  - PostgreSQL included

**Estimated Monthly Cost:**
- Small app: ~$10-20/month
- Medium traffic: ~$30-50/month

---

## 🛠️ Maintenance

### View Logs
```bash
railway logs
```

### Restart Service
Dashboard → Service → **"Restart"** button

### Scale Resources
Settings → **"Resources"** → Adjust memory/CPU

### Backup Database
Postgres service → Settings → **"Create Backup"**

---

## 🚨 Troubleshooting

### Deployment Fails

1. Check build logs for errors
2. Verify all environment variables are set
3. Ensure `DATABASE_URL` is linked correctly

### 502 Bad Gateway

- Service crashed - check logs
- Database not connected - verify DATABASE_URL
- Port mismatch - use `${{PORT}}` variable

### Database Connection Timeout

- Check DATABASE_URL format
- Verify Postgres service is running
- Check for firewall issues (rare on Railway)

### Bots Not Starting

- Verify bot tokens are correct
- Check logs for authentication errors
- Ensure tokens are not placeholder values

---

## 📝 Post-Deployment Checklist

- ✅ Database migrations run successfully
- ✅ Health endpoint returns 200 OK
- ✅ Frontend loads at custom domain
- ✅ HTTPS/SSL working (green padlock)
- ✅ Telegram bot responding to commands
- ✅ Discord bot online and responding
- ✅ Token analysis working (test with known address)
- ✅ Environment variables all set correctly
- ✅ DNS propagated to custom domain

---

## 🔗 Useful Links

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Railway CLI:** [docs.railway.app/develop/cli](https://docs.railway.app/develop/cli)
- **Postgres Docs:** [railway.app/docs/databases/postgresql](https://railway.app/docs/databases/postgresql)
- **Domain Setup:** [docs.railway.app/deploy/exposing-your-app](https://docs.railway.app/deploy/exposing-your-app)

---

## 🎉 Success!

Your Solana Rug Killer app is now deployed on Railway with:

- ✅ PostgreSQL database
- ✅ Custom domain with SSL
- ✅ Automatic deployments from GitHub
- ✅ Telegram & Discord bots running
- ✅ Full token analysis features

**Next Steps:**
1. Test all features thoroughly
2. Monitor logs for any errors
3. Set up monitoring/alerts
4. Share your domain with users!

---

**Need Help?** Check Railway's [community Discord](https://discord.gg/railway) or documentation.
