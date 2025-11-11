import Whop from "@whop/sdk";

// Initialize Whop client
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_APP_ID = process.env.WHOP_APP_ID;
const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID;

if (!WHOP_API_KEY || !WHOP_APP_ID) {
  console.warn("⚠️  Whop not configured (missing WHOP_API_KEY or WHOP_APP_ID)");
}

export const whopClient = new Whop({
  appID: WHOP_APP_ID || "",
  apiKey: WHOP_API_KEY || "",
});

export const whopConfig = {
  apiKey: WHOP_API_KEY,
  appId: WHOP_APP_ID,
  companyId: WHOP_COMPANY_ID,
};

// Whop plan IDs (set these in environment variables)
export const WHOP_PLAN_IDS = {
  INDIVIDUAL: process.env.WHOP_PLAN_ID_INDIVIDUAL || "",
  GROUP: process.env.WHOP_PLAN_ID_GROUP || "",
};

// Helper to create checkout session
export async function createWhopCheckout(params: {
  planId: string;
  userId: string;
  userEmail?: string;
  metadata?: Record<string, string>;
}) {
  if (!WHOP_COMPANY_ID) {
    throw new Error("WHOP_COMPANY_ID not configured");
  }

  try {
    const response = await whopClient.payments.createCheckoutSession({
      planId: params.planId,
      redirectUrl: `${process.env.REPL_HOME || "http://localhost:5000"}/subscription/success`,
      metadata: {
        user_id: params.userId,
        user_email: params.userEmail || "",
        ...params.metadata,
      },
    });

    return {
      checkoutUrl: response.purchase_url,
      sessionId: response.id,
    };
  } catch (error: any) {
    console.error("Error creating Whop checkout:", error);
    throw new Error(`Failed to create checkout: ${error.message}`);
  }
}

// Helper to retrieve membership details
export async function getWhopMembership(membershipId: string) {
  try {
    const membership = await whopClient.memberships.retrieve(membershipId);
    return membership;
  } catch (error: any) {
    console.error("Error retrieving membership:", error);
    return null;
  }
}

// Helper to cancel membership
export async function cancelWhopMembership(membershipId: string) {
  try {
    await whopClient.memberships.cancel(membershipId);
    return true;
  } catch (error: any) {
    console.error("Error canceling membership:", error);
    return false;
  }
}

// Helper to check if membership is valid
export function isMembershipValid(membership: any): boolean {
  if (!membership) return false;
  
  // Check if membership status is valid
  const validStatuses = ["active", "trialing", "past_due"];
  if (!validStatuses.includes(membership.status)) {
    return false;
  }
  
  // Check if membership has expired
  if (membership.valid_until) {
    const validUntil = new Date(membership.valid_until * 1000);
    return validUntil > new Date();
  }
  
  return true;
}

// Map Whop membership status to our database status
export function mapWhopStatus(whopStatus: string): string {
  const statusMap: Record<string, string> = {
    "active": "valid",
    "trialing": "trialing",
    "past_due": "past_due",
    "canceled": "cancelled",
    "incomplete": "expired",
    "incomplete_expired": "expired",
    "unpaid": "past_due",
  };
  
  return statusMap[whopStatus] || "expired";
}

// Map plan ID to tier
export function mapPlanToTier(planId: string): string {
  if (planId === WHOP_PLAN_IDS.GROUP) return "group";
  if (planId === WHOP_PLAN_IDS.INDIVIDUAL) return "individual";
  return "free_trial";
}
