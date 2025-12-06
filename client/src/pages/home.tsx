import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { TokenInput } from "@/components/token-input";
import { RiskScoreCard } from "@/components/risk-score-card";
import { CriticalAlerts } from "@/components/critical-alerts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield, TrendingUp, Users, Zap, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { TokenAnalysisResponse } from "@shared/schema";
import { MascotSpotlight } from "@/components/mascot-spotlight";
import MetricsGrid from "@/components/metrics-grid";
import TopHoldersTable from "@/components/top-holders-table";
import TokenMetadataCard from "@/components/token-metadata-card";
import RugcheckCard from "@/components/rugcheck-card";
import GoPlusCard from "@/components/goplus-card";
import MarketDataCard from "@/components/market-data-card";
import LiquidityBurnCard from "@/components/liquidity-burn-card";
import HoneypotCard from "@/components/honeypot-card";
import BundleDetectionCard from "@/components/bundle-detection-card";
import NetworkAnalysisCard from "@/components/network-analysis-card";
import WhaleDetectionCard from "@/components/whale-detection-card";
import AgedWalletDetectionCard from "@/components/aged-wallet-detection-card";
import FundingAnalysisCard from "@/components/funding-analysis-card";
import TGNAnalysisCard from "@/components/tgn-analysis-card";
import MLAnalysisCard from "@/components/ml-analysis-card";
// SolRPDS Enhanced Detection Components
import RugScoreBreakdownCard from "@/components/rug-score-breakdown-card";
import JitoBundleCard from "@/components/jito-bundle-card";
import { SocialSentimentCard } from "@/components/social-sentiment-card";

export default function Home() {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<TokenAnalysisResponse | null>(null);
  const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);

  const scrollToAnalyzer = () => {
    const analyzerElement = document.getElementById("token-analyzer");
    if (analyzerElement) {
      analyzerElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const mutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await apiRequest("POST", "/api/analyze", { tokenAddress: address });
      return await response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: "Token analysis finished successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze token",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = (address: string) => {
    mutation.mutate(address);
  };

  // Auto-analyze if token query param is present (from Analytics page "Analyze" buttons)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl && !hasAutoAnalyzed && tokenFromUrl.length >= 32 && tokenFromUrl.length <= 44) {
      setHasAutoAnalyzed(true);
      mutation.mutate(tokenFromUrl);
    }
  }, [hasAutoAnalyzed]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-500";
    if (score >= 60) return "text-orange-500";
    if (score >= 40) return "text-yellow-500";
    return "text-green-500";
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return <Badge variant="destructive">EXTREME RISK</Badge>;
    if (score >= 60) return <Badge variant="destructive" className="bg-orange-500">HIGH RISK</Badge>;
    if (score >= 40) return <Badge variant="outline" className="border-yellow-500 text-yellow-500">MODERATE RISK</Badge>;
    return <Badge variant="outline" className="border-green-500 text-green-500">LOW RISK</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <MascotSpotlight onScrollToAnalyzer={scrollToAnalyzer} />
          <h1 className="text-5xl font-bold text-white mb-4">
            Rug Killer Alpha Bot
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Advanced Solana token analysis powered by AI and machine learning
          </p>
          
          {/* Token Input */}
          <div id="token-analyzer" className="max-w-2xl mx-auto">
            <TokenInput 
              onAnalyze={handleAnalyze}
              isAnalyzing={mutation.isPending}
            />
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Risk Score Card */}
            <RiskScoreCard 
              score={analysis.riskScore} 
              riskLevel={analysis.riskLevel} 
              redFlagsCount={analysis.redFlags?.length || 0}
              analyzedAt={analysis.analyzedAt}
            />

            {/* Critical Alerts */}
            {analysis.redFlags && analysis.redFlags.length > 0 && (
              <CriticalAlerts alerts={analysis.redFlags} />
            )}

            {/* SolRPDS Rug Score Breakdown - Primary Risk Metric */}
            {analysis.rugScoreBreakdown && (
              <RugScoreBreakdownCard data={analysis.rugScoreBreakdown} />
            )}

            {/* Metrics Grid */}
            <MetricsGrid analysis={analysis} />

            {/* AI/ML Analysis Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.tgnResult && (
                <TGNAnalysisCard data={analysis.tgnResult} />
              )}
              {(analysis as any).mlScore && (
                <MLAnalysisCard data={(analysis as any).mlScore} />
              )}
            </div>

            {/* Advanced Detection Cards - SolRPDS Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Social Sentiment (FinBERT-Solana from X/Telegram/Discord) */}
              <SocialSentimentCard sentiment={analysis.socialSentiment} />
              {/* Jito MEV Bundle Detection */}
              {analysis.jitoBundleData && (
                <JitoBundleCard data={analysis.jitoBundleData} />
              )}
              {/* Advanced Bundle Detection (timing-based) */}
              {analysis.advancedBundleData && (
                <BundleDetectionCard data={analysis.advancedBundleData} />
              )}
              {/* Network/Wallet Cluster Analysis */}
              {analysis.networkAnalysis && (
                <NetworkAnalysisCard data={analysis.networkAnalysis} />
              )}
              {/* Whale Activity Detection */}
              {analysis.whaleDetection && (
                <WhaleDetectionCard data={analysis.whaleDetection} />
              )}
              {/* Aged Wallet Detection (SolRPDS critical metric) */}
              {analysis.agedWalletData && (
                <AgedWalletDetectionCard data={analysis.agedWalletData} />
              )}
            </div>

            {/* Funding Analysis */}
            {analysis.fundingAnalysis && (
              <FundingAnalysisCard fundingData={analysis.fundingAnalysis} />
            )}

            {/* Token Metadata & Market Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.metadata && (
                <TokenMetadataCard 
                  metadata={analysis.metadata} 
                  tokenAddress={analysis.tokenAddress || ""} 
                  creationDate={analysis.creationDate}
                />
              )}
              {analysis.dexscreenerData && (
                <MarketDataCard 
                  data={analysis.dexscreenerData} 
                  tokenAddress={analysis.tokenAddress || ""}
                />
              )}
            </div>

            {/* Security Checks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.honeypotDetection && (
                <HoneypotCard data={analysis.honeypotDetection} />
              )}
              {analysis.liquidityPool && (
                <LiquidityBurnCard data={analysis.liquidityPool} />
              )}
            </div>

            {/* External Security Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysis.rugcheckData && (
                <RugcheckCard data={analysis.rugcheckData} tokenAddress={analysis.tokenAddress || ""} />
              )}
              {analysis.goplusData && (
                <GoPlusCard data={analysis.goplusData} />
              )}
            </div>

            {/* Top Holders */}
            {analysis.topHolders && analysis.topHolders.length > 0 && (
              <TopHoldersTable 
                holders={analysis.topHolders}
                tokenMint={analysis.tokenInfo?.address || analysis.tokenAddress || ""}
                totalHolders={typeof analysis.holderCount === 'number' ? analysis.holderCount : undefined}
              />
            )}
          </div>
        )}

        {/* No Analysis State */}
        {!analysis && !mutation.isPending && (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              Ready to Analyze
            </h3>
            <p className="text-gray-500">
              Enter a Solana token address above to start the analysis
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
