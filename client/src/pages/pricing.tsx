import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Coins, Crown, Flame, Wallet } from "lucide-react";
import { Link } from "wouter";

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
    testId: "card-tier-free"
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
    testId: "card-tier-pro"
  },
  {
    id: "whale",
    name: "WHALE",
    icon: Crown,
    price: "$99",
    period: "per month",
    description: "Premium features for whale investors",
    features: [
      "Everything in PRO",
      "Real-time alerts",
      "Custom watchlists",
      "API access",
      "Advanced KOL tracking",
      "Bundling detection",
      "Historical data (90 days)",
      "White-glove support",
      "Team collaboration (up to 5 users)"
    ],
    cta: "Subscribe to WHALE",
    ctaVariant: "default" as const,
    badge: "Premium",
    testId: "card-tier-whale"
  },
  {
    id: "kill-holder",
    name: "$KILL Holder",
    icon: Wallet,
    price: "FREE",
    period: "forever",
    description: "Hold 10M+ $KILL tokens for lifetime access",
    features: [
      "Everything in WHALE tier",
      "Lifetime access (no monthly fees)",
      "Exclusive holder perks",
      "Early access to new features",
      "Governance voting rights",
      "NFT rewards",
      "VIP Discord channel"
    ],
    cta: "Connect Wallet",
    ctaVariant: "outline" as const,
    badge: "Exclusive",
    testId: "card-tier-kill"
  }
];

export default function Pricing() {
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
            {pricingTiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card 
                  key={tier.id} 
                  className={tier.badge === "Popular" ? "border-primary shadow-lg" : ""}
                  data-testid={tier.testId}
                >
                  <CardHeader>
                    {tier.badge && (
                      <Badge className="w-fit mb-2" data-testid={`badge-${tier.id}`}>
                        {tier.badge}
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" data-testid={`text-price-${tier.id}`}>
                        {tier.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {tier.period}
                      </span>
                    </div>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      {tier.features.map((feature, index) => (
                        <li 
                          key={index} 
                          className="flex items-start gap-2 text-sm"
                          data-testid={`feature-${tier.id}-${index}`}
                        >
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    {tier.id === "kill-holder" ? (
                      <Button 
                        className="w-full" 
                        variant={tier.ctaVariant}
                        data-testid={`button-cta-${tier.id}`}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        {tier.cta}
                      </Button>
                    ) : tier.id === "free" ? (
                      <Link href="/subscription" className="w-full">
                        <Button 
                          className="w-full" 
                          variant={tier.ctaVariant}
                          data-testid={`button-cta-${tier.id}`}
                        >
                          {tier.cta}
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/subscription" className="w-full">
                        <Button 
                          className="w-full" 
                          variant={tier.ctaVariant}
                          data-testid={`button-cta-${tier.id}`}
                        >
                          {tier.cta}
                        </Button>
                      </Link>
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
                  <h3 className="font-semibold mb-1">How do I become a $KILL holder?</h3>
                  <p className="text-sm text-muted-foreground">
                    Purchase 10M+ $KILL tokens and connect your wallet to automatically unlock lifetime access to all premium features.
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
                    We accept credit cards via Whop (2.7% + $0.30 fee) and SOL cryptocurrency payments.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">What's included in the free trial?</h3>
                  <p className="text-sm text-muted-foreground">
                    The 7-day free trial includes 3 token analyses per day with basic risk scoring and holder analysis. No credit card required.
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
