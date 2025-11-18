import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, 
  TrendingUp, Users, Coins, Droplet, Lock, Unlock,
  Clock, Flame, Network, Wallet, PackageX, Eye,
  ArrowRight, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import type { TokenAnalysisResponse } from "@shared/schema";

interface CascadingAnalysisBarsProps {
  analysis: TokenAnalysisResponse;
}

interface BarData {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: "safe" | "warning" | "danger" | "info";
  mainValue: string;
  subValues?: { label: string; value: string }[];
  details?: string[];
  link?: string;
  expandable?: boolean;
}

export function CascadingAnalysisBars({ analysis }: CascadingAnalysisBarsProps) {
  const [expandedBars, setExpandedBars] = useState<Set<string>>(new Set());

  const toggleBar = (id: string) => {
    const newExpanded = new Set(expandedBars);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedBars(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe": return "border-l-green-500 bg-green-50/50 hover:bg-green-50";
      case "warning": return "border-l-yellow-500 bg-yellow-50/50 hover:bg-yellow-50";
      case "danger": return "border-l-red-500 bg-red-50/50 hover:bg-red-50";
      default: return "border-l-blue-500 bg-blue-50/50 hover:bg-blue-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe": return "✓";
      case "warning": return "⚠";
      case "danger": return "✕";
      default: return "ⓘ";
    }
  };

  // Build bars data from analysis
  const bars: BarData[] = [];

  // Risk Score Bar
  bars.push({
    id: "risk-score",
    title: "Overall Risk Score",
    icon: analysis.riskLevel === "LOW" ? <ShieldCheck className="h-5 w-5" /> : 
          analysis.riskLevel === "MODERATE" ? <ShieldAlert className="h-5 w-5" /> :
          <ShieldX className="h-5 w-5" />,
    status: analysis.riskLevel === "LOW" ? "safe" : 
            analysis.riskLevel === "MODERATE" ? "warning" : "danger",
    mainValue: `${analysis.riskScore}/100`,
    subValues: [
      { label: "Level", value: analysis.riskLevel },
      { label: "Flags", value: `${analysis.redFlags?.length || 0} Critical` }
    ],
    expandable: (analysis.redFlags?.length || 0) > 0,
    details: analysis.redFlags
  });

  // Mint Authority
  bars.push({
    id: "mint-authority",
    title: "Mint Authority",
    icon: analysis.mintAuthority.hasAuthority ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />,
    status: analysis.mintAuthority.hasAuthority ? "danger" : "safe",
    mainValue: analysis.mintAuthority.hasAuthority ? "ENABLED" : "REVOKED",
    subValues: analysis.mintAuthority.hasAuthority ? [
      { label: "Warning", value: "Can mint unlimited tokens" }
    ] : [
      { label: "Status", value: "Supply is fixed" }
    ]
  });

  // Freeze Authority
  bars.push({
    id: "freeze-authority",
    title: "Freeze Authority",
    icon: analysis.freezeAuthority.hasAuthority ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />,
    status: analysis.freezeAuthority.hasAuthority ? "danger" : "safe",
    mainValue: analysis.freezeAuthority.hasAuthority ? "ENABLED" : "REVOKED",
    subValues: analysis.freezeAuthority.hasAuthority ? [
      { label: "Warning", value: "Can freeze wallets" }
    ] : [
      { label: "Status", value: "Cannot freeze" }
    ]
  });

  // Liquidity
  if (analysis.liquidityPool) {
    const burnPercent = analysis.liquidityPool.burnPercentage || 0;
    bars.push({
      id: "liquidity",
      title: "Liquidity Pool",
      icon: <Droplet className="h-5 w-5" />,
      status: burnPercent >= 90 ? "safe" : burnPercent >= 50 ? "warning" : "danger",
      mainValue: `${burnPercent.toFixed(1)}% Burned`,
      subValues: [
        { label: "Status", value: analysis.liquidityPool.isBurned ? "Locked" : "Unlocked" },
        { label: "Reserve", value: `$${(analysis.liquidityPool.lpReserve || 0).toLocaleString()}` }
      ]
    });
  }

  // Holder Distribution
  if (analysis.topHolders && analysis.topHolders.length > 0) {
    const top10Percent = analysis.topHolders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    bars.push({
      id: "holders",
      title: "Holder Distribution",
      icon: <Users className="h-5 w-5" />,
      status: top10Percent > 80 ? "danger" : top10Percent > 50 ? "warning" : "safe",
      mainValue: `${analysis.holderCount || 0} Holders`,
      subValues: [
        { label: "Top 10", value: `${top10Percent.toFixed(1)}% supply` },
        { label: "Largest", value: `${analysis.topHolders[0]?.percentage.toFixed(1)}%` }
      ]
    });
  }

  // Honeypot Detection
  if (analysis.quillcheckData) {
    const hp = analysis.quillcheckData;
    bars.push({
      id: "honeypot",
      title: "Honeypot Check",
      icon: <Eye className="h-5 w-5" />,
      status: hp.isHoneypot ? "danger" : "safe",
      mainValue: hp.isHoneypot ? "HONEYPOT DETECTED" : "SAFE",
      subValues: [
        { label: "Buy Tax", value: `${hp.buyTax}%` },
        { label: "Sell Tax", value: `${hp.sellTax}%` }
      ],
      expandable: hp.isHoneypot,
      details: hp.isHoneypot ? [hp.reason] : undefined
    });
  }

  // Bundle Detection
  if (analysis.advancedBundleData && analysis.advancedBundleData.bundleScore > 30) {
    const bd = analysis.advancedBundleData;
    bars.push({
      id: "bundle",
      title: "Jito Bundle Detection",
      icon: <PackageX className="h-5 w-5" />,
      status: bd.bundleScore > 70 ? "danger" : "warning",
      mainValue: `${bd.bundleScore}/100 Risk`,
      subValues: [
        { label: "Bundled Supply", value: `${bd.bundledSupplyPercent.toFixed(1)}%` },
        { label: "Suspicious Wallets", value: `${bd.suspiciousWallets}` }
      ],
      expandable: true,
      details: [`Coordinated atomic transactions detected within 400ms window`]
    });
  }

  // Aged Wallet Detection
  if (analysis.agedWalletData) {
    const aw = analysis.agedWalletData;
    const safetyScore = 100 - aw.riskScore;
    bars.push({
      id: "aged-wallets",
      title: "Aged Wallet Analysis",
      icon: <Clock className="h-5 w-5" />,
      status: safetyScore >= 80 ? "safe" : safetyScore >= 50 ? "warning" : "danger",
      mainValue: `${safetyScore}/100 Safety`,
      subValues: [
        { label: "Suspicious", value: `${aw.suspiciousWallets.length} wallets` },
        { label: "Fake Volume", value: `${aw.totalFakeVolumePercent.toFixed(1)}%` }
      ],
      expandable: aw.suspiciousWallets.length > 0,
      details: aw.suspiciousWallets.length > 0 ? 
        [`${aw.suspiciousWallets.length} aged wallets detected with coordinated behavior`] : undefined,
      link: `/?analyze=${analysis.tokenAddress}#aged-wallets`
    });
  }

  // Whale Detection
  if (analysis.whaleDetection && analysis.whaleDetection.whaleWallets.length > 0) {
    const wd = analysis.whaleDetection;
    bars.push({
      id: "whales",
      title: "Whale Activity",
      icon: <TrendingUp className="h-5 w-5" />,
      status: wd.riskScore > 70 ? "danger" : wd.riskScore > 40 ? "warning" : "info",
      mainValue: `${wd.whaleWallets.length} Whales`,
      subValues: [
        { label: "Risk Score", value: `${wd.riskScore}/100` },
        { label: "Total Holding", value: `${wd.totalWhalePercentage.toFixed(1)}%` }
      ]
    });
  }

  // Network Analysis
  if (analysis.networkAnalysis) {
    const na = analysis.networkAnalysis;
    bars.push({
      id: "network",
      title: "Network Analysis",
      icon: <Network className="h-5 w-5" />,
      status: na.suspiciousPatterns.length > 0 ? "warning" : "safe",
      mainValue: `${na.clusters.length} Clusters`,
      subValues: [
        { label: "Patterns", value: `${na.suspiciousPatterns.length} suspicious` },
        { label: "Connected", value: `${na.totalConnections} links` }
      ]
    });
  }

  // Funding Analysis
  if (analysis.fundingAnalysis) {
    const fa = analysis.fundingAnalysis;
    const suspiciousFunding = fa.centralizedExchangeFunding > 0 || fa.newWalletCount > 10;
    bars.push({
      id: "funding",
      title: "Funding Sources",
      icon: <Wallet className="h-5 w-5" />,
      status: suspiciousFunding ? "warning" : "info",
      mainValue: `${fa.patterns.length} Patterns`,
      subValues: [
        { label: "CEX Funding", value: `${fa.centralizedExchangeFunding.toFixed(1)}%` },
        { label: "New Wallets", value: `${fa.newWalletCount}` }
      ]
    });
  }

  return (
    <div className="space-y-2">
      {/* Animated staggered entrance */}
      {bars.map((bar, index) => (
        <div
          key={bar.id}
          className="animate-in slide-in-from-left duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Card 
            className={`border-l-4 transition-all duration-200 cursor-pointer ${getStatusColor(bar.status)}`}
            onClick={() => bar.expandable && toggleBar(bar.id)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                {/* Left: Icon + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    bar.status === "safe" ? "bg-green-100 text-green-600" :
                    bar.status === "warning" ? "bg-yellow-100 text-yellow-600" :
                    bar.status === "danger" ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  }`}>
                    {bar.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{bar.title}</h3>
                      <span className="text-lg">{getStatusIcon(bar.status)}</span>
                    </div>
                    {bar.subValues && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {bar.subValues.map((sv, i) => (
                          <span key={i}>
                            <span className="font-medium">{sv.label}:</span> {sv.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Main Value + Expand */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className={`text-sm font-bold ${
                      bar.status === "safe" ? "border-green-500 text-green-700" :
                      bar.status === "warning" ? "border-yellow-500 text-yellow-700" :
                      bar.status === "danger" ? "border-red-500 text-red-700" :
                      "border-blue-500 text-blue-700"
                    }`}
                  >
                    {bar.mainValue}
                  </Badge>
                  {bar.expandable && (
                    expandedBars.has(bar.id) ? 
                      <ChevronUp className="h-4 w-4 text-muted-foreground" /> :
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  {bar.link && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = bar.link!;
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expandable Details */}
              {bar.expandable && expandedBars.has(bar.id) && bar.details && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {bar.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
