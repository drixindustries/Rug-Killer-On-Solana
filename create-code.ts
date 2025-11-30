import { db } from './server/db';
import { subscriptionCodes } from './shared/schema';

async function createCode() {
  try {
    const result = await db.insert(subscriptionCodes).values({
      code: 'LABELTAINE2021',
      tier: 'lifetime',
      maxUses: 1,
      isActive: true,
      expiresAt: null
    }).returning();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Redemption Code Created!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CODE: LABELTAINE2021');
    console.log('Tier: Lifetime Access');
    console.log('Max Uses: 1');
    console.log('\n📱 To redeem in Discord:');
    console.log('   /redeem LABELTAINE2021');
    console.log('\n🌐 To redeem on website:');
    console.log('   Go to /subscription page');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\nNote: Make sure DATABASE_URL is set in .env');
    process.exit(1);
  }
}

createCode();
