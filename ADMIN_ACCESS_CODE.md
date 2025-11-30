# Admin Access Code - Private

## 🔑 Your Master Access Code

**Default Code:** `RUG_KILLER_ELITE_2025`

This code grants **lifetime access** to the bot - you'll never be locked out!

## How to Use

### Discord:
```
/redeem RUG_KILLER_ELITE_2025
```

### Telegram:
```
/redeem RUG_KILLER_ELITE_2025
```

## What This Does

✅ **Lifetime Access** - Expires in year 2099 (essentially permanent)  
✅ **Never Locked Out** - Bypasses all access control checks  
✅ **Instant Activation** - Works immediately after redemption  
✅ **Works for Groups** - Can be used in Discord servers or Telegram groups  

## Changing the Code

To use a custom code instead, add this to Railway environment variables:

```bash
ADMIN_ACCESS_CODE=your_custom_secret_code_here
```

If `ADMIN_ACCESS_CODE` is not set, it defaults to: `RUG_KILLER_ELITE_2025`

## Security Notes

🔒 **Keep this code private!** Anyone with this code gets lifetime access.

🔐 **One-time use per user/group** - Once redeemed, the user/group gets permanent access. The same code can be redeemed by multiple users.

💡 **Recommended:** Set a custom `ADMIN_ACCESS_CODE` in Railway for production.

## Command Details

The `/redeem` command:
- Works without trial or access requirements
- Can be used even if trial expired
- Updates database to grant permanent access
- Sets `accessType` to `'paid'`
- Sets `membershipExpiresAt` to `2099-12-31`
- Logs redemption with identifier `ADMIN_CODE_REDEEMED`

## Testing

1. **Open Discord or Telegram**
2. **Run command:** `/redeem RUG_KILLER_ELITE_2025`
3. **Verify access:** `/access`

You should see:
- Status: ✅ Active
- Type: PAID
- Membership valid until 2099

## Database Query

To check who has redeemed codes:

```sql
SELECT identifier, access_type, membership_expires_at, whop_membership_id, created_at
FROM user_access_control
WHERE whop_membership_id = 'ADMIN_CODE_REDEEMED';
```

## Revoke Access (if needed)

If you need to revoke someone's code redemption:

```sql
-- Reset to trial
UPDATE user_access_control
SET access_type = 'trial',
    trial_ends_at = NOW() + INTERVAL '7 days',
    membership_expires_at = NULL,
    whop_membership_id = NULL
WHERE identifier = 'discord:USER_ID';
```

---

**Last Updated:** November 30, 2025  
**Commit:** 9436b8c  
**Status:** ✅ Live on Railway
