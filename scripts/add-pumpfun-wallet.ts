#!/usr/bin/env tsx
/**
 * Add a new Pump.fun AMM wallet to the permanent whitelist
 * 
 * Usage: npm run add-pumpfun-wallet <wallet_address>
 * Example: npm run add-pumpfun-wallet e4HZW81GuZkgDK2YAdPF6PsToQAB6Go6dL3iQpDz2Hy
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WHITELIST_FILE = path.resolve(__dirname, '..', 'server', 'pumpfun-whitelist.ts');

function addWalletToWhitelist(walletAddress: string, label?: string) {
  if (!walletAddress || walletAddress.length < 32) {
    console.error('❌ Invalid wallet address');
    process.exit(1);
  }

  // Read the current file
  const content = fs.readFileSync(WHITELIST_FILE, 'utf8');

  // Check if wallet already exists
  if (content.includes(walletAddress)) {
    console.log(`✅ Wallet ${walletAddress} already exists in whitelist`);
    return;
  }

  // Find the CORE_PUMPFUN_ADDRESSES Set and add the new address
  const setPattern = /const CORE_PUMPFUN_ADDRESSES = new Set\(\[([\s\S]*?)\]\);/;
  const match = content.match(setPattern);

  if (!match) {
    console.error('❌ Could not find CORE_PUMPFUN_ADDRESSES in file');
    process.exit(1);
  }

  const existingAddresses = match[1];
  const commentLabel = label || 'Pump.fun System Wallet';
  const newAddress = `  '${walletAddress}',  // ${commentLabel}`;

  // Insert before the closing bracket
  const updatedContent = content.replace(
    setPattern,
    `const CORE_PUMPFUN_ADDRESSES = new Set([${existingAddresses}${newAddress}\n]);`
  );

  // Write back to file
  fs.writeFileSync(WHITELIST_FILE, updatedContent, 'utf8');

  console.log(`✅ Added ${walletAddress} to Pump.fun whitelist`);
  console.log(`📝 Label: ${commentLabel}`);
  console.log(`\n⚠️  Next steps:`);
  console.log(`   1. Restart the server to apply changes`);
  console.log(`   2. Wait 5 minutes for cache to expire, or clear Redis cache manually`);
  console.log(`   3. Commit changes: git add server/pumpfun-whitelist.ts && git commit -m "Add ${walletAddress} to Pump.fun whitelist"`);
}

// Get args
const walletAddress = process.argv[2];
const label = process.argv[3];

if (!walletAddress) {
  console.error('❌ Usage: npm run add-pumpfun-wallet <wallet_address> [label]');
  process.exit(1);
}

addWalletToWhitelist(walletAddress, label);
