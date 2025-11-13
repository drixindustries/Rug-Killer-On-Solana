# 🚀 Secure $ANTIRUG Token Deployment Guide

## Why Local Deployment?

**Security First**: Your private keys should NEVER be transmitted to any server. This local script runs 100% on your computer, ensuring your wallet stays secure.

---

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed ([Download here](https://nodejs.org/))
2. **A Solana wallet with 0.1 SOL** (Phantom, Solflare, etc.)
3. **~15 minutes** for vanity address generation

**SECURITY NOTE:** This script generates a fresh burner wallet automatically. You'll transfer 0.1 SOL to it from your main wallet. Your main wallet's private key is NEVER exposed.

---

## Installation Steps

### 1. Download the Script

Download `DEPLOY_ANTIRUG_LOCALLY.js` from this repository.

### 2. Install Dependencies

Open your terminal in the folder containing the script and run:

```bash
npm install @solana/web3.js @solana/spl-token bs58
```

### 3. Have Your Wallet Ready

Make sure you have:
- Phantom, Solflare, or any Solana wallet
- At least 0.1 SOL in your wallet
- Ability to send SOL from your wallet

**SECURITY:** The script will generate a burner wallet for you. You'll simply send 0.1 SOL to it from your main wallet. Your main wallet's private key stays safe in Phantom!

---

## Running the Deployment

### 1. Execute the Script

```bash
node DEPLOY_ANTIRUG_LOCALLY.js
```

### 2. Follow the Prompts

The script will:

**Step 1:** Generate a burner wallet automatically
```
🔐 SECURITY: Generating fresh burner wallet for deployment...
✅ Burner wallet generated: ABC123...xyz

⚠️  ACTION REQUIRED:
   Transfer 0.1 SOL to this address from your main wallet:
   ABC123...xyz
```

**Step 2:** Wait for you to transfer SOL
- Open Phantom/Solflare
- Send 0.1 SOL to the burner address shown
- Press ENTER in the script when done

**Step 3:** Confirm deployment
```
⚠️  Ready to deploy? This will cost ~0.05 SOL. Type "yes" to continue: yes
```

### 3. Wait for Vanity Generation

The script will generate a vanity address ending in "tek":

```
🔍 Generating vanity address ending in "tek"...
⏳ This may take 5-15 minutes. Please wait...

🔄 Attempts: 1,234,567 | Rate: 123,456/s | Time: 10s
```

**This is normal!** Vanity generation is computationally intensive.

### 4. Token Deployment

Once the vanity address is found, the script will:
- ✅ Create the token mint account
- ✅ Initialize the mint
- ✅ Mint 1 billion $ANTIRUG tokens to your wallet

---

## After Deployment

### 🎉 Success Output

You'll see something like this:

```
╔═══════════════════════════════════════════════════════╗
║           🎉 DEPLOYMENT SUCCESSFUL! 🎉                ║
╚═══════════════════════════════════════════════════════╝

📍 Token Address (Vanity):
   ABC123...456tek

🔑 Token Mint Keypair (SAVE THIS!):

⚠️  WARNING: This is the ONLY time you'll see this private key!
   Import it into Phantom to control the token and access fees.

   Public Key:  ABC123...456tek
   Private Key: 5K7m2...xyz123
```

### Import Mint Keypair to Phantom

**CRITICAL STEP - Don't skip this!**

1. **Copy the Private Key** shown in the output (you'll never see it again)
2. Open **Phantom wallet**
3. Settings → **"Import Private Key"**
4. Paste the private key
5. Give it a name like "ANTIRUG Mint Authority"

**This gives you:**
- ✅ Control over the token mint
- ✅ Ability to mint more tokens (if needed)
- ✅ Access to any fees associated with the token

---

## What You Get

### Token Details

- **Name:** RugKiller
- **Symbol:** $ANTIRUG
- **Supply:** 1,000,000,000 (1 billion)
- **Decimals:** 9
- **Vanity Address:** Ends in "tek" (e.g., `9x7yZ...456tek`)

### Token Authorities

- **Mint Authority:** Your wallet (can mint more tokens)
- **Freeze Authority:** Your wallet (can freeze transfers)

### Your Holdings

All 1 billion tokens are minted to **your wallet** (the one you used to deploy).

---

## Viewing Your Token

### On Solscan
```
https://solscan.io/token/[YOUR_TOKEN_ADDRESS]
```

### On DexScreener
```
https://dexscreener.com/solana/[YOUR_TOKEN_ADDRESS]
```

---

## Next Steps

### 1. Update RugKiller App

Send your deployed token address to update:
- `client/src/constants.ts` → `CONTRACT_ADDRESS`
- Token-gated access (10M+ $ANTIRUG) will work automatically

### 2. Add Liquidity (Optional)

To make $ANTIRUG tradeable:

**Option A: Raydium**
1. Visit [Raydium.io](https://raydium.io/)
2. Connect Phantom wallet
3. Create a liquidity pool (SOL/$ANTIRUG)
4. Add initial liquidity (e.g., 10 SOL + equivalent $ANTIRUG)

**Option B: Jupiter**
1. Visit [Jupiter.ag](https://jup.ag/)
2. Similar process to Raydium

**Recommended Initial Liquidity:**
- 10-50 SOL worth
- Provides enough liquidity for trading
- Can add more later

### 3. Marketing & Distribution

- Update social media with token address
- Share on Solana communities
- Distribute tokens to early users
- Set up staking/rewards (optional)

---

## Troubleshooting

### "Insufficient balance" Error

**Problem:** Wallet doesn't have enough SOL  
**Solution:** Send at least 0.1 SOL to your wallet

### "Invalid private key format" Error

**Problem:** Private key is not in base58 format  
**Solution:** Make sure you're copying the private key, not the seed phrase

### Vanity Generation Takes Too Long

**Problem:** Searching for rare pattern  
**Solution:** Wait longer (can take up to 30 minutes for "tek" suffix)

### Transaction Failed

**Problem:** Network issues or insufficient fees  
**Solution:** Try again - your SOL is not lost

---

## Security Best Practices

✅ **DO:**
- Run the script on your personal computer
- Transfer SOL from your main wallet (keeps your main key safe)
- Import the mint keypair into Phantom immediately
- Back up the mint keypair securely
- **Clear your terminal history after deployment:** `history -c` (Linux/Mac) or close terminal (Windows)
- **Delete the script after successful deployment**

❌ **DON'T:**
- Share the mint keypair with anyone
- Run the script on public computers
- Store keypairs in plain text files
- Lose the mint keypair (you can't recover it)

**SECURITY BONUS:** The burner wallet approach means your main wallet's private key is never exposed to the script!

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Mint account rent | ~0.00144 SOL |
| Token account creation | ~0.002 SOL |
| Transaction fees | ~0.001 SOL |
| **Total** | **~0.005 SOL** |

**Recommended:** Have 0.1 SOL for safety buffer

---

## Support

If you encounter issues:

1. Check you have Node.js 18+ installed: `node --version`
2. Verify dependencies are installed: `npm list`
3. Make sure your wallet has sufficient SOL
4. Try using a custom RPC (set `SOLANA_RPC_URL` environment variable)

---

## Summary

This secure deployment script:
- ✅ Runs 100% locally on your computer
- ✅ Never transmits your private keys
- ✅ Generates vanity address ending in "tek"
- ✅ Deploys $ANTIRUG to Solana mainnet
- ✅ Gives you full control via Phantom import

**Ready to deploy? Run the script and follow the prompts!** 🚀
