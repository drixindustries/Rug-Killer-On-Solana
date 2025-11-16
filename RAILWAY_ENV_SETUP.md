# Railway Environment Variables Setup

## ⚠️ CRITICAL: Set These Variables in Railway Dashboard

Go to your Railway project → **Variables** tab → Click **+ New Variable** for each:

### Required Variables (Copy these EXACTLY)

```
FORCE_IN_MEMORY_DB=true
```

```
NODE_ENV=production
```

```
SESSION_SECRET=railway-production-secret-change-this-to-random-string
```

```
PHANTOM_WALLET_ADDRESS=Demo
```

```
DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
```

### Optional Variables (Add if you have these services)

```
HELIUS_API_KEY=your-helius-key-here
```

```
QUICKNODE_RPC_URL=your-quicknode-url-here
```

## How to Add Variables in Railway

1. Open your Railway project
2. Click on your service (the one running the server)
3. Go to the **Variables** tab
4. Click **+ New Variable**
5. Enter the variable name and value
6. Click **Add**
7. Repeat for all variables above
8. Railway will automatically redeploy when you save

## Verification

After deployment, check the logs. You should see:

```
🌍 Environment: production
💾 Database Mode: IN-MEMORY
🔧 DB Config - FORCE_IN_MEMORY_DB: true
🔑 Using session secret: railway-fa...
```

If you DON'T see these lines, the environment variables aren't being loaded!

## Troubleshooting

**If variables aren't showing up:**

1. Make sure you're adding them to the SERVICE, not the project
2. Variables should be in the **Variables** tab, not **Settings**
3. Each variable should be on its own line
4. No quotes needed around values in Railway UI
5. After adding all variables, click **Deploy** if it doesn't auto-deploy

**Still not working?**

The deploy logs will show: `📋 All ENV vars: NODE_ENV, PORT, RAILWAY_...`

If you don't see `FORCE_IN_MEMORY_DB` in that list, Railway isn't seeing the variables.
