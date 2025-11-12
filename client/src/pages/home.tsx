import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { TokenInput } from "@/components/token-input";
import { RiskScoreCard } from "@/components/risk-score-card";
import { CriticalAlerts } from "@/components/critical-alerts";
import { MetricsGrid } from "@/components/metrics-grid";
import { TopHoldersTable } from "@/components/top-holders-table";
import { HolderDistributionChart } from "@/components/holder-distribution-chart";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { TokenMetadataCard } from "@/components/token-metadata-card";
import { RugcheckCard } from "@/components/rugcheck-card";
import { GoPlusCard } from "@/components/goplus-card";
import { MarketDataCard } from "@/components/market-data-card";
import { BubbleMapsCard } from "@/components/bubblemaps-card";
import { TokenInfoSidebar } from "@/components/token-info-sidebar";
import { LiquidityBurnCard } from "@/components/liquidity-burn-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TokenAnalysisResponse } from "@shared/schema";
import { CONTRACT_ADDRESS } from "@/constants";

export default function Home() {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<TokenAnalysisResponse | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Contract address copied to clipboard",
    });
  };

  const analyzeMutation = useMutation({
    mutationFn: async (tokenAddress: string) => {
      const response = await apiRequest("POST", "/api/analyze-token", { tokenAddress });
      return await response.json() as TokenAnalysisResponse;
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
  });

  const handleAnalyze = (address: string) => {
    analyzeMutation.mutate(address);
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    analyzeMutation.reset();
  };

  const isLoading = analyzeMutation.isPending;
  const error = analyzeMutation.error;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onNewAnalysis={analysis ? handleNewAnalysis : undefined} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-8">
            {!analysis && (
              <div className="text-center space-y-6 py-12">
                <h1 className="text-4xl font-bold">Solana Rug Detector</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Analyze Solana tokens for rug pull risks. Check mint authority, freeze authority, 
                  holder distribution, liquidity, and suspicious activity instantly.
                </p>
                
                {/* Official Contract Address */}
                <div className="flex flex-col items-center gap-3 pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-semibold text-muted-foreground">Official Contract Address</span>
                  </div>
                  <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-md">
                    <code className="font-mono text-sm select-all" data-testid="text-contract-address">
                      {CONTRACT_ADDRESS}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                      aria-label="Copy contract address"
                      data-testid="button-copy-contract"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <TokenInput onAnalyze={handleAnalyze} isAnalyzing={isLoading} />

            {/* Contract Address Card - Always visible */}
            {!analysis && (
              <Card data-testid="card-contract-address">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Official Contract Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md">
                    <code className="font-mono text-sm flex-1 select-all" data-testid="text-contract-card">
                      {CONTRACT_ADDRESS}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                      aria-label="Copy contract address"
                      data-testid="button-copy-contract-card"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BubbleMaps - Positioned directly below token input for better visibility */}
            {analysis && (
              <BubbleMapsCard tokenAddress={analysis.tokenAddress} />
            )}

            {isLoading && (
              <div className="space-y-6">
                <Card className="p-8">
                  <div className="flex flex-col items-center space-y-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-16 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-96" />
                  </div>
                  <div className="space-y-6">
                    <Skeleton className="h-64" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Card className="p-6 border-destructive">
                <p className="text-destructive font-semibold">Analysis Failed</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error instanceof Error ? error.message : "Failed to analyze token. Please try again."}
                </p>
              </Card>
            )}

            {analysis && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <RiskScoreCard
                      score={analysis.riskScore}
                      riskLevel={analysis.riskLevel}
                      redFlagsCount={analysis.redFlags?.length || 0}
                      analyzedAt={analysis.analyzedAt}
                    />
                    
                    <CriticalAlerts redFlags={analysis.redFlags || []} />

                    {/* LP Burn Checker - Only show if we have burn data */}
                    {analysis.liquidityPool?.burnPercentage !== undefined && (
                      <LiquidityBurnCard
                        burnPercentage={analysis.liquidityPool.burnPercentage}
                        lpMintAddress={analysis.liquidityPool.lpMintAddress}
                        lpReserve={analysis.liquidityPool.lpReserve}
                        actualSupply={analysis.liquidityPool.actualSupply}
                        isBurned={analysis.liquidityPool.isBurned ?? false}
                      />
                    )}
                    
                    <MetricsGrid
                      totalSupply={analysis.metadata?.supply || 0}
                      holderCount={analysis.holderCount || 0}
                      topHolderConcentration={analysis.topHolderConcentration || 0}
                      liquidityStatus={analysis.liquidityPool?.status || "UNKNOWN"}
                      creationDate={analysis.creationDate}
                      decimals={analysis.metadata?.decimals || 0}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    {/* Token Info Sidebar with copy-able addresses */}
                    <TokenInfoSidebar
                      tokenAddress={analysis.tokenAddress}
                      mintAuthority={analysis.mintAuthority.hasAuthority ? analysis.mintAuthority.authorityAddress : null}
                      freezeAuthority={analysis.freezeAuthority.hasAuthority ? analysis.freezeAuthority.authorityAddress : null}
                      lpAddresses={analysis.liquidityPool?.lpAddresses || []}
                    />

                    <TokenMetadataCard 
                      metadata={analysis.metadata}
                      tokenAddress={analysis.tokenAddress}
                    />
                    
                    {analysis.rugcheckData && (
                      <RugcheckCard 
                        data={analysis.rugcheckData}
                        tokenAddress={analysis.tokenAddress}
                      />
                    )}
                    
                    {analysis.goplusData && (
                      <GoPlusCard 
                        data={analysis.goplusData}
                        tokenAddress={analysis.tokenAddress}
                      />
                    )}
                    
                    {analysis.dexscreenerData && (
                      <MarketDataCard 
                        data={analysis.dexscreenerData}
                        tokenAddress={analysis.tokenAddress}
                      />
                    )}
                    
                    <TransactionTimeline transactions={analysis.recentTransactions || []} />
                  </div>
                </div>

                {analysis.topHolders && analysis.topHolders.length > 0 && (
                  <>
                    <TopHoldersTable 
                      holders={analysis.topHolders}
                      decimals={analysis.metadata?.decimals || 0}
                    />

                    <HolderDistributionChart
                      holders={analysis.topHolders}
                      totalConcentration={analysis.topHolderConcentration || 0}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
