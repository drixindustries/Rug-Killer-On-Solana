import { useState, useEffect } from "react";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, Download, ExternalLink, Clock, Shield, Bot } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiDiscord, SiTelegram } from "react-icons/si";

export default function Access() {
  const { walletAddress, connection, connectWallet, isConnecting } = useWallet();
  const { toast } = useToast();
  const [trialStarted, setTrialStarted] = useState(false);

  // Check access status
  const { data: accessStatus, refetch: refetchAccess } = useQuery({
    queryKey: ['/api/access/status', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/access/status?walletAddress=${walletAddress}`);
      return await res.json();
    },
  });

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Wallet not connected');
      const res = await apiRequest('POST', '/api/access/start-trial', { walletAddress });
      return await res.json();
    },
    onSuccess: (data) => {
      setTrialStarted(true);
      refetchAccess();
      toast({
        title: "Trial Started!",
        description: `Your 7-day free trial has begun. Access expires on ${new Date(data.trialEndsAt).toLocaleDateString()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConnectAndStart = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    
    if (!accessStatus?.hasAccess && !trialStarted) {
      startTrialMutation.mutate();
    }
  };

  const getTrialDaysRemaining = () => {
    if (!accessStatus?.trialEndsAt) return 0;
    const end = new Date(accessStatus.trialEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold">Access Portal</h1>
            <p className="text-lg text-muted-foreground">
              Connect your wallet to start your 7-day free trial and download the bots
            </p>
          </div>

          {/* Wallet Connection Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Step 1: Connect Your Wallet
              </CardTitle>
              <CardDescription>
                Connect your Solana wallet to verify access and start your free trial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!walletAddress ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Phantom or Solflare wallet to begin. Wallet connection is required for the free trial.
                  </p>
                  <Button 
                    onClick={connectWallet} 
                    disabled={isConnecting}
                    className="w-full"
                    size="lg"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Connected Wallet</p>
                      <p className="font-mono text-sm">{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>

                  {connection?.isEligible && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Token Holder Access</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You hold 10M+ $ANTIRUG tokens. You have lifetime access!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trial Status Card */}
          {walletAddress && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Step 2: Access Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {accessStatus?.hasAccess ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Active Access</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          {accessStatus.accessType === 'trial' ? 'Free Trial' : 
                           accessStatus.accessType === 'paid_member' ? 'Paid Member' :
                           accessStatus.accessType === 'token_holder' ? 'Token Holder' : 'Active'}
                        </Badge>
                      </div>
                      {accessStatus.accessType === 'trial' && accessStatus.trialEndsAt && (
                        <p className="text-sm text-muted-foreground">
                          {getTrialDaysRemaining()} days remaining (expires {new Date(accessStatus.trialEndsAt).toLocaleDateString()})
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Start your 7-day free trial to access all features including Discord/Telegram bots and the analytics dashboard.
                    </p>
                    <Button 
                      onClick={handleConnectAndStart}
                      disabled={startTrialMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {startTrialMutation.isPending ? "Starting..." : "Start 7-Day Free Trial"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bot Download Card */}
          {walletAddress && accessStatus?.hasAccess && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Step 3: Download Bots
                </CardTitle>
                <CardDescription>
                  Add the bots to your Discord server or Telegram to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <SiDiscord className="h-6 w-6 text-[#5865F2]" />
                        <CardTitle>Discord Bot</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Add the bot to your Discord server for real-time token analysis and alerts
                      </p>
                      <Button 
                        className="w-full" 
                        onClick={() => window.open('https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Add to Discord
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.location.href = '/bot-setup'}
                      >
                        Setup Guide
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <SiTelegram className="h-6 w-6 text-[#0088cc]" />
                        <CardTitle>Telegram Bot</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Start chatting with the bot on Telegram for instant token analysis
                      </p>
                      <Button 
                        className="w-full"
                        onClick={() => window.open('https://t.me/YourBotUsername', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Telegram Bot
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.location.href = '/bot-setup'}
                      >
                        Setup Guide
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features Card */}
          {walletAddress && accessStatus?.hasAccess && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  What You Get
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Bot Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Unlimited token scans</li>
                      <li>• Advanced risk analysis</li>
                      <li>• PnL tracking & call tracking</li>
                      <li>• Smart money alerts</li>
                      <li>• Trending calls tracking</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Website Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Analytics dashboard</li>
                      <li>• Historical metrics</li>
                      <li>• Risk insights</li>
                      <li>• Personal profile with stats</li>
                      <li>• Portfolio tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
