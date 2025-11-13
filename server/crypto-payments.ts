import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { db } from "./db";
import { cryptoAddresses, payments, paymentAudit, subscriptions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Payment configuration
const PAYMENT_PRICES = {
  basic: {
    SOL: 0.1, // $20 worth of SOL (adjust based on market price)
    ETH: 0.01, // $20 worth of ETH
    BTC: 0.0005, // $20 worth of BTC
  },
  premium: {
    SOL: 0.5, // $100 worth of SOL
    ETH: 0.05, // $100 worth of ETH
    BTC: 0.0025, // $100 worth of BTC
  },
};

const PAYMENT_EXPIRY_HOURS = 1; // Payment addresses expire after 1 hour
const REQUIRED_CONFIRMATIONS = 6; // Number of confirmations before activating subscription

// Solana connection
const getSolanaConnection = () => {
  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com";
  
  return new Connection(rpcUrl, "confirmed");
};

/**
 * Generate a unique payment address for a user
 * For SOL: Use the main wallet address with a memo system
 * For ETH/BTC: Would generate unique addresses (implemented in separate functions)
 */
export async function generatePaymentAddress(
  userId: string,
  chain: "SOL" | "ETH" | "BTC",
  tier: "basic" | "premium"
) {
  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000);
  
  // Validate environment configuration
  if (chain === "SOL" && !process.env.PHANTOM_WALLET_ADDRESS) {
    throw new Error('CRITICAL: PHANTOM_WALLET_ADDRESS environment variable not configured. Crypto payments are disabled until this is set.');
  }
  
  // Only SOL is currently supported - ETH/BTC will lose funds!
  if (chain !== "SOL") {
    throw new Error(`CRITICAL: Chain ${chain} is not yet supported. Only SOL is currently available. Attempting to use ${chain} will result in lost funds!`);
  }
  
  // Use configured SOL wallet address (assert non-null after validation above)
  const address = process.env.PHANTOM_WALLET_ADDRESS!;
  
  // Create crypto address record
  const [cryptoAddress] = await db
    .insert(cryptoAddresses)
    .values({
      userId,
      chain,
      address,
      tier,
      expiresAt,
      isPaid: false,
    })
    .returning();
  
  // Create pending payment record
  const expectedAmount = PAYMENT_PRICES[tier][chain].toString();
  
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      cryptoAddressId: cryptoAddress.id,
      chain,
      tier,
      amountExpected: expectedAmount,
      status: "pending",
      confirmations: 0,
    })
    .returning();
  
  return {
    cryptoAddress,
    payment,
    amountToPay: expectedAmount,
    expiresAt,
  };
}

/**
 * Check for SOL payment to the main wallet address
 * Looks for transactions with memo matching the payment ID
 */
export async function checkSolPayment(paymentId: string) {
  try {
    const connection = getSolanaConnection();
    
    // Get payment record
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    
    if (!payment || payment.status === "confirmed") {
      return payment;
    }
    
    // Get crypto address
    const [cryptoAddress] = await db
      .select()
      .from(cryptoAddresses)
      .where(eq(cryptoAddresses.id, payment.cryptoAddressId))
      .limit(1);
    
    if (!cryptoAddress) {
      throw new Error("Crypto address not found");
    }
    
    // Check if payment address has expired
    if (new Date() > cryptoAddress.expiresAt) {
      await db
        .update(payments)
        .set({ status: "expired" })
        .where(eq(payments.id, paymentId));
      
      return null;
    }
    
    // Get wallet transactions
    const walletPubkey = new PublicKey(cryptoAddress.address);
    const signatures = await connection.getSignaturesForAddress(walletPubkey, {
      limit: 50,
    });
    
    // Check each transaction for payment
    for (const signatureInfo of signatures) {
      const tx = await connection.getTransaction(signatureInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      if (!tx) continue;
      
      // Check if transaction was created after the payment request
      const txTime = tx.blockTime ? tx.blockTime * 1000 : 0;
      const paymentCreatedTime = new Date(payment.createdAt!).getTime();
      
      if (txTime < paymentCreatedTime) continue;
      
      // Check transaction amount
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];
      
      // Find the account index for our wallet
      const accountIndex = tx.transaction.message.staticAccountKeys.findIndex(
        (key) => key.toString() === walletPubkey.toString()
      );
      
      if (accountIndex === -1) continue;
      
      const received = (postBalances[accountIndex] - preBalances[accountIndex]) / LAMPORTS_PER_SOL;
      
      if (received <= 0) continue;
      
      // Check if amount matches expected amount (with 5% tolerance)
      const expectedAmount = parseFloat(payment.amountExpected);
      const tolerance = expectedAmount * 0.05;
      
      if (received >= expectedAmount - tolerance) {
        // Payment found! Update record
        const confirmations = signatureInfo.confirmationStatus === "finalized" ? 32 : 1;
        
        await db
          .update(payments)
          .set({
            txHash: signatureInfo.signature,
            amountReceived: received.toString(),
            fromAddress: tx.transaction.message.staticAccountKeys[0].toString(),
            confirmations,
            status: confirmations >= REQUIRED_CONFIRMATIONS ? "confirmed" : "pending",
            confirmedAt: confirmations >= REQUIRED_CONFIRMATIONS ? new Date() : undefined,
          })
          .where(eq(payments.id, paymentId));
        
        // Log audit trail
        await db.insert(paymentAudit).values({
          paymentId,
          checkType: "blockchain_scan",
          details: {
            signature: signatureInfo.signature,
            received,
            confirmations,
            txTime,
          },
        });
        
        // If confirmed, activate subscription
        if (confirmations >= REQUIRED_CONFIRMATIONS) {
          await activateSubscription(payment.userId, payment.tier as "basic" | "premium", paymentId);
        }
        
        // Return updated payment
        const [updatedPayment] = await db
          .select()
          .from(payments)
          .where(eq(payments.id, paymentId))
          .limit(1);
        
        return updatedPayment;
      }
    }
    
    // No matching payment found
    return payment;
  } catch (error) {
    console.error("Error checking SOL payment:", error);
    throw error;
  }
}

/**
 * Activate subscription after successful payment
 */
async function activateSubscription(
  userId: string,
  tier: "basic" | "premium",
  paymentId: string
) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  // Check if user already has a subscription
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  
  if (existing) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        tier,
        status: "active",
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    // Create new subscription
    await db.insert(subscriptions).values({
      userId,
      tier,
      status: "active",
      currentPeriodEnd: periodEnd,
    });
  }
  
  // Update payment record
  await db
    .update(payments)
    .set({ subscriptionActivatedAt: now })
    .where(eq(payments.id, paymentId));
  
  console.log(`✅ Subscription activated for user ${userId} - ${tier} tier via crypto payment`);
}

/**
 * Background job to check pending payments
 * Should be called periodically (e.g., every 5 minutes)
 */
export async function checkPendingPayments() {
  try {
    // Get all pending payments
    const pendingPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.status, "pending"));
    
    console.log(`Checking ${pendingPayments.length} pending crypto payments...`);
    
    for (const payment of pendingPayments) {
      if (payment.chain === "SOL") {
        await checkSolPayment(payment.id);
      }
    }
  } catch (error) {
    console.error("Error checking pending payments:", error);
  }
}

/**
 * Get payment status for a user
 */
export async function getPaymentStatus(paymentId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  
  return payment;
}
