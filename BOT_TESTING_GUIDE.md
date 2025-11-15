# Bot Testing Guide

## ✅ Both Bots Are Live!

### Telegram Bot: @RugKillerAlphaBot
- **Status**: ✅ Running
- **Username**: `@RugKillerAlphaBot`
- **Bot ID**: 8506172883

### Discord Bot: RugKillerAlphaBot#4069
- **Status**: ✅ Running
- **Application ID**: 1437952073319714879
- **Slash Commands**: ✅ Registered

---

## 🧪 Testing Commands

### Test Token Addresses

Use the official **$ANTIRUG** contract address for testing:
```
2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

Other popular Solana tokens for testing:
- **SOL**: `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Bonk**: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`

---

## Telegram Bot Commands

### `/execute <token_address>`
Full 52-metric rug detection scan with:
- Risk score (0-100)
- Mint & freeze authority
- Top holder concentration
- Liquidity analysis
- Red flags

**Test:**
```
/execute 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/first20 <token_address>`
Detailed top 20 holder analysis with:
- Holder addresses
- Token balances
- Percentage distribution
- Concentration metrics

**Test:**
```
/first20 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/devaudit <token_address>`
Developer wallet history tracking:
- Previous launches
- Success/failure rate
- Rug pull patterns

**Test:**
```
/devaudit 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/blacklist <wallet_address>`
Check if wallet is flagged in blacklist:
- Severity score
- Flag reasons
- Evidence

**Test:**
```
/blacklist 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/help`
Display all available commands

### Quick Analysis (No Command)
Just paste a Solana token address (32-44 characters) and the bot will auto-analyze it!

**Test:**
```
2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

---

## Discord Bot Commands

### `/execute token_address:<address>`
Same as Telegram, but with rich Discord embeds:
- Color-coded by risk level
- Embedded thumbnails
- Interactive buttons

**Test:**
```
/execute token_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/first20 token_address:<address>`
Holder analysis with Discord formatting

**Test:**
```
/first20 token_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/devaudit token_address:<address>`
Developer history with Discord rich embeds

**Test:**
```
/devaudit token_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

### `/blacklist wallet_address:<address>`
Blacklist check with Discord formatting

**Test:**
```
/blacklist wallet_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt
```

---

## Expected Bot Behaviors

### ✅ Successful Analysis
- Response within 2-5 seconds
- Color-coded risk indicators (GREEN/YELLOW/ORANGE/RED)
- Detailed metrics and holder data
- Links to external resources (Rugcheck, DexScreener, BubbleMaps)

### ⚠️ Rate Limiting
If you scan too quickly:
- **Telegram**: "⏱️ Please wait before scanning again (rate limited)"
- **Discord**: Deferred reply with rate limit message

### ❌ Invalid Address
If you provide an invalid address:
- **Telegram**: "❌ Invalid token address. Please provide a valid Solana address."
- **Discord**: "❌ Error executing command. Please check the address and try again."

### 🔍 No Data Found
If token doesn't exist or has no data:
- Partial analysis with available information
- Warning messages about missing data sources

---

## Testing Checklist

### Telegram Bot Tests
- [ ] `/help` command shows all commands
- [ ] `/execute` with $ANTIRUG address returns analysis
- [ ] `/first20` shows top holders
- [ ] `/devaudit` shows developer history
- [ ] `/blacklist` checks wallet flags
- [ ] Pasting raw address triggers auto-analysis
- [ ] Invalid address shows error message
- [ ] Bot responds in under 5 seconds
- [ ] Markdown formatting displays correctly
- [ ] External links are clickable

### Discord Bot Tests
- [ ] Slash commands appear in command menu
- [ ] `/execute` returns color-coded embed
- [ ] `/first20` shows holder breakdown
- [ ] `/devaudit` displays dev history
- [ ] `/blacklist` shows flags with severity
- [ ] Embeds have proper colors based on risk
- [ ] Timestamps appear on all responses
- [ ] Links open correctly
- [ ] Bot handles rate limiting gracefully
- [ ] Error messages are user-friendly

---

## Troubleshooting

### Telegram Bot Not Responding

1. **Check bot is running**:
   ```bash
   curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
   ```
   Should return: `{"ok":true,"result":{"username":"RugKillerAlphaBot"...}}`

2. **Start a chat**: Send `/start` to @RugKillerAlphaBot

3. **Check logs**: Look for "✅ Telegram bot started successfully" in console

### Discord Bot Not Responding

1. **Check bot is online**: Green status in Discord server members list

2. **Verify permissions**:
   - Send Messages ✅
   - Embed Links ✅
   - Use Slash Commands ✅

3. **Re-invite bot**:
   ```
   https://discord.com/api/oauth2/authorize?client_id=1437952073319714879&permissions=277025770496&scope=bot%20applications.commands
   ```

4. **Check logs**: Look for "✅ Discord bot logged in as RugKillerAlphaBot#4069"

### Commands Not Working

1. **Wait for propagation**: Slash commands take 1-2 minutes to register globally
2. **Restart Discord**: Close and reopen the Discord app
3. **Check command syntax**: Make sure you're using the correct format
4. **Verify subscription**: Some commands may require active subscription

---

## API Integration Testing

The bots are integrated with the following external APIs. You can verify they're working:

### Rugcheck.xyz
- Provides: Risk scores, liquidity analysis
- Test: `/execute` should show RugCheck score and link

### GoPlus Security
- Provides: Honeypot detection, security flags
- Test: `/execute` should show security warnings if any

### DexScreener
- Provides: Market data, price, volume
- Test: Links to DexScreener should open correctly

### BubbleMaps
- Provides: Holder visualization
- Test: BubbleMaps link should show holder distribution

---

## Quality Protection Metrics

### What to Verify in Each Scan

**Authority Checks:**
- ✅ Mint authority revoked = SAFER
- ❌ Mint authority active = CAN INFLATE SUPPLY
- ✅ Freeze authority revoked = SAFER
- ❌ Freeze authority active = CAN LOCK WALLETS

**Holder Distribution:**
- ✅ Top 10 < 30% = HEALTHY
- ⚠️ Top 10 30-50% = MODERATE RISK
- ❌ Top 10 > 50% = HIGH CONCENTRATION RISK

**Liquidity Pool:**
- ✅ 100% burned = LOCKED FOREVER
- ✅ 90-99% burned = MOSTLY SAFE
- ⚠️ 50-90% burned = MODERATE RISK
- ❌ < 50% burned = RUG PULL RISK

**Red Flags:**
- Zero or very few red flags = SAFER
- Multiple red flags = INVESTIGATE FURTHER
- Critical red flags (honeypot, high sell tax) = AVOID

---

## Success Criteria

Your bots are working correctly if:

1. ✅ Both bots respond to commands within 5 seconds
2. ✅ Risk scores are calculated and displayed (0-100)
3. ✅ Color coding matches risk levels
4. ✅ External links work and open correct pages
5. ✅ Error handling is graceful and informative
6. ✅ Rate limiting prevents spam
7. ✅ Markdown/embeds format correctly
8. ✅ All 4 main commands work on both platforms
9. ✅ Help command provides clear guidance
10. ✅ Auto-detection works for pasted addresses (Telegram)

---

## Legal & Compliance

**Bot Links:**
- **Terms of Service**: https://yourwebsite.com/terms
- **Privacy Policy**: https://yourwebsite.com/privacy

Bots automatically reference these legal documents in their help commands.

---

## Support

If you encounter issues:
- **GitHub**: https://github.com/drixindustries/rugkillleronsol/issues
- **Discord Server**: Join for community support
- **Email**: support@yourwebsite.com

---

**Happy Testing! 🎉**

Remember: These bots are designed to protect users from rug pulls. Every scan helps make the Solana ecosystem safer!
