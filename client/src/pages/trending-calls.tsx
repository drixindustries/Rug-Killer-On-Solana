import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, MessageCircle, Hash, ExternalLink, Copy, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface TrendingCall {
  id: string;
  symbol?: string;
  contractAddress: string;
  platform: "discord" | "telegram";
  channelName: string;
  mentions: number;
  uniqueUsers: number;
  firstSeen: number;
  lastSeen: number;
  sentiment: "bullish" | "neutral" | "bearish";
  riskScore?: number;
}

export default function TrendingCalls() {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [platform, setPlatform] = useState<"all" | "discord" | "telegram">("all");

  const { data: trendingCalls, isLoading } = useQuery<TrendingCall[]>({
    queryKey: ["/api/trending-calls", timeframe, platform],
    staleTime: 2 * 60 * 1000, // 2 minutes - trending data doesn't need to be instant
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes (reduced from 30s)
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "bearish": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  const getRiskColor = (score?: number) => {
    if (!score) return "bg-gray-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Trending Calls</h1>
            </div>
            <p className="text-muted-foreground">
              Real-time aggregation of cashtags and contract addresses mentioned across Discord & Telegram channels.
              Rally's tracking what the community is talking about 👀
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Timeframe:</span>
                  <div className="flex gap-2">
                    {(["1h", "6h", "24h", "7d"] as const).map((t) => (
                      <Button
                        key={t}
                        variant={timeframe === t ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeframe(t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Platform:</span>
                  <div className="flex gap-2">
                    {(["all", "discord", "telegram"] as const).map((p) => (
                      <Button
                        key={p}
                        variant={platform === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlatform(p)}
                        className="capitalize"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trending Calls List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !trendingCalls || trendingCalls.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Trending Calls</h3>
                <p className="text-muted-foreground">
                  No calls detected in the selected timeframe. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {trendingCalls.map((call, index) => (
                <Card key={call.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Rank & Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Rank */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? "bg-yellow-500 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                            index === 2 ? "bg-orange-600 text-white" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            #{index + 1}
                          </div>
                        </div>

                        {/* Token Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {call.symbol && (
                              <h3 className="text-xl font-bold">${call.symbol}</h3>
                            )}
                            <Badge variant="outline" className={getSentimentColor(call.sentiment)}>
                              {call.sentiment}
                            </Badge>
                            <Badge variant="outline">
                              {call.platform === "discord" ? "💬 Discord" : "✈️ Telegram"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {call.contractAddress.slice(0, 8)}...{call.contractAddress.slice(-6)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(call.contractAddress, "Contract address")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Stats */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{call.mentions}</span>
                              <span className="text-muted-foreground">mentions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{call.uniqueUsers}</span>
                              <span className="text-muted-foreground">users</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                First seen {formatDistanceToNow(call.firstSeen, { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            Channel: {call.channelName}
                          </div>
                        </div>
                      </div>

                      {/* Right: Risk Score & Actions */}
                      <div className="flex flex-col items-end gap-3">
                        {call.riskScore !== undefined && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${getRiskColor(call.riskScore)}`}>
                              {call.riskScore}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2 w-full">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => window.location.href = `/?analyze=${call.contractAddress}`}
                            className="w-full"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Analyze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://dexscreener.com/solana/${call.contractAddress}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            DexScreener
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>About Trending Calls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Rally tracks mentions of cashtags ($SYMBOL) and contract addresses across Discord and Telegram channels 
                to show you what tokens are getting the most attention from the community.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">How it works:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Monitors public channels and alpha alert channels</li>
                    <li>Tracks unique mentions and user engagement</li>
                    <li>Analyzes sentiment (bullish, neutral, bearish)</li>
                    <li>Auto-scans tokens for risk assessment</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Remember:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>High mentions ≠ safe investment</li>
                    <li>Always check Rally's risk score</li>
                    <li>DYOR before aping</li>
                    <li>NFA - Rally's just showing you the trends 💕</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
