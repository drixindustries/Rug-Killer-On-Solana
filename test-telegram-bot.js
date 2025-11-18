/**
 * Test Telegram bot locally
 * Run: node test-telegram-bot.js
 */

import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8506172883:AAH3fTZOA5cX45YDtPjOXE5lKocgQiwVCx8';

async function testBot() {
  console.log('🤖 Starting Telegram bot test...');
  
  const bot = new Telegraf(BOT_TOKEN);
  
  // Test command
  bot.command('test', (ctx) => {
    console.log('✅ Received /test command from:', ctx.from.id);
    ctx.reply('✅ Bot is working! Commands are being received.');
  });
  
  bot.command('start', (ctx) => {
    console.log('✅ Received /start command from:', ctx.from.id);
    ctx.reply('🔥 **RUG KILLER TEST BOT**\n\nBot is online and receiving commands!\n\nTry /test to verify.', { parse_mode: 'Markdown' });
  });
  
  // Log all messages
  bot.on('message', (ctx) => {
    console.log('📨 Message received:', ctx.message);
  });
  
  try {
    // Launch with dropPendingUpdates to clear old messages
    await bot.launch({
      dropPendingUpdates: true
    });
    
    console.log('✅ Bot is running! Try sending /test or /start');
    console.log('Press Ctrl+C to stop');
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('\n⏹️  Stopping bot...');
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Failed to launch bot:', error);
    
    if (error.response?.error_code === 409) {
      console.error('\n🔴 ERROR 409: Another bot instance is already running!');
      console.error('   Solutions:');
      console.error('   1. Stop any other instances (Railway, local dev servers)');
      console.error('   2. Wait 1-2 minutes for the conflict to resolve');
      console.error('   3. Run: node clear-telegram-webhook.js');
    }
  }
}

testBot();
