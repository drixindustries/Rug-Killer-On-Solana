import { useState } from "react";
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

export default function Home() {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<TokenAnalysisResponse | null>(null);

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
            {/* Risk Score Header */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">
                      {analysis.tokenInfo?.symbol || "Token"} Analysis
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {analysis.tokenInfo?.name || "Unknown Token"}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${getRiskColor(analysis.riskScore)}`}>
                      {analysis.riskScore}%
                    </div>
                    {getRiskBadge(analysis.riskScore)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <Shield className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <div className="text-sm text-gray-400">Safety Score</div>
                    <div className="text-xl font-bold text-white">
                      {analysis.safetyScore ? `${analysis.safetyScore}%` : "N/A"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <div className="text-sm text-gray-400">Liquidity</div>
                    <div className="text-xl font-bold text-white">
                      ${analysis.dexscreener?.liquidity?.usd?.toLocaleString() || "0"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <div className="text-sm text-gray-400">Holders</div>
                    <div className="text-xl font-bold text-white">
                      {analysis.holderCount || 0}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                    <div className="text-sm text-gray-400">Market Cap</div>
                    <div className="text-xl font-bold text-white">
                      ${analysis.dexscreener?.marketCap?.toLocaleString() || "0"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Alerts */}
            {analysis.alerts && analysis.alerts.length > 0 && (
              <CriticalAlerts alerts={analysis.alerts} />
            )}

            {/* Risk Factors */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Risk Analysis</CardTitle>
                <CardDescription className="text-gray-400">
                  Detailed breakdown of risk factors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Holder Concentration */}
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {analysis.topHolderConcentration && analysis.topHolderConcentration > 50 ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <div className="text-white font-medium">Holder Concentration</div>
                        <div className="text-sm text-gray-400">
                          Top holders control {analysis.topHolderConcentration?.toFixed(1)}% of supply
                        </div>
                      </div>
                    </div>
                    <Badge variant={analysis.topHolderConcentration && analysis.topHolderConcentration > 50 ? "destructive" : "outline"}>
                      {analysis.topHolderConcentration?.toFixed(1)}%
                    </Badge>
                  </div>

                  {/* Liquidity Check */}
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {analysis.dexscreener?.liquidity?.usd && analysis.dexscreener.liquidity.usd > 5000 ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <div>
                        <div className="text-white font-medium">Liquidity Status</div>
                        <div className="text-sm text-gray-400">
                          {analysis.dexscreener?.liquidity?.usd 
                            ? `$${analysis.dexscreener.liquidity.usd.toLocaleString()} liquidity available`
                            : "No liquidity data available"}
                        </div>
                      </div>
                    </div>
                    <Badge variant={analysis.dexscreener?.liquidity?.usd && analysis.dexscreener.liquidity.usd > 5000 ? "outline" : "destructive"}>
                      {analysis.dexscreener?.liquidity?.usd ? "Adequate" : "Low"}
                    </Badge>
                  </div>

                  {/* Bundle Detection */}
                  {analysis.bundleDetection && (
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {analysis.bundleDetection.detected ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <div className="text-white font-medium">Bundle Detection</div>
                          <div className="text-sm text-gray-400">
                            {analysis.bundleDetection.detected 
                              ? `${analysis.bundleDetection.suspiciousWallets} suspicious wallets detected`
                              : "No suspicious bundle activity detected"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={analysis.bundleDetection.detected ? "destructive" : "outline"}>
                        {analysis.bundleDetection.detected ? "DETECTED" : "CLEAN"}
                      </Badge>
                    </div>
                  )}

                  {/* Honeypot Check */}
                  {analysis.honeypotData && (
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {analysis.honeypotData.isHoneypot ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <div className="text-white font-medium">Honeypot Check</div>
                          <div className="text-sm text-gray-400">
                            {analysis.honeypotData.isHoneypot 
                              ? "This token appears to be a honeypot"
                              : "No honeypot indicators detected"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={analysis.honeypotData.isHoneypot ? "destructive" : "outline"}>
                        {analysis.honeypotData.isHoneypot ? "HONEYPOT" : "SAFE"}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Token Information */}
            {analysis.tokenInfo && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Token Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Name</div>
                      <div className="text-white font-medium">{analysis.tokenInfo.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Symbol</div>
                      <div className="text-white font-medium">{analysis.tokenInfo.symbol}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Total Supply</div>
                      <div className="text-white font-medium">
                        {analysis.tokenInfo.supply ? analysis.tokenInfo.supply.toLocaleString() : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Decimals</div>
                      <div className="text-white font-medium">{analysis.tokenInfo.decimals || "N/A"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
