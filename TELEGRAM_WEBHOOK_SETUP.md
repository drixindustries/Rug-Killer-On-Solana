# Telegram Webhook Setup

## Why Webhook Mode?

Webhook mode is more reliable than polling on Railway because:
- No outbound connections needed (Telegram sends updates TO you)
- Lower latency - instant message delivery
- More efficient - no constant polling

## Setup Steps

### 1. Add Environment Variable

```powershell
railway variables --set "TELEGRAM_WEBHOOK_URL=https://rugkilleralphabot.fun/telegram-webhook"
```

### 2. Code Changes

The webhook endpoint is already in the code (see server/routes.ts), but needs to be enabled.

Add to `server/telegram-bot.ts`:

```typescript
export async function startTelegramBotWebhook(webhookUrl: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!BOT_TOKEN || BOT_TOKEN === 'PLACEHOLDER_TOKEN') {
    console.log('⚠️  Telegram bot token not configured');
    return null;
  }
  
  if (botInstance) {
    console.log('⚠️  Telegram bot already running');
    return botInstance;
  }
  
  try {
    botInstance = createTelegramBot(BOT_TOKEN);
    
    // Set webhook
    await botInstance.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query']
    });
    
    console.log('✅ Telegram webhook configured:', webhookUrl);
    return botInstance;
  } catch (error: any) {
    console.error('Error setting Telegram webhook:', error);
    botInstance = null;
    throw error;
  }
}

// Export webhook handler
export function getTelegramWebhookHandler() {
  if (!botInstance) {
    throw new Error('Bot not initialized');
  }
  return botInstance.webhookCallback('/telegram-webhook');
}
```

### 3. Add Route in server/routes.ts

```typescript
// After the Telegram bot starts
if (process.env.TELEGRAM_WEBHOOK_URL) {
  const { startTelegramBotWebhook, getTelegramWebhookHandler } = await import('./telegram-bot.ts');
  await startTelegramBotWebhook(process.env.TELEGRAM_WEBHOOK_URL);
  
  // Add webhook endpoint
  app.post('/telegram-webhook', getTelegramWebhookHandler());
  console.log('✅ Telegram webhook endpoint registered');
}
```

### 4. Update server/app.ts

Change the Telegram bot startup to check for webhook mode:

```typescript
// Telegram bot
if (process.env.TELEGRAM_ENABLED?.toLowerCase() === 'true' && process.env.TELEGRAM_BOT_TOKEN) {
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    // Use webhook mode
    console.log('🔗 Starting Telegram in webhook mode');
  } else {
    // Use polling mode
    const { startTelegramBot } = await import('./telegram-bot.ts');
    startTelegramBot().catch(err => {
      console.warn('⚠️ Telegram bot unavailable:', err?.message);
    });
  }
}
```

### 5. Deploy

```powershell
git add -A
git commit -m "Add Telegram webhook support"
git push
```

### 6. Verify

Check Railway logs for:
```
✅ Telegram webhook configured: https://rugkilleralphabot.fun/telegram-webhook
```

Test by sending `/start` to your bot.

## Troubleshooting

**Bot not responding:**
- Check Railway logs for webhook errors
- Verify webhook URL is publicly accessible
- Ensure SSL certificate is valid (Railway provides this)

**To switch back to polling:**
```powershell
railway variables --set "TELEGRAM_WEBHOOK_URL="
```

**Check current webhook:**
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```
