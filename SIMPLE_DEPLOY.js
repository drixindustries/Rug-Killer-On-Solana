#!/usr/bin/env node
/**
 * SIMPLE $RUGK TOKEN DEPLOYMENT - NO VANITY ADDRESS
 * Deploys in 30 seconds instead of 15 minutes
 */

const { 
  Connection, 
  Keypair, 
  SystemProgram, 
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
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

const readline = require('readline');

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

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

function encodeKeypair(keypair) {
  return JSON.stringify(Array.from(keypair.secretKey));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   🚀 SIMPLE $RUGK TOKEN DEPLOYMENT (NO VANITY) 🚀 ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  console.log('📋 Token: RugKiller ($RUGK)');
  console.log('📋 Supply: 1,000,000,000 tokens');
  console.log('📋 Cost: ~0.003 SOL (~$0.50)\n');

  // Step 1: Paste your wallet private key
  console.log('⚠️  PASTE YOUR PHANTOM WALLET PRIVATE KEY:');
  console.log('   (Open Phantom → Settings → Show Private Key)\n');
  
  const privateKeyInput = await askQuestion('Private Key (as array or base58): ');
  
  let payerKeypair;
  try {
    // Try parsing as JSON array first
    const secretKey = JSON.parse(privateKeyInput);
    payerKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch {
    // Try as base58
    const bs58 = require('bs58');
    const decoded = bs58.decode ? bs58.decode(privateKeyInput) : bs58.default.decode(privateKeyInput);
    payerKeypair = Keypair.fromSecretKey(decoded);
  }

  console.log(`\n✅ Wallet loaded: ${payerKeypair.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(payerKeypair.publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;
  console.log(`💰 Balance: ${balanceSOL.toFixed(4)} SOL`);

  if (balanceSOL < 0.003) {
    console.error('\n❌ Insufficient balance. Need at least 0.003 SOL');
    process.exit(1);
  }

  // Confirm
  const confirm = await askQuestion('\n⚠️  Deploy now? Type "yes": ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  // Generate token mint
  console.log('\n🔄 Creating token mint...');
  const mintKeypair = Keypair.generate();

  // Get rent
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  // Create account
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
    9, // decimals
    payerKeypair.publicKey,
    payerKeypair.publicKey,
    TOKEN_PROGRAM_ID
  );

  const tx1 = new Transaction().add(createAccountIx, initializeMintIx);
  const sig1 = await sendAndConfirmTransaction(connection, tx1, [payerKeypair, mintKeypair]);
  console.log(`✅ Mint created! Sig: ${sig1.slice(0, 20)}...`);

  // Create token account and mint
  console.log('🔄 Minting tokens...');
  const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, payerKeypair.publicKey);
  
  const createATAIx = createAssociatedTokenAccountInstruction(
    payerKeypair.publicKey,
    ata,
    payerKeypair.publicKey,
    mintKeypair.publicKey
  );

  const mintToIx = createMintToInstruction(
    mintKeypair.publicKey,
    ata,
    payerKeypair.publicKey,
    1_000_000_000 * Math.pow(10, 9)
  );

  const tx2 = new Transaction().add(createATAIx, mintToIx);
  const sig2 = await sendAndConfirmTransaction(connection, tx2, [payerKeypair]);
  console.log(`✅ Tokens minted! Sig: ${sig2.slice(0, 20)}...`);

  // SUCCESS
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║              🎉 DEPLOYMENT SUCCESS! 🎉            ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log('📍 TOKEN CONTRACT ADDRESS (CA):');
  console.log(`   ${mintKeypair.publicKey.toBase58()}\n`);

  console.log('🔗 View on Solscan:');
  console.log(`   https://solscan.io/token/${mintKeypair.publicKey.toBase58()}\n`);

  console.log('💾 SAVE THIS MINT KEYPAIR:');
  console.log(`   ${encodeKeypair(mintKeypair)}\n`);
}

main().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
