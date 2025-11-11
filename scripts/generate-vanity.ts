import { VanityAddressGenerator } from '../server/vanity-generator';

async function main() {
  const pattern = process.argv[2] || 'KILL';
  const matchType = (process.argv[3] as 'prefix' | 'suffix' | 'contains') || 'suffix';

  console.log(`\n🔍 Generating vanity address...`);
  console.log(`   Pattern: "${pattern}"`);
  console.log(`   Match Type: ${matchType}\n`);

  // Get estimate first
  const estimate = VanityAddressGenerator.estimateDifficulty(pattern, matchType);
  console.log(`📊 Difficulty Estimate:`);
  console.log(`   Expected attempts: ${estimate.estimatedAttempts}`);
  console.log(`   Estimated time: ${estimate.estimatedTime}\n`);

  const generator = new VanityAddressGenerator();

  let lastProgress = 0;
  const result = await generator.generate(
    {
      pattern,
      matchType,
      caseSensitive: false,
      maxAttempts: 100_000_000,
    },
    (attempts, timeMs) => {
      // Progress callback every 10,000 attempts
      const progress = Math.floor(attempts / 10000) * 10000;
      if (progress !== lastProgress) {
        process.stdout.write(
          `\r⚡ Attempts: ${attempts.toLocaleString()} | Time: ${(timeMs / 1000).toFixed(1)}s`
        );
        lastProgress = progress;
      }
    }
  );

  if (!result) {
    console.log('\n\n❌ No matching address found within attempt limit\n');
    process.exit(1);
  }

  console.log('\n\n✅ SUCCESS! Vanity address generated!\n');
  console.log(`📍 Public Key:  ${result.publicKey}`);
  console.log(`🔑 Secret Key:  ${result.secretKey}`);
  console.log(`\n📈 Stats:`);
  console.log(`   Attempts: ${result.attempts.toLocaleString()}`);
  console.log(`   Time: ${(result.timeMs / 1000).toFixed(2)}s`);
  console.log(`   Speed: ${Math.round(result.attempts / (result.timeMs / 1000)).toLocaleString()} attempts/sec\n`);
  console.log(`⚠️  IMPORTANT: Save your secret key securely!`);
  console.log(`   Anyone with this key controls the address.\n`);
}

main().catch(console.error);
