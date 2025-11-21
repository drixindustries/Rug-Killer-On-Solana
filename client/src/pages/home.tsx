import { useState, useEffect, lazy, Suspense } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { TokenInput } from "@/components/token-input";
import { RiskScoreCard } from "@/components/risk-score-card";
import { CriticalAlerts } from "@/components/critical-alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TELEGRAM_BOT_LINK, DISCORD_SERVER_LINK } from "@/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, CheckCircle, ThumbsUp, ThumbsDown, Flag, Share2, MessageSquare, MessageCircle, AlertTriangle, Star, Trash2, Twitter, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { TokenAnalysisResponse, TokenComment, CommunityVote, CommunityVoteSummary } from "@shared/schema";
import { CONTRACT_ADDRESS } from "@/constants";
import { MascotSpotlight } from "@/components/mascot-spotlight";

// Lazy load heavy components for better initial page load
const MetricsGrid = lazy(() => import("@/components/metrics-grid").then(m => ({ default: m.MetricsGrid })));
const TopHoldersTable = lazy(() => import("@/components/top-holders-table").then(m => ({ default: m.TopHoldersTable })));
const HolderDistributionChart = lazy(() => import("@/components/holder-distribution-chart").then(m => ({ default: m.HolderDistributionChart })));
const TransactionTimeline = lazy(() => import("@/components/transaction-timeline").then(m => ({ default: m.TransactionTimeline })));
const TokenMetadataCard = lazy(() => import("@/components/token-metadata-card").then(m => ({ default: m.TokenMetadataCard })));
const RugcheckCard = lazy(() => import("@/components/rugcheck-card").then(m => ({ default: m.RugcheckCard })));
const GoPlusCard = lazy(() => import("@/components/goplus-card").then(m => ({ default: m.GoPlusCard })));
const MarketDataCard = lazy(() => import("@/components/market-data-card").then(m => ({ default: m.MarketDataCard })));
const BubbleMapsCard = lazy(() => import("@/components/bubblemaps-card").then(m => ({ default: m.BubbleMapsCard })));
const TokenInfoSidebar = lazy(() => import("@/components/token-info-sidebar").then(m => ({ default: m.TokenInfoSidebar })));
const LiquidityBurnCard = lazy(() => import("@/components/liquidity-burn-card").then(m => ({ default: m.LiquidityBurnCard })));
const HolderFilteringCard = lazy(() => import("@/components/holder-filtering-card").then(m => ({ default: m.HolderFilteringCard })));
const BundleVisualizationChart = lazy(() => import("@/components/bundle-visualization-chart").then(m => ({ default: m.BundleVisualizationChart })));
const HoneypotCard = lazy(() => import("@/components/honeypot-card").then(m => ({ default: m.HoneypotCard })));
const BundleDetectionCard = lazy(() => import("@/components/bundle-detection-card").then(m => ({ default: m.BundleDetectionCard })));
const NetworkAnalysisCard = lazy(() => import("@/components/network-analysis-card").then(m => ({ default: m.NetworkAnalysisCard })));
const WhaleDetectionCard = lazy(() => import("@/components/whale-detection-card").then(m => ({ default: m.WhaleDetectionCard })));
const AgedWalletDetectionCard = lazy(() => import("@/components/aged-wallet-detection-card").then(m => ({ default: m.AgedWalletDetectionCard })));
const FundingAnalysisCard = lazy(() => import("@/components/funding-analysis-card").then(m => ({ default: m.FundingAnalysisCard })));
const CondensedTokenHeader = lazy(() => import("@/components/condensed-token-header").then(m => ({ default: m.CondensedTokenHeader })));
const CondensedAlerts = lazy(() => import("@/components/condensed-alerts").then(m => ({ default: m.CondensedAlerts })));
const CascadingAnalysisBars = lazy(() => import("@/components/cascading-analysis-bars").then(m => ({ default: m.CascadingAnalysisBars })));

// Loading fallback component for lazy-loaded components
const ComponentLoader = () => <Skeleton className="h-48 w-full" />;

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [analysis, setAnalysis] = useState<TokenAnalysisResponse | null>(null);
  const [currentTokenAddress, setCurrentTokenAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0);
  const [selectedVoteType, setSelectedVoteType] = useState<"safe" | "risky" | "scam" | null>(null);
  const [voteConfidence, setVoteConfidence] = useState([3]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState("scam");
  const [reportEvidence, setReportEvidence] = useState("");
  const [reportSeverity, setReportSeverity] = useState([3]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Contract address copied to clipboard",
    });
  };

  // Fetch comments for the current token
  const { data: comments, isLoading: commentsLoading } = useQuery<TokenComment[]>({
    queryKey: ["/api/comments", currentTokenAddress],
    enabled: !!currentTokenAddress && activeTab === "community",
  });

  // Fetch community votes summary
  const { data: voteSummary, isLoading: voteSummaryLoading } = useQuery<CommunityVoteSummary>({
    queryKey: ["/api/community-votes/summary", currentTokenAddress],
    enabled: !!currentTokenAddress && activeTab === "community",
  });

  // Fetch current user's vote
  const { data: userVote } = useQuery<CommunityVote>({
    queryKey: ["/api/community-votes/user", currentTokenAddress],
    enabled: !!currentTokenAddress && !!isAuthenticated && activeTab === "community",
  });

  // Submit community vote
  const submitVoteMutation = useMutation({
    mutationFn: async (data: { voteType: string; confidence: number }) => {
      if (!currentTokenAddress) throw new Error("No token selected");
      const response = await apiRequest("POST", "/api/community-votes", {
        tokenAddress: currentTokenAddress,
        voteType: data.voteType,
        confidence: data.confidence,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-votes"] });
      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded",
      });
      setSelectedVoteType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote",
        variant: "destructive",
      });
    },
  });

  // Submit comment
  const submitCommentMutation = useMutation({
    mutationFn: async (data: { commentText: string; rating: number }) => {
      if (!currentTokenAddress) throw new Error("No token selected");
      const response = await apiRequest("POST", "/api/comments", {
        tokenAddress: currentTokenAddress,
        commentText: data.commentText,
        rating: data.rating || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      setCommentText("");
      setCommentRating(0);
      toast({
        title: "Comment Posted",
        description: "Your comment has been added",
      });
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to post comment";
      toast({
        title: "Error",
        description: message.includes("rate limit") 
          ? "You're posting too fast. Please wait a moment."
          : message,
        variant: "destructive",
      });
    },
  });

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      toast({
        title: "Comment Deleted",
        description: "Your comment has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  // Vote on comment
  const voteCommentMutation = useMutation({
    mutationFn: async (data: { commentId: string; voteType: "up" | "down" }) => {
      const response = await apiRequest("POST", `/api/comments/${data.commentId}/vote`, {
        voteType: data.voteType,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to vote",
        variant: "destructive",
      });
    },
  });

  // Flag comment
  const flagCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("POST", `/api/comments/${commentId}/flag`);
    },
    onSuccess: () => {
      toast({
        title: "Comment Flagged",
        description: "This comment has been reported for review",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to flag comment",
        variant: "destructive",
      });
    },
  });

  // Submit report
  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!currentTokenAddress) throw new Error("No token selected");
      const response = await apiRequest("POST", "/api/reports", {
        tokenAddress: currentTokenAddress,
        reportType,
        evidence: reportEvidence,
        severityScore: reportSeverity[0],
      });
      return await response.json();
    },
    onSuccess: () => {
      setReportModalOpen(false);
      setReportType("scam");
      setReportEvidence("");
      setReportSeverity([3]);
      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep the community safe",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const handleShareTwitter = () => {
    if (!currentTokenAddress) return;
    const text = `Check out this token analysis on RugKiller: ${analysis?.metadata?.name || currentTokenAddress}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  };

  const handleShareTelegram = () => {
    if (!currentTokenAddress) return;
    const url = window.location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const analyzeMutation = useMutation({
    mutationFn: async (tokenAddress: string) => {
      const response = await apiRequest("POST", "/api/analyze", { tokenAddress });
      return await response.json() as TokenAnalysisResponse;
    },
    onSuccess: (data) => {
      setAnalysis(data);
    },
    onError: (error: Error) => {
      console.error("Analysis error:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "Failed to fetch",
      });
    },
  });

  const handleAnalyze = (address: string) => {
    setCurrentTokenAddress(address);
    analyzeMutation.mutate(address);
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    setCurrentTokenAddress(null);
    analyzeMutation.reset();
  };

  // Auto-refresh every 5 minutes (300,000 ms) when token is analyzed
  useEffect(() => {
    if (!currentTokenAddress || !analysis) return;

    const refreshInterval = setInterval(() => {
      console.log(`Auto-refreshing analysis for ${currentTokenAddress}`);
      analyzeMutation.mutate(currentTokenAddress);
    }, 300000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [currentTokenAddress, analysis]);

  const isLoading = analyzeMutation.isPending;
  const error = analyzeMutation.error;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onNewAnalysis={analysis ? handleNewAnalysis : undefined} />
      
      <main className="flex-1 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <div className="space-y-6 sm:space-y-8">
            {!analysis && (
              <>
                <div className="text-center space-y-4 sm:space-y-6 py-8 sm:py-12 lg:py-16">
                  <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Rug Killer Alpha Bot</h1>
                    <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                      Made by trenchers, for trenchers.
                    </p>
                  </div>
                </div>
                <MascotSpotlight />
              </>
            )}

            <div id="token-input" className="scroll-mt-32">
              <TokenInput onAnalyze={handleAnalyze} isAnalyzing={isLoading} />
            </div>

            {/* BubbleMaps - Positioned directly below token input for better visibility */}
            {analysis && (
              <Suspense fallback={<ComponentLoader />}>
                <BubbleMapsCard tokenAddress={analysis.tokenAddress} />
              </Suspense>
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="community" data-testid="tab-community">Community</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-6">
                  {/* Token Header - Compact Info */}
                  <Suspense fallback={<ComponentLoader />}>
                    <CondensedTokenHeader analysis={analysis} />
                  </Suspense>

                  {/* NEW: Cascading Analysis Bars - Primary Results */}
                  <Suspense fallback={<ComponentLoader />}>
                    <CascadingAnalysisBars analysis={analysis} />
                  </Suspense>

                  {/* Detailed Charts Section - Collapsible/Below Bars */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    {/* Left Column - Detailed Analysis */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Aged Wallet Chart */}
                      {analysis.agedWalletData && (
                        <Suspense fallback={<ComponentLoader />}>
                          <AgedWalletDetectionCard data={analysis.agedWalletData} />
                        </Suspense>
                      )}

                      {/* Honeypot Detection Card */}
                      {analysis.honeypotDetection && (
                        <Suspense fallback={<ComponentLoader />}>
                          <HoneypotCard data={analysis.honeypotDetection} />
                        </Suspense>
                      )}

                      {/* Funding Analysis */}
                      {analysis.fundingAnalysis && (
                        <Suspense fallback={<ComponentLoader />}>
                          <FundingAnalysisCard fundingData={analysis.fundingAnalysis} />
                        </Suspense>
                      )}

                      {/* Holder Analysis */}
                      {analysis.holderFiltering && analysis.holderFiltering.totals.total > 0 && (
                        <div className="space-y-4">
                          <Suspense fallback={<ComponentLoader />}>
                            <BundleVisualizationChart 
                              filtering={analysis.holderFiltering}
                              totalHolders={analysis.holderCount || 0}
                            />
                          </Suspense>
                          <Suspense fallback={<ComponentLoader />}>
                            <HolderFilteringCard filtering={analysis.holderFiltering} />
                          </Suspense>
                        </div>
                      )}

                      {/* Holder Distribution Chart */}
                      {analysis.topHolders && analysis.topHolders.length > 0 && (
                        <Suspense fallback={<ComponentLoader />}>
                          <HolderDistributionChart
                            holders={analysis.topHolders}
                            totalConcentration={analysis.topHolderConcentration || 0}
                          />
                        </Suspense>
                      )}
                    </div>
                    
                    {/* Right Column - Compact Sidebar */}
                    <div className="space-y-4">
                      {/* Token Metadata */}
                      <Suspense fallback={<ComponentLoader />}>
                        <TokenMetadataCard 
                          metadata={analysis.metadata}
                          tokenAddress={analysis.tokenAddress}
                          creationDate={analysis.creationDate}
                        />
                      </Suspense>

                      {/* Top Holders */}
                      {analysis.topHolders && analysis.topHolders.length > 0 && (
                        <Suspense fallback={<ComponentLoader />}>
                          <TopHoldersTable 
                            holders={analysis.topHolders}
                            decimals={analysis.metadata?.decimals || 0}
                          />
                        </Suspense>
                      )}

                      {/* Recent Transactions */}
                      <Suspense fallback={<ComponentLoader />}>
                        <TransactionTimeline transactions={analysis.recentTransactions || []} />
                      </Suspense>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="community" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Community Verdict and Comments */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Community Vote Widget */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Community Verdict</CardTitle>
                          <CardDescription>What do you think about this token?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Vote Summary */}
                          {voteSummaryLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                          ) : voteSummary && Number(voteSummary.totalVotes) > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Community Consensus:</span>
                                <Badge variant={
                                  voteSummary.consensus === "safe" ? "default" :
                                  voteSummary.consensus === "risky" ? "secondary" :
                                  "destructive"
                                }>
                                  {voteSummary.consensus?.toUpperCase() || "MIXED"}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-green-500">Safe</span>
                                  <span>{((Number(voteSummary.safeWeight) / (Number(voteSummary.safeWeight) + Number(voteSummary.riskyWeight) + Number(voteSummary.scamWeight))) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-amber-500">Risky</span>
                                  <span>{((Number(voteSummary.riskyWeight) / (Number(voteSummary.safeWeight) + Number(voteSummary.riskyWeight) + Number(voteSummary.scamWeight))) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-destructive">Scam</span>
                                  <span>{((Number(voteSummary.scamWeight) / (Number(voteSummary.safeWeight) + Number(voteSummary.riskyWeight) + Number(voteSummary.scamWeight))) * 100).toFixed(1)}%</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{Number(voteSummary.totalVotes)} votes</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-4">No votes yet. Be the first to vote!</p>
                          )}

                          {isAuthenticated ? (
                            <>
                              {userVote ? (
                                <div className="p-4 bg-muted rounded-md">
                                  <p className="text-sm">
                                    You voted: <Badge>{userVote.voteType.toUpperCase()}</Badge> (Confidence: {Number(userVote.confidence)}/5)
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant={selectedVoteType === "safe" ? "default" : "outline"}
                                      onClick={() => setSelectedVoteType("safe")}
                                      data-testid="button-vote-safe"
                                      className="flex-1"
                                    >
                                      Safe
                                    </Button>
                                    <Button
                                      variant={selectedVoteType === "risky" ? "default" : "outline"}
                                      onClick={() => setSelectedVoteType("risky")}
                                      data-testid="button-vote-risky"
                                      className="flex-1"
                                    >
                                      Risky
                                    </Button>
                                    <Button
                                      variant={selectedVoteType === "scam" ? "destructive" : "outline"}
                                      onClick={() => setSelectedVoteType("scam")}
                                      data-testid="button-vote-scam"
                                      className="flex-1"
                                    >
                                      Scam
                                    </Button>
                                  </div>

                                  {selectedVoteType && (
                                    <div className="space-y-3">
                                      <div>
                                        <Label htmlFor="confidence-slider">Confidence: {voteConfidence[0]}/5</Label>
                                        <Slider
                                          id="confidence-slider"
                                          min={1}
                                          max={5}
                                          step={1}
                                          value={voteConfidence}
                                          onValueChange={setVoteConfidence}
                                          data-testid="slider-confidence"
                                          className="mt-2"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                          <span>Low</span>
                                          <span>High</span>
                                        </div>
                                      </div>
                                      <Button
                                        onClick={() => submitVoteMutation.mutate({ voteType: selectedVoteType, confidence: voteConfidence[0] })}
                                        disabled={submitVoteMutation.isPending}
                                        data-testid="button-submit-vote"
                                        className="w-full"
                                      >
                                        {submitVoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Submit Vote
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sign in to vote</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Comments Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Community Comments
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Comment Form */}
                          {isAuthenticated && (
                            <div className="space-y-4 pb-6 border-b">
                              <div>
                                <Label htmlFor="comment-rating">Your Rating (Optional)</Label>
                                <div className="flex gap-1 mt-2">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <Button
                                      key={rating}
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setCommentRating(rating)}
                                      data-testid={`select-comment-rating-${rating}`}
                                    >
                                      <Star
                                        className={`w-5 h-5 ${rating <= commentRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                                      />
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="comment-text">Your Comment</Label>
                                <Textarea
                                  id="comment-text"
                                  placeholder="Share your thoughts about this token..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  data-testid="input-comment-text"
                                  className="mt-2"
                                  rows={3}
                                />
                              </div>
                              <Button
                                onClick={() => submitCommentMutation.mutate({ commentText, rating: commentRating })}
                                disabled={!commentText.trim() || submitCommentMutation.isPending}
                                data-testid="button-submit-comment"
                              >
                                {submitCommentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Post Comment
                              </Button>
                            </div>
                          )}

                          {/* Comments List */}
                          {commentsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                          ) : !comments || comments.length === 0 ? (
                            <div className="text-center py-8">
                              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                              <p className="text-muted-foreground">No comments yet. Be the first!</p>
                            </div>
                          ) : (
                            <div className="space-y-4" data-testid="list-comments">
                              {comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="p-4 bg-muted rounded-md space-y-2"
                                  data-testid={`comment-${comment.id}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-8 h-8">
                                        <AvatarFallback>{comment.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium">{comment.userId.slice(0, 8)}...</p>
                                        <p className="text-xs text-muted-foreground">
                                          {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : "Just now"}
                                        </p>
                                      </div>
                                    </div>
                                    {comment.rating && (
                                      <div className="flex gap-0.5">
                                        {Array.from({ length: Number(comment.rating) }).map((_, i) => (
                                          <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm">{comment.commentText}</p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => voteCommentMutation.mutate({ commentId: comment.id, voteType: "up" })}
                                      disabled={voteCommentMutation.isPending}
                                      data-testid={`button-upvote-${comment.id}`}
                                    >
                                      <ThumbsUp className="w-3 h-3 mr-1" />
                                      {Number(comment.upvoteCount || 0)}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => voteCommentMutation.mutate({ commentId: comment.id, voteType: "down" })}
                                      disabled={voteCommentMutation.isPending}
                                      data-testid={`button-downvote-${comment.id}`}
                                    >
                                      <ThumbsDown className="w-3 h-3 mr-1" />
                                      {Number(comment.downvoteCount || 0)}
                                    </Button>
                                    {isAuthenticated && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => flagCommentMutation.mutate(comment.id)}
                                          disabled={flagCommentMutation.isPending}
                                          data-testid={`button-flag-${comment.id}`}
                                        >
                                          <Flag className="w-3 h-3" />
                                        </Button>
                                        {comment.userId === user?.id && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                                            disabled={deleteCommentMutation.isPending}
                                            data-testid={`button-delete-${comment.id}`}
                                          >
                                            <Trash2 className="w-3 h-3 text-destructive" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right Column - Share and Report */}
                    <div className="space-y-6">
                      {/* Share Analysis */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5" />
                            Share Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleShareTwitter}
                            data-testid="button-share-twitter"
                          >
                            <Twitter className="w-4 h-4 mr-2" />
                            Share on Twitter
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleShareTelegram}
                            data-testid="button-share-telegram"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Share on Telegram
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleCopyLink}
                            data-testid="button-copy-link"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Report Token */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Report Issues
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" className="w-full" data-testid="button-report-token">
                                Report This Token
                              </Button>
                            </DialogTrigger>
                            <DialogContent data-testid="modal-report">
                              <DialogHeader>
                                <DialogTitle>Report Token</DialogTitle>
                                <DialogDescription>
                                  Help protect the community by reporting suspicious activity
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="report-type">Report Type</Label>
                                  <Select value={reportType} onValueChange={setReportType}>
                                    <SelectTrigger id="report-type" data-testid="select-report-type">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="scam">Scam</SelectItem>
                                      <SelectItem value="honeypot">Honeypot</SelectItem>
                                      <SelectItem value="soft_rug">Soft Rug</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="evidence">Evidence/Details</Label>
                                  <Textarea
                                    id="evidence"
                                    placeholder="Provide details about why you're reporting this token..."
                                    value={reportEvidence}
                                    onChange={(e) => setReportEvidence(e.target.value)}
                                    data-testid="input-evidence"
                                    rows={4}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="severity">Severity: {reportSeverity[0]}/5</Label>
                                  <Slider
                                    id="severity"
                                    min={1}
                                    max={5}
                                    step={1}
                                    value={reportSeverity}
                                    onValueChange={setReportSeverity}
                                    data-testid="slider-severity"
                                    className="mt-2"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setReportModalOpen(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => submitReportMutation.mutate()}
                                  disabled={!reportEvidence.trim() || submitReportMutation.isPending}
                                  data-testid="button-submit-report"
                                >
                                  {submitReportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Submit Report
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>

      {/* TELEGRAM & DISCORD BOT LINKS - BOTTOM CORNER AS REQUESTED MULTIPLE TIMES! */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col gap-3">
          <a
            href={TELEGRAM_BOT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 group"
            title="Rug Killer Telegram Bot"
            aria-label="Open Rug Killer Telegram Bot in a new tab"
          >
            <Send className="h-6 w-6" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Telegram Bot
            </span>
          </a>
          <a
            href={DISCORD_SERVER_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 group"
            title="Rug Killer Discord Bot"
            aria-label="Open Rug Killer Discord bot invite in a new tab"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Discord Bot
            </span>
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
