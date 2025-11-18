import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, Zap, Users, Gift } from "lucide-react";
import { useLocation } from "wouter";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";

interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');
  const [redemptionCode, setRedemptionCode] = useState("");

  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: ['/api/subscription/status'],
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
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cancel-subscription', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will end at the end of the current billing period",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const redeemCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/redeem-code', { code });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      setRedemptionCode("");
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive",
      });
    },
  });

  if (success) {
    toast({
      title: "Success!",
      description: "Your subscription is now active",
    });
  }

  if (cancelled) {
    toast({
      title: "Cancelled",
      description: "Subscription checkout was cancelled",
      variant: "destructive",
    });
  }

  // Helper: Check if subscription is in an active state (Whop statuses)
  const isActive = (status?: string) => {
    const activeStatuses = ['valid', 'trialing', 'past_due'];
    return status && activeStatuses.includes(status);
  };
  
  const isOnFreeTrial = subscription?.tier === 'free_trial' && isActive(subscription?.status);
  const hasActivePaidSub = subscription?.tier !== 'free_trial' && isActive(subscription?.status);
  const trialDaysLeft = subscription?.trialEndsAt 
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-spinner" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="heading-subscription">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-subscription-description">
            Get real-time alerts for new Solana token launches and rug pull detection
          </p>
          
          {isOnFreeTrial && (
            <div className="mt-6">
              <Badge variant="default" className="text-base px-4 py-2" data-testid="badge-trial-status">
                Free Trial Active - {trialDaysLeft} days remaining
              </Badge>
            </div>
          )}

          {hasActivePaidSub && subscription && (
            <div className="mt-6">
              <Badge variant="default" className="text-base px-4 py-2" data-testid="badge-active-subscription">
                {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan Active
              </Badge>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="border-2" data-testid="card-plan-basic">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Basic</CardTitle>
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold" data-testid="text-price-basic">$20</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription>Perfect for individual traders and investors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Real-time token analysis</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Rug pull risk detection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Discord DM alerts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Telegram DM alerts</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Group/Channel alerts</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => createSubscriptionMutation.mutate('individual')}
                disabled={createSubscriptionMutation.isPending || (subscription?.tier === 'individual' && isActive(subscription?.status) || false)}
                data-testid="button-subscribe-basic"
              >
                {createSubscriptionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.tier === 'individual' && isActive(subscription?.status) ? (
                  'Current Plan'
                ) : (
                  'Subscribe to Basic'
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-2 border-primary relative" data-testid="card-plan-premium">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="default" className="px-4 py-1">Popular</Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold" data-testid="text-price-premium">$100</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription>For teams and serious crypto traders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Real-time token analysis</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Rug pull risk detection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Discord DM alerts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Telegram DM alerts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-semibold">Discord group/channel alerts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-semibold">Telegram group/channel alerts</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => createSubscriptionMutation.mutate('group')}
                disabled={createSubscriptionMutation.isPending || (subscription?.tier === 'group' && isActive(subscription?.status) || false)}
                data-testid="button-subscribe-premium"
              >
                {createSubscriptionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.tier === 'group' && isActive(subscription?.status) ? (
                  'Current Plan'
                ) : (
                  'Subscribe to Premium'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {hasActivePaidSub && subscription && (
          <div className="mt-12 max-w-2xl mx-auto">
            <Card data-testid="card-manage-subscription">
              <CardHeader>
                <CardTitle>Manage Subscription</CardTitle>
                <CardDescription>
                  Your subscription renews on {subscription.currentPeriodEnd 
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  disabled={cancelSubscriptionMutation.isPending}
                  data-testid="button-cancel-subscription"
                >
                  {cancelSubscriptionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Subscription Code Redemption */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Card data-testid="card-redeem-code">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <CardTitle>Redeem Subscription Code</CardTitle>
              </div>
              <CardDescription>
                Have a lifetime access code? Enter it here to activate your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter code"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  disabled={redeemCodeMutation.isPending}
                  className="font-mono"
                  data-testid="input-redeem-code"
                />
                <Button
                  onClick={() => redemptionCode && redeemCodeMutation.mutate(redemptionCode)}
                  disabled={!redemptionCode || redeemCodeMutation.isPending}
                  data-testid="button-redeem-code"
                >
                  {redeemCodeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    'Redeem'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
