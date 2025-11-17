# 🚀 Deployment Guide - Rug Killer on Solana

Complete guide to deploy your Rug Killer application to production.

---

## 🚂 Railway Deployment (Recommended - Easiest)

Railway offers free tier with PostgreSQL included and automatic deployments from GitHub.

### Step 1: Prerequisites
- GitHub account (already have ✅)
- Railway account (free at https://railway.app)
- Environment variables ready

### Step 2: Deploy to Railway

#### Option A: Web Interface (Easiest)

1. **Go to Railway**: https://railway.app
2. **Sign in with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose**: `drixindustries/Rug-Killer-On-Solana`
6. **Click "Deploy Now"**

#### Option B: Railway Button (One-Click)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/drixindustries/Rug-Killer-On-Solana)

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"**
2. Select **"Database" → "PostgreSQL"**
3. Railway automatically sets `DATABASE_URL` environment variable

### Step 4: Configure Environment Variables

In Railway dashboard → Your Service → **Variables** tab, add:

```bash
# Required
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key-change-this
ENABLE_DEBUG_ENDPOINTS=false
DEBUG_ENDPOINTS_TOKEN=your-strong-random-debug-token

# RPC Provider (recommended)
ANKR_RPC_URL=https://rpc.ankr.com/solana/YOUR_ANKR_API_KEY

# Alternatively, set only the key (the server constructs the URL):
# ANKR_API_KEY=YOUR_ANKR_API_KEY
# Notes:
# - Do not include quotes or spaces in the value
# - Either `ANKR_RPC_URL` or `ANKR_API_KEY` works; URL takes precedence if both are set
# - To verify RPC, temporarily set `ENABLE_DEBUG_ENDPOINTS=true` and `DEBUG_ENDPOINTS_TOKEN`.
#   Then call `/api/debug/rpc` and `/api/debug/ping-rpc?count=3` with header
#   `x-debug-token: <DEBUG_ENDPOINTS_TOKEN>`; set `ENABLE_DEBUG_ENDPOINTS=false` after.

# API Keys (optional)
BIRDEYE_API_KEY=your-birdeye-api-key-here

# Discord Bot (optional - requires DISCORD_ENABLED=true to activate)
DISCORD_ENABLED=true
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id

# Telegram Bot (optional - requires TELEGRAM_ENABLED=true to activate)
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Pump.fun Webhook (optional but recommended)
ENABLE_PUMPFUN_WEBHOOK=true
PUMP_FUN_WS_URL=wss://pumpportal.fun/api/data

# Detection Services (optional - free tiers available)
QUILLCHECK_API_KEY=your-quillcheck-key
BUBBLEMAPS_API_KEY=your-bubblemaps-key

# Whop Integration (if using paid tiers)
WHOP_API_KEY=your-whop-api-key
WHOP_PLAN_ID_FREE=plan_xxx
WHOP_PLAN_ID_PRO=plan_xxx
WHOP_PLAN_ID_PREMIUM=plan_xxx
```

### Step 5: Deploy

Railway automatically deploys on every push to `main` branch.

**Your app will be live at**: `https://your-project-name.up.railway.app`

### Step 6: Run Database Migrations

In Railway → Your Service → **Deploy Logs**, verify the build succeeded, then:

1. Click **"Settings"** → **"Deploy Command"**
2. Make sure it's set to: `npm start`

Database migrations run automatically on startup via `npm run db:push`.

### Step 7: Verify Deployment

Visit your Railway URL and check:
- ✅ Homepage loads
- ✅ Database connected (no errors in logs)
- ✅ Bots online (check Railway logs for "✅ Telegram bot started" / "✅ Discord bot started")

---

## 🔧 Manual Deployment (Any VPS)

If you prefer to deploy to your own server (DigitalOcean, AWS, etc.):

### Step 1: Server Setup

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install PM2 for process management
npm install -g pm2
```

### Step 2: Clone and Install

```bash
# Clone repository
git clone https://github.com/drixindustries/Rug-Killer-On-Solana.git
cd Rug-Killer-On-Solana

# Install dependencies
npm install

# Build the application
npm run build
```

### Step 3: Set Up PostgreSQL

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE rugkiller;
CREATE USER rugkilleruser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE rugkiller TO rugkilleruser;
\q
```

### Step 4: Configure Environment

```bash
# Create production .env files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit with your values
nano server/.env
```

### Step 5: Run Database Migrations

```bash
npm run db:push
```

### Step 6: Start with PM2

```bash
# Start application
pm2 start npm --name "rug-killer" -- start

# Save PM2 config
pm2 save

# Set PM2 to start on boot
pm2 startup
```

### Step 7: Set Up Nginx (Optional - for custom domain)

```bash
sudo apt-get install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/rugkiller
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/rugkiller /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: SSL Certificate (Optional)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🐳 Docker Deployment

### Step 1: Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://rugkiller:password@db:5432/rugkiller
      - NODE_ENV=production
    env_file:
      - ./server/.env
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rugkiller
      POSTGRES_USER: rugkiller
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Step 3: Deploy

```bash
docker-compose up -d
```

---

## 🔑 Getting API Keys

### Helius (Solana RPC - Recommended)
1. Go to https://www.helius.dev/
2. Sign up for free account
3. Create new project
4. Copy API key → `HELIUS_API_KEY`

### Alchemy (Alternative RPC)
1. Go to https://www.alchemy.com/
2. Sign up for free account
3. Create Solana app
4. Copy API key → `ALCHEMY_API_KEY`

### Discord Bot
1. Go to https://discord.com/developers/applications
2. Create "New Application"
3. Go to "Bot" → "Add Bot"
4. Copy Token → `DISCORD_BOT_TOKEN`
5. Copy Application ID → `DISCORD_CLIENT_ID`
6. Enable "Message Content Intent"
7. **Set environment variable:** `DISCORD_ENABLED=true`
8. Invite bot: `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot`

**Note:** The bot will NOT start without `DISCORD_ENABLED=true` set in your environment variables!

### Telegram Bot
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow instructions
4. Copy token → `TELEGRAM_BOT_TOKEN`
5. **Set environment variable:** `TELEGRAM_ENABLED=true`

**Note:** The bot will NOT start without `TELEGRAM_ENABLED=true` set in your environment variables!

### QuillCheck (Honeypot Detection - Optional)
1. Go to https://quillcheck.io/
2. Sign up for free tier
3. Get API key → `QUILLCHECK_API_KEY`

### Bubblemaps (Network Analysis - Optional)
1. Go to https://bubblemaps.io/
2. Request API access
3. Get API key → `BUBBLEMAPS_API_KEY`

---

## ✅ Post-Deployment Checklist

- [ ] App is accessible at deployment URL
- [ ] Database connection successful (check logs)
- [ ] Homepage loads without errors
- [ ] Token analysis works (test with a known token)
- [ ] Discord bot responds to commands (if enabled)
- [ ] Telegram bot responds to commands (if enabled)
- [ ] Pump.fun webhook connected (check `/api/live-scan/status`)
- [ ] Environment variables set correctly
- [ ] SSL certificate installed (if using custom domain)
- [ ] GitHub repository "About" section updated with deployment URL

---

## 🐛 Troubleshooting

### App won't start
```bash
# Check logs in Railway dashboard or:
pm2 logs rug-killer

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

### Database errors
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Re-run migrations
npm run db:push
```

### Bots not responding
- Verify bot tokens are correct
- Check bot has proper permissions
- Ensure bot is invited to server/channel
- Check Railway logs for bot startup messages

### Pump.fun webhook not working
- Verify `ENABLE_PUMPFUN_WEBHOOK=true`
- Check Railway logs for WebSocket connection
- Test endpoint: `curl https://your-app.railway.app/api/live-scan/status`

---

## 🔄 Updates and Maintenance

### Auto-Deploy from GitHub (Railway)
Railway automatically deploys when you push to `main` branch.

```bash
git add .
git commit -m "Update feature"
git push origin main
# Railway automatically deploys!
```

### Manual Updates (VPS)
```bash
cd Rug-Killer-On-Solana
git pull origin main
npm install
npm run build
pm2 restart rug-killer
```

---

## 📊 Monitoring

### Railway Dashboard
- View logs in real-time
- Monitor resource usage
- Check deployment history
- View environment variables

### PM2 Dashboard (VPS)
```bash
pm2 monit              # Real-time monitoring
pm2 logs rug-killer    # View logs
pm2 status             # Check status
```

---

## 💰 Costs

### Railway
- **Free Tier**: $5 free credit/month
- **Hobby Plan**: $5/month for hobby projects
- **Pro Plan**: Usage-based pricing

### VPS (DigitalOcean, etc.)
- **Basic Droplet**: $6/month (1GB RAM)
- **Recommended**: $12/month (2GB RAM)

---

## 🆘 Need Help?

- **Railway Docs**: https://docs.railway.app/
- **GitHub Issues**: https://github.com/drixindustries/Rug-Killer-On-Solana/issues
- **Discord**: Join our support server
- **Telegram**: @rugkillerbot

---

**Ready to deploy? Start with Railway - it's the easiest option!** 🚀
