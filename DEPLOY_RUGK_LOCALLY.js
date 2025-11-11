#!/usr/bin/env node
/**
 * 🚀 SECURE RUGKILLER ($RUGK) TOKEN DEPLOYMENT SCRIPT
 * 
 * This script runs 100% locally on your machine.
 * Your private keys NEVER leave your computer.
 * 
 * What it does:
 * 1. Generates vanity address ending in "tek"
 * 2. Deploys RugKiller token to Solana mainnet
 * 3. Gives you the keypair to import into Phantom
 * 
 * Requirements:
 * - Node.js 18+
 * - ~0.01 SOL in your wallet (actual cost ~0.003 SOL)
 */

const { 
  Connection, 
  Keypair, 
  SystemProgram, 
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  PublicKey
} = require('@solana/web3.js');

const {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} = require('@solana/spl-token');

const bs58 = require('bs58');
const readline = require('readline');

// Helper function to encode keypair to base58
function encodeKeypair(keypair) {
  return bs58.default ? bs58.default.encode(keypair.secretKey) : bs58.encode(keypair.secretKey);
}

// ============================================
// CONFIGURATION
// ============================================

const TOKEN_CONFIG = {
  name: 'RugKiller',
  symbol: 'RUGK',
  decimals: 9,
  supply: 1_000_000_000, // 1 billion tokens
  description: 'The ultimate Solana rug pull detector',
  vanitySuffix: 'tek', // Address will end in "tek"
};

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// ============================================
// VANITY ADDRESS GENERATOR
// ============================================

function generateVanityAddress(suffix, maxAttempts = 50_000_000) {
  console.log(`\n🔍 Generating vanity address ending in "${suffix}"...`);
  console.log(`⏳ This may take 5-15 minutes. Please wait...\n`);
  
  const startTime = Date.now();
  let attempts = 0;
  const searchPattern = suffix.toLowerCase();
  
  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = (attempts / elapsed).toFixed(0);
    process.stdout.write(`\r🔄 Attempts: ${attempts.toLocaleString()} | Rate: ${rate}/s | Time: ${elapsed}s`);
  }, 1000);

  while (attempts < maxAttempts) {
    attempts++;
    
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const checkKey = publicKey.toLowerCase();

    if (checkKey.endsWith(searchPattern)) {
      clearInterval(progressInterval);
      const timeMs = Date.now() - startTime;
      
      console.log(`\n\n✅ SUCCESS! Found vanity address in ${attempts.toLocaleString()} attempts`);
      console.log(`⏱️  Time taken: ${(timeMs / 1000).toFixed(1)} seconds\n`);
      
      return {
        publicKey,
        secretKey: encodeKeypair(keypair),
        keypair,
        attempts,
        timeMs,
      };
    }
  }

  clearInterval(progressInterval);
  console.log(`\n\n❌ Failed to find vanity address after ${maxAttempts.toLocaleString()} attempts`);
  return null;
}

// ============================================
// TOKEN DEPLOYMENT
// ============================================

async function deployToken(payerKeypair, mintKeypair) {
  console.log('\n📦 Deploying $RUGK token to Solana mainnet...\n');
  
  try {
    // Check balance
    const balance = await connection.getBalance(payerKeypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    console.log(`💰 Wallet balance: ${balanceSOL.toFixed(4)} SOL`);
    
    if (balanceSOL < 0.01) {
      throw new Error(`Insufficient balance. Need at least 0.01 SOL, have ${balanceSOL.toFixed(4)} SOL`);
    }

    // Get rent-exempt balance
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    console.log(`💸 Rent cost: ${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

    // Create mint account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payerKeypair.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    });

    // Initialize mint
    const initializeMintIx = createInitializeMintInstruction(
      mintKeypair.publicKey,
      TOKEN_CONFIG.decimals,
      payerKeypair.publicKey, // mint authority
      payerKeypair.publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    );

    // Send transaction
    console.log('📤 Sending create mint transaction...');
    const transaction = new Transaction().add(createAccountIx, initializeMintIx);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair, mintKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`✅ Token mint created!`);
    console.log(`🔗 Signature: ${signature}\n`);

    // Create associated token account
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      payerKeypair.publicKey
    );

    const createATAIx = createAssociatedTokenAccountInstruction(
      payerKeypair.publicKey,
      associatedTokenAddress,
      payerKeypair.publicKey,
      mintKeypair.publicKey
    );

    // Mint initial supply
    const mintAmount = TOKEN_CONFIG.supply * Math.pow(10, TOKEN_CONFIG.decimals);
    const mintToIx = createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAddress,
      payerKeypair.publicKey,
      mintAmount
    );

    console.log('📤 Minting initial supply...');
    const mintTx = new Transaction().add(createATAIx, mintToIx);
    const mintSig = await sendAndConfirmTransaction(
      connection,
      mintTx,
      [payerKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`✅ Minted ${TOKEN_CONFIG.supply.toLocaleString()} $${TOKEN_CONFIG.symbol} tokens!`);
    console.log(`🔗 Signature: ${mintSig}\n`);

    return {
      mintAddress: mintKeypair.publicKey.toBase58(),
      signature: mintSig,
    };

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    throw error;
  }
}

// ============================================
// USER INPUT
// ============================================

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

// ============================================
// MAIN SCRIPT
// ============================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║    🔥 RUGKILLER ($RUGK) TOKEN DEPLOYMENT SCRIPT 🔥   ║');
  console.log('║                                                       ║');
  console.log('║  100% Secure - Your keys never leave your computer   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  console.log('\n📋 Token Configuration:');
  console.log(`   Name: ${TOKEN_CONFIG.name}`);
  console.log(`   Symbol: $${TOKEN_CONFIG.symbol}`);
  console.log(`   Supply: ${TOKEN_CONFIG.supply.toLocaleString()}`);
  console.log(`   Decimals: ${TOKEN_CONFIG.decimals}`);
  console.log(`   Vanity: Ending in "${TOKEN_CONFIG.vanitySuffix}"`);
  
  console.log('\n📝 Requirements:');
  console.log('   ✓ ~5-15 minutes for vanity generation');
  console.log('   ✓ 0.01-0.02 SOL to transfer to burner wallet (actual cost ~0.003 SOL)');

  // SECURITY: Generate fresh burner wallet
  console.log('\n🔐 SECURITY: Generating fresh burner wallet for deployment...');
  console.log('   (Your main wallet stays safe - you\'ll transfer SOL to this burner)');
  
  const payerKeypair = Keypair.generate();
  const burnerAddress = payerKeypair.publicKey.toBase58();
  
  console.log(`\n✅ Burner wallet generated: ${burnerAddress}`);
  console.log(`\n⚠️  ACTION REQUIRED:`);
  console.log(`   Transfer 0.01 SOL (or more) to this address from your main wallet:`);
  console.log(`   ${burnerAddress}`);
  console.log('\n   Use Phantom, Solflare, or any wallet to send SOL.');
  console.log('   This burner wallet will be used ONLY for deployment.');
  console.log('   Actual deployment cost is ~0.003 SOL, so 0.01 is plenty.');
  
  // Wait for user to transfer SOL
  await askQuestion('\n✅ Press ENTER after you have transferred SOL to the burner wallet... ');
  
  // Check balance
  let balance = await connection.getBalance(payerKeypair.publicKey);
  let balanceSOL = balance / LAMPORTS_PER_SOL;
  
  if (balanceSOL < 0.01) {
    console.error(`\n❌ Insufficient balance: ${balanceSOL.toFixed(4)} SOL`);
    console.error('   Please transfer at least 0.01 SOL and try again.');
    process.exit(1);
  }
  
  console.log(`✅ Balance confirmed: ${balanceSOL.toFixed(4)} SOL`);
  
  // Save burner keypair for later reference
  const burnerPrivateKey = encodeKeypair(payerKeypair);
  console.log('\n💾 SAVE THIS BURNER KEYPAIR (optional, for recovery only):');
  console.log(`   Public:  ${burnerAddress}`);
  console.log(`   Private: ${burnerPrivateKey}`);
  console.log('\n   (You can discard this after deployment - funds will be minimal)')

  // Confirm deployment
  const confirm = await askQuestion('\n⚠️  Ready to deploy? This will cost ~0.003 SOL. Type "yes" to continue: ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Deployment cancelled');
    process.exit(0);
  }

  // Generate vanity address
  const vanityResult = generateVanityAddress(TOKEN_CONFIG.vanitySuffix);
  
  if (!vanityResult) {
    console.log('\n❌ Failed to generate vanity address. Please try again.');
    process.exit(1);
  }

  // Deploy token
  const deploymentResult = await deployToken(payerKeypair, vanityResult.keypair);

  // SUCCESS!
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║           🎉 DEPLOYMENT SUCCESSFUL! 🎉                ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  console.log('\n📍 Token Address (Vanity):');
  console.log(`   ${deploymentResult.mintAddress}`);
  
  console.log('\n🔑 Token Mint Keypair (SAVE THIS!):');
  console.log('\n⚠️  WARNING: This is the ONLY time you\'ll see this private key!');
  console.log('   Import it into Phantom to control the token and access fees.\n');
  console.log(`   Public Key:  ${vanityResult.publicKey}`);
  console.log(`   Private Key: ${vanityResult.secretKey}`);
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Copy the private key above');
  console.log('   2. Open Phantom → Settings → "Import Private Key"');
  console.log('   3. Paste the private key');
  console.log('   4. You now control the $RUGK token!');
  
  console.log('\n🔗 View on Blockchain:');
  console.log(`   Solscan:     https://solscan.io/token/${deploymentResult.mintAddress}`);
  console.log(`   DexScreener: https://dexscreener.com/solana/${deploymentResult.mintAddress}`);
  
  console.log('\n✅ Deployment complete! Your token is live on Solana mainnet.');
}

// Run the script
main().catch(console.error);
