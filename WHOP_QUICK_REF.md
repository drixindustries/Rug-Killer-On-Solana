# Whop Integration Quick Reference

## 🎯 What's Implemented

✅ **3-Tier Access System**
- Token-gating (10M+ tokens)
- Whop subscriptions (individual payments)
- Group access (Discord servers/Telegram groups)

✅ **7-Day Trial Period**
- Automatically granted to all new users and groups
- Starts on first command execution
- Clear expiration notifications

✅ **New Bot Commands**
- `/linkwallet <address>` - Link Solana wallet for token-gating
- `/trial` - Check trial status and days remaining
- `/access` - View detailed access level and upgrade options

✅ **Access Control Middleware**
- Blocks commands for users without valid access
- Shows upgrade options with Whop checkout links
- Allows free commands (help, linkwallet, trial, access)

## 📦 Files Created/Modified

### New Services
- `server/services/whop-service.ts` - Whop API integration
- `server/services/access-control.ts` - Access verification & token-gating

### Modified Files
- `server/discord-bot.ts` - Access middleware + new commands
- `server/telegram-bot.ts` - Access middleware + new commands
- `shared/schema.ts` - Added `userAccessControl` table schema

### Database
- `migrations/20251130_add_user_access_control.sql` - Migration file

### Documentation
- `WHOP_INTEGRATION_GUIDE.md` - Complete setup guide
- `ENV_VARIABLES_TO_UPDATE.md` - Updated with new env vars

## 🔧 Required Environment Variables

```bash
# Whop Integration (Optional - features disabled if not set)
WHOP_API_KEY=your_whop_api_key_here
WHOP_PRODUCT_ID=your_whop_product_id
WHOP_PLAN_ID=your_whop_plan_id

# Token Gating (Optional - feature disabled if not set)
RUG_KILLER_TOKEN_MINT=your_token_mint_address
```

## 🚀 Deployment Steps

### 1. Run Database Migration

The migration will run automatically on Railway deploy, or manually:

```bash
psql $DATABASE_URL -f migrations/20251130_add_user_access_control.sql
```

### 2. Add Environment Variables on Railway

1. Go to Railway dashboard → Your project → Variables
2. Add the 4 new environment variables (optional):
   - `WHOP_API_KEY`
   - `WHOP_PRODUCT_ID`
   - `WHOP_PLAN_ID`
   - `RUG_KILLER_TOKEN_MINT`
3. Railway will auto-redeploy

### 3. Test Access Control

**Test Trial Period:**
```
# Use any command to trigger trial
/execute TokenAddress

# Check trial status
/trial
```

**Test Token-Gating:**
```
# Link wallet with 10M+ tokens
/linkwallet YourWalletAddress

# Check access
/access
```

**Test Group Access:**
- Add bot to Discord server or Telegram group
- Any member can check: `/trial`
- All members get 7-day group trial

## 📊 Access Flow

```
User Runs Command
      ↓
Access Control Check
      ↓
┌─────┴─────┐
│           │
Trial?   Paid?
│           │
└─────┬─────┘
      ↓
Token Holder?
      ↓
┌─────┴─────┐
│           │
ALLOW    DENY
```

## 💡 Key Features

### For New Users
1. Run any command → 7-day trial starts automatically
2. Trial expires → Bot shows upgrade options
3. Choose access method:
   - Link wallet with 10M+ tokens (free)
   - Subscribe via Whop (paid)
   - Add bot to group (group subscription)

### For Token Holders
1. Hold 10M+ RUG KILLER tokens
2. Run `/linkwallet <your_wallet>`
3. Bot verifies balance → Instant access

### For Groups
1. Add bot to Discord server or Telegram group
2. Entire group gets 7-day trial
3. After trial, group owner subscribes
4. All members get access

## 🔍 Monitoring

### Check Access Stats

```sql
-- Total users by access type
SELECT access_type, COUNT(*) 
FROM user_access_control 
GROUP BY access_type;

-- Active trials
SELECT COUNT(*) 
FROM user_access_control 
WHERE access_type = 'trial' 
  AND trial_ends_at > NOW();

-- Token holders
SELECT COUNT(*) 
FROM user_access_control 
WHERE access_type = 'token_holder';
```

### User Commands

Users can check their status anytime:
- `/trial` - Trial expiration date
- `/access` - Current access level + upgrade options

## ⚙️ Configuration Options

### Disable Features

**Disable Whop Integration:**
- Don't set `WHOP_API_KEY` environment variable
- Token-gating and trials still work

**Disable Token-Gating:**
- Don't set `RUG_KILLER_TOKEN_MINT` environment variable
- Whop subscriptions and trials still work

**Disable All Access Control:**
- Set all 4 env vars to empty strings
- Bot will allow all commands (not recommended for production)

### Adjust Trial Period

Edit `server/services/access-control.ts`:

```typescript
private readonly TRIAL_DAYS = 7; // Change to desired days
```

### Adjust Token Requirement

Edit `server/services/access-control.ts`:

```typescript
private readonly MIN_TOKEN_BALANCE = 10_000_000; // Change requirement
```

## 🐛 Troubleshooting

### "Access Required" Message

**User sees:** "🔒 Access Required - Trial expired. Please upgrade to continue."

**Solution:**
1. Check trial: `/trial`
2. Link wallet: `/linkwallet <address>`
3. Subscribe: Use Whop link provided

### Token Balance Not Detected

**User has 10M+ tokens but access denied**

**Checklist:**
- ✅ Wallet linked via `/linkwallet`?
- ✅ `RUG_KILLER_TOKEN_MINT` env var set correctly?
- ✅ Tokens in correct wallet?
- ✅ RPC connection working?

### Trial Not Starting

**User runs command but no trial**

**Check:**
- Database migration ran successfully?
- `user_access_control` table exists?
- Bot has database write permissions?

## 📈 Conversion Funnel

```
New User → Trial (7 days) → Trial Expires
                                ↓
                    ┌───────────┼───────────┐
                    ↓           ↓           ↓
              Link Wallet   Subscribe   Join Group
              (10M tokens)   (Whop)    (Discord/TG)
                    ↓           ↓           ↓
              Token Holder    Paid     Group Access
```

## 🎯 Next Steps

1. ✅ Code deployed to GitHub
2. ⏳ Railway auto-deploying latest commit
3. 🔜 Add Whop API credentials to Railway (optional)
4. 🔜 Set token mint address in Railway (optional)
5. 🔜 Test all three access methods
6. 🔜 Monitor trial conversion rates
7. 🔜 Adjust pricing based on metrics

## 📞 Support

**For Users:**
- Use `/trial` to check status
- Use `/access` for detailed info
- Use `/linkwallet` to enable token-gating

**For Admins:**
- Check Railway logs for access control events
- Monitor database for trial conversions
- Query `user_access_control` table for analytics

---

**Last Updated:** November 30, 2025  
**Commit:** cc16344  
**Status:** ✅ Deployed & Ready
