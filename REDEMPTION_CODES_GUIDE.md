# Redemption Code System Guide

## Overview

The redemption code system allows you to grant users lifetime access to all platform features including:
- ✅ Website with unlimited token analysis
- ✅ Telegram bot access
- ✅ Discord bot access
- ✅ All premium features (alerts, smart money tracking, etc.)

---

## For Users: How to Redeem a Code

### Website Access

1. Go to the [Subscription Page](https://your-site.com/subscription)
2. Look for the **"Have a Redemption Code?"** section at the top
3. Enter your code in the input box (e.g., `RUG-ABC123XY`)
4. Click **"Redeem"**
5. Your website access will be activated immediately! ✨

### Telegram Bot Access

1. Open your Telegram bot
2. Send the command: `/redeem YOUR_CODE_HERE`
3. Example: `/redeem RUG-ABC123XY`
4. You'll receive confirmation and lifetime bot access

### Discord Bot Access

1. Open your Discord server or DM with the bot
2. Use the slash command: `/redeem YOUR_CODE_HERE`
3. Example: `/redeem RUG-ABC123XY`
4. You'll receive confirmation and lifetime bot access

> **Note:** You need to redeem the code separately on each platform (website, Telegram, Discord) to get access everywhere. This ensures security - only the person with the code can activate it on their accounts.

---

## For Admins: How to Generate Codes

### Using API (Recommended)

Generate a new redemption code using the admin API:

```bash
curl -X POST "https://your-site.com/api/admin/codes/generate?token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "lifetime",
    "maxUses": 1,
    "expiresInDays": null,
    "codePrefix": "RUG"
  }'
```

**Response:**
```json
{
  "success": true,
  "code": {
    "id": "...",
    "code": "RUG-ABC123XY",
    "tier": "lifetime",
    "max_uses": 1,
    "used_count": 0,
    "is_active": true,
    "expires_at": null
  },
  "message": "Code RUG-ABC123XY created successfully"
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tier` | string | `"lifetime"` | Access tier: `"lifetime"`, `"individual"`, or `"group"` |
| `maxUses` | number | `1` | Maximum number of times code can be redeemed (null = unlimited) |
| `expiresInDays` | number | `null` | Days until code expires (null = never expires) |
| `codePrefix` | string | `"RUG"` | Prefix for the generated code |

### List All Codes

```bash
curl "https://your-site.com/api/admin/codes/list?token=YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "codes": [
    {
      "id": "...",
      "code": "RUG-ABC123XY",
      "tier": "lifetime",
      "max_uses": 1,
      "used_count": 1,
      "is_active": true,
      "redemption_count": "1",
      "redeemed_by": ["user-id-1"]
    }
  ],
  "total": 1
}
```

### Deactivate a Code

```bash
curl -X POST "https://your-site.com/api/admin/codes/deactivate?token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "RUG-ABC123XY"}'
```

---

## Using Direct Database Access

If you prefer to generate codes directly in the database:

```sql
-- Generate a new code
INSERT INTO subscription_codes (code, tier, max_uses, is_active, expires_at)
VALUES ('RUG-CUSTOM-CODE', 'lifetime', 1, true, null);

-- View all codes
SELECT 
  c.*,
  COUNT(r.id) as times_redeemed,
  ARRAY_AGG(r.user_id) as redeemed_by_users
FROM subscription_codes c
LEFT JOIN code_redemptions r ON c.id = r.code_id
GROUP BY c.id
ORDER BY c.created_at DESC;

-- Deactivate a code
UPDATE subscription_codes 
SET is_active = false, updated_at = NOW()
WHERE code = 'RUG-CUSTOM-CODE';
```

---

## Code Tiers

### `lifetime`
- Never expires
- Full access to all features forever
- Recommended for giveaways and partnerships

### `individual`
- Standard monthly subscription features
- User pays monthly after initial period (if configured)
- Good for trial promotions

### `group`
- Premium tier with group/channel alerts
- Includes all individual features plus group functionality
- Best for communities

---

## Security Features

1. **One-time use**: By default, codes can only be used once (configurable)
2. **Platform isolation**: Website redemption doesn't auto-grant bot access (prevents abuse)
3. **Expiration**: Codes can be set to expire after X days
4. **Deactivation**: Admins can instantly deactivate any code
5. **Audit trail**: All redemptions are logged with user ID and timestamp

---

## Common Use Cases

### 1. Influencer Giveaway
```bash
# Generate 100 single-use codes
for i in {1..100}; do
  curl -X POST "https://your-site.com/api/admin/codes/generate?token=YOUR_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"tier": "lifetime", "maxUses": 1, "codePrefix": "GIVEAWAY"}'
done
```

### 2. Partnership Deal
```bash
# Generate 1 code with unlimited uses for 30 days
curl -X POST "https://your-site.com/api/admin/codes/generate?token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "lifetime",
    "maxUses": null,
    "expiresInDays": 30,
    "codePrefix": "PARTNER"
  }'
```

### 3. Early Adopter Reward
```bash
# Generate special code for first 50 users
curl -X POST "https://your-site.com/api/admin/codes/generate?token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "lifetime",
    "maxUses": 50,
    "codePrefix": "EARLY"
  }'
```

---

## Admin Token Setup

Set your admin token in the `.env` file:

```bash
DEBUG_ENDPOINTS_TOKEN=your-secure-random-token-here
```

**Generate a secure token:**
```bash
# Using OpenSSL
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### "Invalid or expired code"
- Check if code is still active: `GET /api/admin/codes/list`
- Verify expiration date hasn't passed
- Ensure maxUses hasn't been reached

### "You have already redeemed this code"
- Each user can only redeem a code once per platform
- They can use the same code on website, Telegram, AND Discord separately

### Bot redemption not working
- Ensure user is using `/redeem` command with correct syntax
- Verify bot has access to the database
- Check bot logs for errors

---

## Support

For issues or questions:
1. Check database logs: `SELECT * FROM code_redemptions ORDER BY redeemed_at DESC LIMIT 10`
2. Review application logs for redemption errors
3. Verify admin token is correctly set in environment variables

---

**Happy coding! 🎉**
