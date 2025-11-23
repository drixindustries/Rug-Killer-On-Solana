/**
 * Direct Discord Webhook Test
 * Bypasses the Railway API and sends directly to Discord
 */

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1442144703066931342/CwwMNcFRkDcHogU0slQl_hVJh4rEzMyxIJQC10rX8UClGFAQBAL2DWlE2VyAg6COPEOx';

async function testDiscordWebhook() {
  console.log('🧪 Testing Discord Webhook Direct Delivery\n');

  // Test 1: Simple ping message
  console.log('Test 1: Sending simple test message...');
  try {
    const response1 = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🧪 **TEST MESSAGE**\n\nThis is a test to confirm Discord webhook is working correctly.',
        username: 'RugKiller Alpha Alerts Test'
      })
    });

    if (response1.ok) {
      console.log('✅ Simple message sent successfully\n');
    } else {
      const error = await response1.text();
      console.log('❌ Failed to send:', response1.status, error);
      return;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return;
  }

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Formatted alpha alert style message
  console.log('Test 2: Sending formatted alpha alert...');
  try {
    const alertMessage = {
      content: null,
      embeds: [{
        title: '🎯 Alpha Buy Alert (TEST)',
        description: 'This is a test of the alpha alert formatting',
        color: 0x00ff00, // Green
        fields: [
          {
            name: '👤 Wallet',
            value: 'Test Whale (GJvX...pump)',
            inline: true
          },
          {
            name: '💎 Token',
            value: '[View on Pump.fun](https://pump.fun/BtQQ...pump)',
            inline: true
          },
          {
            name: '💰 Amount',
            value: '0.05 SOL',
            inline: true
          },
          {
            name: '⏰ Time',
            value: new Date().toLocaleString(),
            inline: false
          }
        ],
        footer: {
          text: 'RugKiller Alpha Alerts • TEST MODE'
        },
        timestamp: new Date().toISOString()
      }],
      username: 'RugKiller Alpha Alerts'
    };

    const response2 = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertMessage)
    });

    if (response2.ok) {
      console.log('✅ Formatted alert sent successfully\n');
    } else {
      const error = await response2.text();
      console.log('❌ Failed to send:', response2.status, error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n🎉 Test Complete!\n');
  console.log('Check your Discord channel for:');
  console.log('  1. Simple test message');
  console.log('  2. Formatted alpha alert embed');
  console.log('\nIf you see both messages, the Discord webhook is configured correctly! ✅');
}

testDiscordWebhook().catch(console.error);
