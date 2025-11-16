import { Connection } from "@solana/web3.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Helper to safely read env vars
function getEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim() === key) return v as string;
  }
  return undefined;
}

// Build Ankr URL from env
function getAnkrUrl(): string | undefined {
  let raw = getEnv('ANKR_RPC_URL')?.trim();
  const apiKey = getEnv('ANKR_API_KEY')?.trim();

  if ((!raw || raw.length === 0) && apiKey) {
    raw = `https://rpc.ankr.com/solana/${apiKey.replace(/^\"|\"$/g, '')}`;
  }

  if (!raw) return undefined;

  const cleaned = raw.replace(/^\"|\"$/g, '').trim();

  if (!cleaned.startsWith('http')) {
    return `https://rpc.ankr.com/solana/${cleaned}`;
  }

  try {
    const u = new URL(cleaned);
    if (u.protocol !== 'https:') {
      u.protocol = 'https:';
    }
    return u.toString();
  } catch {
    return undefined;
  }
}

async function testAnkrConnection() {
  console.log("🔍 Testing Ankr API Connection...\n");

  const ankrUrl = getAnkrUrl();
  
  if (!ankrUrl) {
    console.error("❌ ANKR_RPC_URL or ANKR_API_KEY not found in environment");
    process.exit(1);
  }

  // Mask the API key in the output for security
  const maskedUrl = ankrUrl.replace(/([a-f0-9]{32,})/gi, (match) => {
    return match.substring(0, 8) + '...' + match.substring(match.length - 8);
  });

  console.log(`📡 Ankr URL: ${maskedUrl}\n`);

  try {
    const connection = new Connection(ankrUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
    });

    console.log("⏳ Fetching latest slot...");
    const slot = await connection.getSlot();
    console.log(`✅ Current slot: ${slot}`);

    console.log("\n⏳ Fetching block height...");
    const blockHeight = await connection.getBlockHeight();
    console.log(`✅ Block height: ${blockHeight}`);

    console.log("\n⏳ Testing getVersion...");
    try {
      const version = await connection.getVersion();
      console.log(`✅ Solana version: ${version['solana-core']}`);
    } catch (e: any) {
      console.log(`⚠️  getVersion skipped (some RPCs don't support this): ${e.message}`);
    }

    console.log("\n🎉 All tests passed! Ankr API key is working correctly.\n");
    
  } catch (error: any) {
    console.error("\n❌ Connection test failed:");
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('403') || error.message.includes('401')) {
      console.error("\n⚠️  This looks like an authentication error. Please check:");
      console.error("   1. Your API key is correct");
      console.error("   2. Your API key hasn't expired");
      console.error("   3. The URL format is correct");
    } else if (error.message.includes('rate limit')) {
      console.error("\n⚠️  Rate limit reached. Try again in a moment.");
    }
    
    process.exit(1);
  }
}

testAnkrConnection();
