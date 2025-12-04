import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, TrendingDown, Shield, Users, Droplet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RugToken {
  mint: string;
  name?: string;
  symbol?: string;
  rugScore: number;
  detectedAt: number;
  rugReasons: string[];
  price?: number;
  marketCap?: number;
  holders?: number;
  liquidity?: number;
  rugType?: 'honeypot' | 'liquidity_drain' | 'mint_authority' | 'freeze_authority' | 'other';
}

export default function Rugs() {
  const [sortBy, setSortBy] = useState<'recent' | 'rugScore'>('recent');

  const { data: rugs, isLoading } = useQuery<RugToken[]>({
    queryKey: ['/api/analytics/rugs'],
  });

  const sortedRugs = rugs ? [...rugs].sort((a, b) => {
    if (sortBy === 'recent') {
      return b.detectedAt - a.detectedAt;
    }
    return b.rugScore - a.rugScore;
  }) : [];

  const getRugTypeColor = (type?: string) => {
    switch (type) {
      case 'honeypot': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'liquidity_drain': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'mint_authority': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'freeze_authority': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getRugTypeLabel = (type?: string) => {
    switch (type) {
      case 'honeypot': return 'Honeypot';
      case 'liquidity_drain': return 'Liquidity Drain';
      case 'mint_authority': return 'Mint Authority Risk';
      case 'freeze_authority': return 'Freeze Authority';
      default: return 'High Risk';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              Detected Rug Pulls
            </h1>
            <p className="text-muted-foreground mt-2">
              Tokens flagged by our detection system as potential rug pulls or scams
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              onClick={() => setSortBy('recent')}
            >
              Most Recent
            </Button>
            <Button
              variant={sortBy === 'rugScore' ? 'default' : 'outline'}
              onClick={() => setSortBy('rugScore')}
            >
              Highest Risk
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rugs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {isLoading ? <Skeleton className="h-8 w-16" /> : rugs?.length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last 24h</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : 
                  rugs?.filter(r => Date.now() - r.detectedAt < 24 * 60 * 60 * 1000).length || 0
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Honeypots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {isLoading ? <Skeleton className="h-8 w-16" /> : 
                  rugs?.filter(r => r.rugType === 'honeypot').length || 0
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Liquidity Drains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {isLoading ? <Skeleton className="h-8 w-16" /> : 
                  rugs?.filter(r => r.rugType === 'liquidity_drain').length || 0
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rug Tokens Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : sortedRugs.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Rugs Detected</h3>
              <p className="text-muted-foreground mt-2">
                Our system hasn't detected any rug pulls yet. Keep monitoring!
              </p>
            </div>
          ) : (
            sortedRugs.map((rug) => (
              <Card key={rug.mint} className="hover:shadow-lg transition-shadow border-destructive/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {rug.symbol || 'Unknown'}
                      </CardTitle>
                      <CardDescription className="truncate text-xs mt-1">
                        {rug.name || rug.mint.substring(0, 8) + '...'}
                      </CardDescription>
                    </div>
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {rug.rugScore}% Risk
                    </Badge>
                  </div>
                  <Badge className={`mt-2 ${getRugTypeColor(rug.rugType)}`} variant="outline">
                    {getRugTypeLabel(rug.rugType)}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Token Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {rug.marketCap !== undefined && (
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Market Cap</p>
                          <p className="font-semibold">${(rug.marketCap ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {rug.holders !== undefined && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Holders</p>
                          <p className="font-semibold">{(rug.holders ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {rug.liquidity !== undefined && (
                      <div className="flex items-center gap-2">
                        <Droplet className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Liquidity</p>
                          <p className="font-semibold">${(rug.liquidity ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rug Reasons */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Detected Issues:</p>
                    <div className="flex flex-wrap gap-1">
                      {rug.rugReasons.slice(0, 3).map((reason, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                      {rug.rugReasons.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{rug.rugReasons.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Detection Time */}
                  <p className="text-xs text-muted-foreground">
                    Detected {formatDistanceToNow(new Date(rug.detectedAt), { addSuffix: true })}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`https://dexscreener.com/solana/${rug.mint}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      DexScreener
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`https://solscan.io/token/${rug.mint}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Solscan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
