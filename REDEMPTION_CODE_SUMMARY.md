# Redemption Code System - Quick Summary

## ✨ What's Been Created

A complete redemption code system that allows you to grant users lifetime access to:
- **Website** - Unlimited token analysis
- **Telegram Bot** - All commands and features
- **Discord Bot** - All commands and features

---

## 🎯 For Users

### Where to Redeem

1. **Website**: Go to `/subscription` page → Enter code in the prominent box at the top
2. **Telegram Bot**: Send `/redeem YOUR_CODE`
3. **Discord Bot**: Type `/redeem YOUR_CODE`

> Note: Users must redeem the code separately on each platform for security reasons.

---

## 🔧 For Admins - How to Create Codes

### Quick Method (PowerShell on Windows)

```powershell
.\generate-code.ps1
```

This creates a single-use lifetime access code with format: `RUG-XXXXXXXX`

### Custom Options

```powershell
# Multiple uses
.\generate-code.ps1 -MaxUses 10

# Expires in 30 days
.\generate-code.ps1 -Expires 30

# Custom prefix
.\generate-code.ps1 -Prefix PROMO

# All together
.\generate-code.ps1 -Tier lifetime -MaxUses 50 -Prefix GIVEAWAY -Expires 30
```

### API Method

```bash
curl -X POST "http://localhost:3000/api/admin/codes/generate?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier":"lifetime","maxUses":1,"codePrefix":"RUG"}'
```

### Database Method

```sql
INSERT INTO subscription_codes (code, tier, max_uses, is_active)
VALUES ('RUG-CUSTOM-2025', 'lifetime', 1, true);
```

---

## 📋 Admin API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/codes/generate` | POST | Generate new code |
| `/api/admin/codes/list` | GET | List all codes |
| `/api/admin/codes/deactivate` | POST | Deactivate a code |

All require `?token=YOUR_ADMIN_TOKEN` parameter.

---

## 🔒 Security Features

- ✅ One-time use by default (configurable)
- ✅ Platform isolation (website ≠ bot access)
- ✅ Expiration dates
- ✅ Instant deactivation
- ✅ Full audit trail

---

## 📁 Files Modified/Created

### Frontend
- `client/src/pages/subscription.tsx` - Added prominent redemption box

### Backend
- `server/admin-routes.ts` - Added code generation endpoints
- Already existed: `server/routes.ts` - Redemption endpoint
- Already existed: `server/storage.ts` - Redemption logic

### Documentation
- `REDEMPTION_CODES_GUIDE.md` - Complete guide
- `generate-code.ps1` - PowerShell script
- `generate-code.sh` - Bash script
- `REDEMPTION_CODE_SUMMARY.md` - This file

### Database
- Already exists: `subscription_codes` table
- Already exists: `code_redemptions` table

---

## 🚀 Next Steps

1. **Set Admin Token**: Add to `.env`
   ```
   DEBUG_ENDPOINTS_TOKEN=your-secure-random-token
   ```

2. **Generate First Code**:
   ```powershell
   .\generate-code.ps1
   ```

3. **Share with User**: They redeem on all platforms they want access to

4. **Monitor Usage**:
   ```bash
   curl "http://localhost:3000/api/admin/codes/list?token=YOUR_TOKEN"
   ```

---

## 💡 Common Use Cases

### Influencer Partnership
```powershell
# 1 code, unlimited uses, expires in 7 days
.\generate-code.ps1 -MaxUses 0 -Expires 7 -Prefix PARTNER
```

### Community Giveaway
```powershell
# 100 single-use codes
for ($i=1; $i -le 100; $i++) {
    .\generate-code.ps1 -Prefix GIVEAWAY
}
```

### Early Adopter Reward
```powershell
# 1 code, 50 uses, never expires
.\generate-code.ps1 -MaxUses 50 -Prefix EARLY
```

---

## ❓ Troubleshooting

**"Invalid or expired code"**
- Check if active: `GET /api/admin/codes/list`
- Verify not at max uses
- Check expiration date

**User redeemed but no access**
- Website redemption ≠ bot access
- They need to use `/redeem CODE` in Telegram/Discord separately

**Can't generate codes**
- Verify admin token is correct
- Check database connection
- Ensure migrations ran: `subscription_codes` table exists

---

## 📞 Support

For issues:
1. Check logs in terminal
2. Query database: `SELECT * FROM code_redemptions ORDER BY redeemed_at DESC`
3. Verify environment variables are set

---

**You're all set! 🎉**
