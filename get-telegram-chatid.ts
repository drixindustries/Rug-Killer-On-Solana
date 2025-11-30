/**
 * Quick Telegram Chat ID Helper
 * Run this to get your Telegram group/channel Chat ID
 */

import 'dotenv/config';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.log('❌ TELEGRAM_BOT_TOKEN not found in .env');
  console.log('\nAdd to .env:');
  console.log('TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather');
  process.exit(1);
}

console.log('🔍 Fetching Telegram updates...\n');

async function getChatId() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`);
    const data = await response.json();
    
    if (!data.ok) {
      console.log('❌ Telegram API error:', data.description);
      return;
    }
    
    if (!data.result || data.result.length === 0) {
      console.log('⚠️ No recent messages found.');
      console.log('\n💡 To get your Chat ID:');
      console.log('   1. Add your bot to a group/channel');
      console.log('   2. Send any message in that group');
      console.log('   3. Run this script again');
      return;
    }
    
    console.log('✅ Found recent messages!\n');
    
    const chats = new Map();
    
    for (const update of data.result) {
      const chat = update.message?.chat || update.channel_post?.chat;
      if (chat) {
        chats.set(chat.id, {
          id: chat.id,
          type: chat.type,
          title: chat.title || chat.first_name || 'Private Chat',
          username: chat.username
        });
      }
    }
    
    console.log('📋 Available Chats:\n');
    
    for (const [id, info] of chats) {
      console.log(`   Chat ID: ${id}`);
      console.log(`   Type: ${info.type}`);
      console.log(`   Title: ${info.title}`);
      if (info.username) console.log(`   Username: @${info.username}`);
      console.log('');
    }
    
    if (chats.size > 0) {
      console.log('📝 Add to your .env file:');
      const firstChatId = Array.from(chats.keys())[0];
      console.log(`TELEGRAM_ALPHA_CHAT_ID=${firstChatId}`);
      console.log('');
      
      if (chats.size > 1) {
        console.log('💡 Multiple chats found. Choose the one for alpha alerts.');
      }
    }
    
  } catch (error: any) {
    console.log('❌ Error:', error?.message);
  }
}

getChatId();
