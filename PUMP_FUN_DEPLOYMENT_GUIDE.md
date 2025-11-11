# Deploy RTEK Token on pump.fun - Complete Guide

## Prerequisites
✅ Creator wallet generated at `/admin/wallet`  
✅ Private key imported into Phantom wallet  
✅ Wallet funded with at least **0.03 SOL**

---

## Step 1: Fund Your Creator Wallet

1. **Get your creator wallet address:**
   - Visit `/admin/wallet` in your RugKiller app
   - Copy the public address (or check Phantom)

2. **Send SOL to it:**
   - From another wallet or exchange
   - Amount: **0.05 SOL** (safe amount, only ~0.02 needed)
   - Verify receipt at `/admin/wallet` or Phantom

---

## Step 2: Prepare Token Assets

### A. Create Token Logo
- Size: **512x512 px** (recommended)
- Format: PNG or JPG
- Theme: RugKiller branding (red/black, shield/warning theme)
- Save it ready to upload

### B. Token Metadata
Use these details when creating:

```
Name: RugKiller
Symbol: RTEK
Description: The ultimate Solana rug pull detector. Protect yourself with AI-powered analysis, multi-source verification, and real-time alerts. Official contract: AAF1h3emV6qDXKGQ1v6km9qqv9Z6Pja9sPhDjrUCRtek

Website: https://[your-repl-url].replit.app
Twitter: @rugkiller (if you have one)
Telegram: @rugkiller_alpha (if you have one)
```

---

## Step 3: Deploy on pump.fun

### A. Connect to pump.fun

1. Go to: **https://pump.fun**
2. Click "Start a new coin"
3. Connect your Phantom wallet
4. **Make sure you're using the creator wallet** (not your personal wallet)

### B. Fill Token Details

1. **Upload Logo**: Select your 512x512 image
2. **Name**: `RugKiller`
3. **Ticker**: `RTEK`
4. **Description**: (paste from above)
5. **Social Links**: Add website/Twitter/Telegram

### C. CRITICAL: Use Your Vanity Address

⚠️ **IMPORTANT**: You CANNOT use a custom vanity address on pump.fun's UI!

pump.fun auto-generates token addresses. You have **two options**:

**Option 1: Use pump.fun (Easier, Recommended)**
- Let pump.fun generate a random address
- Still earn 0.05% creator rewards
- Fastest deployment
- ❌ Won't use `AAF1h3emV6qDXKGQ1v6km9qqv9Z6Pja9sPhDjrUCRtek`

**Option 2: Deploy with Vanity Address (Advanced)**
- I can build a deployment script that uses your vanity keypair
- Deploys SPL token directly to Solana
- Upload metadata to Arweave
- Create liquidity on Raydium manually
- ✅ Uses `AAF1h3emV6qDXKGQ1v6km9qqv9Z6Pja9sPhDjrUCRtek`
- More complex setup

---

## Step 4: Launch & Earn Rewards

### If Using pump.fun (Option 1):

1. **Review & Launch:**
   - Confirm all details
   - Click "Create coin"
   - Approve transaction in Phantom (~0.02 SOL fee)

2. **Token is LIVE!** 🚀
   - You'll get a unique pump.fun URL
   - Share it on Twitter/Telegram
   - Trading starts immediately

3. **Earnings Start Automatically:**
   - Every trade = 0.05% to your creator wallet
   - Rewards accumulate in SOL
   - Claim anytime at pump.fun/profile

### If Using Vanity Address (Option 2):

Would you like me to build the deployment script? I'll need to:
- Generate keypair from vanity seed
- Deploy SPL token with that address
- Upload metadata to Arweave
- Guide you through Raydium liquidity setup

---

## Step 5: Claim Creator Rewards

When you're ready to claim your earnings:

1. Go to **https://pump.fun**
2. Connect with your **creator wallet** in Phantom
3. Click your profile picture → "Profile"
4. Click "Coins" tab
5. Find your RTEK token
6. Click **"CLAIM SOL REWARDS"**
7. Approve transaction → SOL sent to your wallet!

You can claim as often as you want, no minimum required.

---

## Step 6: Integrate Token-Gated Access

After deployment, update RugKiller config:

1. Copy your token's contract address
2. Update `client/src/constants.ts`:
   ```typescript
   export const CONTRACT_ADDRESS = "YourActualTokenAddress";
   ```
3. Users holding 10M+ RTEK get free access!

---

## Cost Summary

**pump.fun Route:**
- Creation fee: ~0.02 SOL (~$4)
- Total needed: 0.05 SOL (with buffer)

**Custom Vanity Route:**
- Token creation: ~0.00144 SOL
- Metadata: ~0.01 SOL
- Initial liquidity: 0.5-1 SOL (optional)
- Total: 0.05-1.5 SOL depending on liquidity

---

## Which Option Do You Want?

**Option 1** (pump.fun - Easier):
- ✅ Fastest deployment
- ✅ Built-in trading UI
- ✅ Creator rewards automatic
- ❌ Random token address

**Option 2** (Vanity - Advanced):
- ✅ Use `AAF1h3emV6qDXKGQ1v6km9qqv9Z6Pja9sPhDjrUCRtek`
- ✅ Full control
- ❌ More complex setup
- ❌ Manual liquidity management

Let me know which you prefer!
