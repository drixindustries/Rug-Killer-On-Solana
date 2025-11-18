/**
 * Clear Telegram webhook to fix 409 conflicts
 * Run: node clear-telegram-webhook.js
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8506172883:AAH3fTZOA5cX45YDtPjOXE5lKocgQiwVCx8';

async function clearWebhook() {
  try {
    console.log('🔧 Clearing Telegram webhook...');
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`);
    const data = await response.json();
    
    console.log('Response:', data);
    
    if (data.ok) {
      console.log('✅ Webhook cleared successfully!');
      console.log('✅ Bot can now use long polling');
    } else {
      console.error('❌ Failed to clear webhook:', data.description);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearWebhook();
