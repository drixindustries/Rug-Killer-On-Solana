import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, ExternalLink, Users, Coins, TrendingUp, Calendar, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RiskLevel, TokenAnalysisResponse } from "@shared/schema";

interface CondensedTokenHeaderProps {
  analysis: TokenAnalysisResponse;
}

export function CondensedTokenHeader({ analysis }: CondensedTokenHeaderProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getRiskColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case "LOW": return "text-green-600 border-green-200 bg-green-50";
      case "MODERATE": return "text-yellow-600 border-yellow-200 bg-yellow-50";
      case "HIGH": return "text-orange-600 border-orange-200 bg-orange-50";
      case "EXTREME": return "text-red-600 border-red-200 bg-red-50";
      default: return "text-gray-600 border-gray-200 bg-gray-50";
    }
  };

  const getRiskIcon = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case "LOW": return <ShieldCheck className="h-5 w-5" />;
      case "MODERATE": return <ShieldAlert className="h-5 w-5" />;
      case "HIGH": return <AlertTriangle className="h-5 w-5" />;
      case "EXTREME": return <ShieldX className="h-5 w-5" />;
      default: return <ShieldAlert className="h-5 w-5" />;
    }
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    const actualValue = num / Math.pow(10, decimals);
    if (actualValue >= 1e9) return `${(actualValue / 1e9).toFixed(2)}B`;
    if (actualValue >= 1e6) return `${(actualValue / 1e6).toFixed(2)}M`;
    if (actualValue >= 1e3) return `${(actualValue / 1e3).toFixed(2)}K`;
    return actualValue.toLocaleString();
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}m ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const tokenSymbol = analysis.metadata?.symbol || "TOKEN";
  const tokenName = analysis.metadata?.name || "Unknown Token";

  return (
    <Card className="p-6">
      {/* Token Header Row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {tokenSymbol.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tokenName}</h1>
              <p className="text-muted-foreground">${tokenSymbol}</p>
            </div>
          </div>
        </div>
        
        {/* Risk Score Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getRiskColor(analysis.riskLevel)}`}>
          {getRiskIcon(analysis.riskLevel)}
          <div className="text-center">
            <div className="text-2xl font-bold">{analysis.riskScore}</div>
            <div className="text-xs font-medium">{analysis.riskLevel} RISK</div>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">HOLDERS</span>
          </div>
          <div className="text-lg font-semibold">{analysis.holderCount.toLocaleString()}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Coins className="h-4 w-4" />
            <span className="text-xs font-medium">SUPPLY</span>
          </div>
          <div className="text-lg font-semibold">
            {formatNumber(analysis.metadata?.supply || 0, analysis.metadata?.decimals || 0)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">TOP 10</span>
          </div>
          <div className="text-lg font-semibold">{analysis.topHolderConcentration.toFixed(1)}%</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">RED FLAGS</span>
          </div>
          <div className="text-lg font-semibold text-red-500">{analysis.redFlags?.length || 0}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Droplet className="h-4 w-4" />
            <span className="text-xs font-medium">LIQUIDITY</span>
          </div>
          <div className="text-lg font-semibold">{analysis.liquidityPool?.status || "UNKNOWN"}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">CREATED</span>
          </div>
          <div className="text-lg font-semibold">
            {analysis.creationDate ? getTimeAgo(analysis.creationDate) : "Unknown"}
          </div>
        </div>
      </div>

      {/* Authority Status Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Mint Authority:</span>
          <Badge variant={analysis.mintAuthority.hasAuthority ? "destructive" : "secondary"}>
            {analysis.mintAuthority.hasAuthority ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Freeze Authority:</span>
          <Badge variant={analysis.freezeAuthority.hasAuthority ? "destructive" : "secondary"}>
            {analysis.freezeAuthority.hasAuthority ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        
        {analysis.liquidityPool?.isBurned && (
          <Badge variant="secondary" className="text-green-600 bg-green-50 border-green-200">
            LP Burned
          </Badge>
        )}
      </div>

      {/* Quick Access Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <span className="font-medium">Token Contract</span>
            <div className="text-xs text-muted-foreground font-mono">
              {analysis.tokenAddress.slice(0, 8)}...{analysis.tokenAddress.slice(-8)}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(analysis.tokenAddress, "Token address")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
            >
              <a 
                href={`https://solscan.io/token/${analysis.tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
        
        {analysis.liquidityPool?.lpAddresses && analysis.liquidityPool.lpAddresses.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <span className="font-medium">Liquidity Pool</span>
              <div className="text-xs text-muted-foreground font-mono">
                {analysis.liquidityPool.lpAddresses[0].slice(0, 8)}...{analysis.liquidityPool.lpAddresses[0].slice(-8)}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(analysis.liquidityPool?.lpAddresses?.[0] || "", "LP address")}
                disabled={!analysis.liquidityPool?.lpAddresses?.[0]}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
                disabled={!analysis.liquidityPool?.lpAddresses?.[0]}
              >
                <a 
                  href={`https://solscan.io/account/${analysis.liquidityPool?.lpAddresses?.[0] || ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}