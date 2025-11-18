import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Coins, Crown, Flame, Wallet, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

const pricingTiers = [
  {
    id: "free",
    name: "FREE Trial",
    icon: Flame,
    price: "$0",
    period: "7 days",
    description: "Get started with basic token analysis",
    features: [
      "3 token analyses per day",
      "Basic risk score",
      "Top 20 holder analysis",
      "Authority checks",
      "7-day trial period"
    ],
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    badge: null,
    testId: "card-tier-free",
    tier: null
  },
  {
    id: "pro",
    name: "PRO",
    icon: Coins,
    price: "$29",
    period: "per month",
    description: "Advanced analytics for serious investors",
    features: [
      "Unlimited token analyses",
      "Full risk score + AI detection",
      "BubbleMaps visualization",
      "Rugcheck + GoPlus integration",
      "DexScreener market data",
      "Telegram & Discord bot access",
      "Blacklist database access",
      "Priority support"
    ],
    cta: "Subscribe to PRO",
    ctaVariant: "default" as const,
    badge: "Popular",
    testId: "card-tier-pro",
    tier: "individual" as const
  },
  {
    id: "group",
    name: "GROUP",
    icon: Crown,
    price: "$120",
    period: "per month",
    description: "Premium features for Discord/Telegram groups",
    features: [
      "Everything in PRO",
      "Real-time alerts",
      "Custom watchlists",
      "API access",
      "Advanced smart money tracking",
      "Bundling detection",
      "Historical data (90 days)",
      "White-glove support"
    ],
    cta: "Subscribe to GROUP",
    ctaVariant: "default" as const,
    badge: "Premium",
    testId: "card-tier-group",
    tier: "group" as const
  },
  {
    id: "kill-holder",
    name: "$ANTIRUG Holder",
    icon: Wallet,
    price: "FREE",
    period: "forever",
    description: "Hold 10M+ $ANTIRUG tokens for lifetime access",
    features: [
      "Everything in GROUP tier",
      "Lifetime access (no monthly fees)",
      "Exclusive holder perks (To Be Announced)",
      "Early access to new features",
      "Governance voting rights",
      "VIP Discord channel"
    ],
    cta: "Connect Wallet",
    ctaVariant: "outline" as const,
    badge: "Exclusive",
    testId: "card-tier-kill",
    tier: null
  }
];

export default function Pricing() {
  const { toast } = useToast();

  // Check current subscription status
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['/api/subscription/status'],
    retry: false,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (tier: 'individual' | 'group') => {
      const response = await apiRequest('POST', '/api/create-subscription', { tier });
      const data = await response.json();
      return data;
    },
    onSuccess: async (data) => {
      // Redirect to Whop checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper: Check if subscription is in an active state (Whop statuses)
  const isActive = (status?: string) => {
    const activeStatuses = ['valid', 'trialing', 'past_due'];
    return status && activeStatuses.includes(status);
  };

  const handleWalletConnect = () => {
    // Trigger wallet connection modal (if implemented)
    toast({
      title: "Connect Wallet",
      description: "Please connect your Phantom wallet from the header menu to verify your $ANTIRUG token holdings.",
    });
  };

  const handleFreeTrial = () => {
    window.location.href = '/';
  };

  const handleSubscribe = (tier: 'individual' | 'group') => {
    createSubscriptionMutation.mutate(tier);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From free trials to whale-tier analytics. Find the perfect plan for your needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tierData) => {
              const Icon = tierData.icon;
              const isCurrentPlan = subscription?.tier === tierData.tier && isActive(subscription?.status);
              const isPending = createSubscriptionMutation.isPending;
              
              return (
                <Card 
                  key={tierData.id} 
                  className={tierData.badge === "Popular" ? "border-primary shadow-lg" : ""}
                  data-testid={tierData.testId}
                >
                  <CardHeader>
                    {tierData.badge && (
                      <Badge className="w-fit mb-2" data-testid={`badge-${tierData.id}`}>
                        {tierData.badge}
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{tierData.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" data-testid={`text-price-${tierData.id}`}>
                        {tierData.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {tierData.period}
                      </span>
                    </div>
                    <CardDescription>{tierData.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      {tierData.features.map((feature, index) => (
                        <li 
                          key={index} 
                          className="flex items-start gap-2 text-sm"
                          data-testid={`feature-${tierData.id}-${index}`}
                        >
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    {tierData.id === "kill-holder" ? (
                      <Button 
                        className="w-full" 
                        variant={tierData.ctaVariant}
                        onClick={handleWalletConnect}
                        data-testid={`button-cta-${tierData.id}`}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        {tierData.cta}
                      </Button>
                    ) : tierData.id === "free" ? (
                      <Button 
                        className="w-full" 
                        variant={tierData.ctaVariant}
                        onClick={handleFreeTrial}
                        data-testid={`button-cta-${tierData.id}`}
                      >
                        {tierData.cta}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant={tierData.ctaVariant}
                        onClick={() => tierData.tier && handleSubscribe(tierData.tier)}
                        disabled={isPending || Boolean(isCurrentPlan)}
                        data-testid={`button-cta-${tierData.id}`}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : (
                          tierData.cta
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-12 text-center">
            <Card className="max-w-3xl mx-auto" data-testid="card-faq">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-left">
                <div>
                  <h3 className="font-semibold mb-1">How do I become an $ANTIRUG holder?</h3>
                  <p className="text-sm text-muted-foreground">
                    Purchase 10M+ $ANTIRUG tokens and connect your wallet to automatically unlock lifetime access to all premium features.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Can I cancel anytime?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes! All subscriptions can be cancelled at any time. You'll retain access until the end of your billing period.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">What payment methods do you accept?</h3>
                  <p className="text-sm text-muted-foreground">
                    We accept credit cards, Apple Pay, Google Pay, and more via Whop secure checkout (includes automatic tax calculation).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">What's included in the free trial?</h3>
                  <p className="text-sm text-muted-foreground">
                    The 7-day free trial includes 3 token analyses per day with basic risk scoring and holder analysis. No credit card required to start.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How does Whop payment work?</h3>
                  <p className="text-sm text-muted-foreground">
                    Clicking "Subscribe" redirects you to Whop's secure hosted checkout. After payment, you'll be automatically redirected back with instant access to your subscription.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
