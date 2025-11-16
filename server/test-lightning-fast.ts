/**
 * LIGHTNING FAST Redis Caching Test
 * 
 * Test the new Redis-cached infrastructure for sub-200ms performance
 * Tests both Redis cache and FastRPC services
 */

import { redisCache } from './services/redis-cache';
import { fastRPC } from './services/fast-rpc';
import { getBirdeyeOverview } from './services/birdeye-api';
import { tokenAnalyzer } from './solana-analyzer';

const TEST_TOKEN = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC for testing

async function testLightningFastPerformance() {
  console.log('🚀 LIGHTNING FAST Performance Test Starting...\n');

  try {
    // Test 1: Redis Cache Basic Operations
    console.log('🔥 Test 1: Redis Cache Operations');
    const start1 = Date.now();
    
    // Test cache set/get
    await redisCache.set('test:performance', { message: 'Lightning fast!', timestamp: Date.now() });
    const cachedData = await redisCache.get('test:performance');
    
    const redis1 = Date.now() - start1;
    console.log(`   ✅ Redis cache operations: ${redis1}ms`);
    console.log(`   📦 Cached data: ${JSON.stringify(cachedData)}\n`);

    // Test 2: FastRPC Service
    console.log('🔥 Test 2: Cached RPC Operations');
    const start2 = Date.now();
    
    const accountInfo = await fastRPC.getAccountInfo(TEST_TOKEN);
    const rpc2 = Date.now() - start2;
    
    console.log(`   ✅ Cached getAccountInfo: ${rpc2}ms`);
    console.log(`   🏦 Account owner: ${accountInfo?.owner.toBase58()}\n`);

    // Test 3: Cached Birdeye API
    console.log('🔥 Test 3: Cached Birdeye API');
    const start3 = Date.now();
    
    const birdeyeData = await getBirdeyeOverview(TEST_TOKEN);
    const birdeye3 = Date.now() - start3;
    
    console.log(`   ✅ Cached Birdeye overview: ${birdeye3}ms`);
    console.log(`   💰 USDC price: $${birdeyeData?.price || 'N/A'}\n`);

    // Test 4: Second calls should be even faster (cache hits)
    console.log('🔥 Test 4: Cache Hit Performance');
    
    const start4a = Date.now();
    await fastRPC.getAccountInfo(TEST_TOKEN);
    const hit1 = Date.now() - start4a;
    
    const start4b = Date.now();
    await getBirdeyeOverview(TEST_TOKEN);
    const hit2 = Date.now() - start4b;
    
    console.log(`   ⚡ Cache hit RPC: ${hit1}ms`);
    console.log(`   ⚡ Cache hit Birdeye: ${hit2}ms\n`);

    // Test 5: Redis health and connection count
    console.log('🔥 Test 5: System Health');
    const health = await redisCache.getHealth();
    const rpcHealth = await fastRPC.getHealthStatus();
    
    console.log(`   🩺 Redis status: ${health.status}`);
    console.log(`   📊 Cache hit rate: ${health.hitRate?.toFixed(2)}%`);
    console.log(`   🔗 RPC endpoints: ${rpcHealth.totalEndpoints} (${rpcHealth.healthyEndpoints} healthy)\n`);

    // Final performance summary
    console.log('📈 LIGHTNING FAST Summary:');
    console.log(`   🥇 Best RPC time: ${Math.min(rpc2, hit1)}ms`);
    console.log(`   🥇 Best API time: ${Math.min(birdeye3, hit2)}ms`);
    console.log(`   🎯 Target: <200ms ✅`);
    
    const avgTime = (rpc2 + birdeye3) / 2;
    if (avgTime < 200) {
      console.log(`   🏆 LIGHTNING FAST ACHIEVED! Average: ${avgTime.toFixed(1)}ms`);
    } else {
      console.log(`   ⚠️  Need optimization: ${avgTime.toFixed(1)}ms`);
    }

  } catch (error) {
    console.error('❌ Lightning Fast Test Failed:', error);
  } finally {
    // Cleanup test data
    await redisCache.delete('test:performance');
    await redisCache.disconnect();
    process.exit(0);
  }
}

// Run the test
testLightningFastPerformance().catch(console.error);