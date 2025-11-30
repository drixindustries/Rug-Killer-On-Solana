# Whop Integration & Access Control Guide

## Overview

The RUG KILLER bot now features comprehensive access control with **three ways to access** and a **7-day trial** for all new users and groups.

## Access Methods

### 1. 🪙 Token-Gated Access (Hold 10M+ Tokens)

Users holding **10,000,000+ RUG KILLER tokens** get automatic access.

**How it works:**
1. User runs `/linkwallet <your_solana_address>` in Discord or Telegram
2. Bot verifies token balance in real-time via Solana RPC
3. If 10M+ tokens detected, instant access granted
4. Balance is re-checked on each command use

**Commands:**
- `/linkwallet <address>` - Link your Solana wallet
- `/access` - Check your current token balance and status

### 2. 💳 Premium Subscription (Whop)

Direct payment via Whop platform for unlimited bot access.

**Features:**
- Individual DM access on Discord and Telegram
- No token holding required
- Instant activation after payment
- Managed via Whop dashboard

**How it works:**
1. User tries to use bot without access
2. Bot generates Whop checkout link
3. User subscribes via Whop
4. Webhook syncs membership status
5. Access automatically granted

### 3. 👥 Group/Server Access

Adding the bot to Discord servers or Telegram groups grants access to all members.

**Benefits:**
- 7-day trial for new groups
- One subscription covers entire server/group
- Members don't need individual access
- Perfect for communities and trading groups

**How it works:**
- Add bot to Discord server → Entire server gets access
- Add bot to Telegram group → All group members get access
- Group admins can manage bot permissions

## 7-Day Trial Period

**All new users and groups receive a 7-day trial automatically.**

**Trial Features:**
- ✅ Full access to all bot commands
- ✅ Starts on first use (command execution)
- ✅ No credit card required
- ✅ Clear expiration notification

**Commands:**
- `/trial` - Check trial status and days remaining
- `/access` - View detailed access information

**After Trial Expires:**
- Bot prompts user with upgrade options
- Commands blocked until access is granted
- `/help`, `/linkwallet`, `/trial`, `/access` remain available

## Environment Variables

Add these to your `.env` file:

```bash
# Whop Integration
WHOP_API_KEY=your_whop_api_key_here
WHOP_PRODUCT_ID=your_whop_product_id
WHOP_PLAN_ID=your_whop_plan_id

# Token Gating
RUG_KILLER_TOKEN_MINT=your_token_mint_address
```

## Database Migration

Run the migration to create the access control table:

```bash
# Using Drizzle
npm run db:push

# Or run SQL directly
psql $DATABASE_URL -f migrations/20251130_add_user_access_control.sql
```

## Bot Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/linkwallet <address>` | Link Solana wallet for token-gating |
| `/trial` | Check trial status and expiration |
| `/access` | View detailed access level and options |

### Admin Commands (Optional)

You can manually grant access via database if needed:

```sql
-- Grant permanent access to user
UPDATE user_access_control 
SET access_type = 'paid', 
    membership_expires_at = '2099-12-31' 
WHERE identifier = 'discord:USER_ID';

-- Extend trial period
UPDATE user_access_control 
SET trial_ends_at = NOW() + INTERVAL '7 days' 
WHERE identifier = 'telegram:USER_ID';
```

## Access Control Flow

```
┌─────────────────┐
│  User/Group     │
│  Executes       │
│  Command        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Access Control  │
│ Middleware      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Trial?    Paid?
    │         │
    │         ▼
    │    Token Holder?
    │         │
    └─────┬───┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  ALLOW      DENY
```

## Testing Access Control

### Test Token-Gating

```bash
# Discord
/linkwallet YourSolanaWalletWith10MTokens
/access

# Telegram  
/linkwallet YourSolanaWalletWith10MTokens
/access
```

### Test Trial Period

```bash
# Create new Discord/Telegram account
# Run any command to start trial
/execute TokenAddress

# Check trial status
/trial
```

### Test Group Access

```bash
# Add bot to Discord server or Telegram group
# Any member runs:
/trial

# Should show group trial information
```

## Whop Webhooks (Optional)

To receive real-time membership updates from Whop:

1. Set up webhook endpoint: `POST /api/whop/webhook`
2. Add webhook URL in Whop dashboard
3. Bot will auto-sync membership status

```typescript
// Example webhook handler
app.post('/api/whop/webhook', async (req, res) => {
  const { event, membership } = req.body;
  
  if (event === 'membership.created') {
    // Grant access
    await db.update(userAccessControl)
      .set({ 
        accessType: 'paid',
        whopMembershipId: membership.id,
        membershipExpiresAt: new Date(membership.valid_until)
      })
      .where(eq(userAccessControl.identifier, membership.metadata.discordId));
  }
  
  res.json({ success: true });
});
```

## User Experience

### First-Time User

1. User runs `/execute <token_address>`
2. Bot creates trial record → 7 days from now
3. Command executes successfully
4. Bot shows "Trial period ends on [DATE]"

### Trial Expiring Soon (1 day left)

1. Bot sends reminder DM
2. "⏰ Your trial expires in 1 day! Upgrade to keep access"
3. Shows upgrade options with links

### Trial Expired

1. User runs command
2. Bot blocks execution
3. Shows access options:
   - Link wallet (token-gating)
   - Subscribe via Whop
   - Add bot to server/group

### Token Holder

1. User holds 10M+ tokens
2. Links wallet via `/linkwallet`
3. Bot verifies balance
4. Instant access granted
5. Re-verified on each command

## Benefits

### For Users
- ✅ 7-day free trial (no payment info needed)
- ✅ Multiple access options (flexible)
- ✅ Token holders rewarded with free access
- ✅ Clear status via `/trial` and `/access` commands

### For Project
- 💰 Monetization via Whop subscriptions
- 🪙 Token utility (10M token requirement drives demand)
- 📈 Group subscriptions = higher revenue per user
- 🔒 Access control prevents abuse

### For Communities
- 👥 One subscription covers entire server
- 🎁 7-day trial for new groups
- 📊 Bot tracks group vs individual access separately

## Support

If users have issues:
1. Check trial status: `/trial`
2. Check access level: `/access`
3. Link wallet: `/linkwallet <address>`
4. Contact support with their Discord/Telegram ID

## Troubleshooting

### "Access Required" Error

**Problem:** User sees access denied message

**Solutions:**
1. Check trial status: `/trial`
2. Link wallet if holding tokens: `/linkwallet <address>`
3. Subscribe via Whop link provided
4. Add bot to server/group

### Token Balance Not Detected

**Problem:** User holds 10M+ tokens but access denied

**Solutions:**
1. Ensure wallet linked: `/linkwallet <address>`
2. Verify token mint address in env vars
3. Check RPC connection
4. Wait for balance cache to refresh (60s)

### Trial Already Expired

**Problem:** User's 7-day trial ended

**Solutions:**
1. User must choose access method
2. Link wallet with 10M+ tokens
3. Subscribe via Whop
4. Join group with bot access

## Metrics to Track

Monitor these KPIs:

```sql
-- Total users with access
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

-- Paid subscribers
SELECT COUNT(*) 
FROM user_access_control 
WHERE access_type = 'paid';

-- Trial conversion rate
SELECT 
  COUNT(CASE WHEN access_type != 'trial' THEN 1 END)::FLOAT / 
  COUNT(*)::FLOAT * 100 AS conversion_rate
FROM user_access_control 
WHERE created_at > NOW() - INTERVAL '30 days';
```

## Next Steps

1. ✅ Set up Whop account and get API keys
2. ✅ Configure environment variables
3. ✅ Run database migration
4. ✅ Test all three access methods
5. ✅ Monitor trial conversions
6. ✅ Adjust pricing based on metrics
