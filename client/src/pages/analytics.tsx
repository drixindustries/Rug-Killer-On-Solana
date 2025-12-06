import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Bell,
  Search,
  RefreshCw,
  Target,
  Shield,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Color palette for risk levels
const RISK_COLORS = {
  LOW: "#10B981",
  MODERATE: "#FFA500",
  HIGH: "#DC2626",
  EXTREME: "#8B0000",
};

interface MarketOverviewData {
  totalAnalyzed: number;
  rugsDetected: number;
  avgRiskScore: number;
  activeAlerts: number;
  trending: Array<{
    tokenAddress: string;
    score: number;
    rank: number;
    volume24h: number | null;
    velocity: number | null;
  }>;
}

interface HistoricalDataPoint {
  timestamp: string;
  priceUsd: number | null;
  riskScore: number;
  holderCount: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  riskFlags: string[] | null;
  txCount24h: number | null;
}

interface RiskInsightsData {
  last7Days: {
    totalAnalyzed: number;
    rugDetected: number;
    falsePositives: number;
    detectionRate: string;
    commonFlags: Record<string, number>;
  } | null;
  last30Days: {
    totalAnalyzed: number;
    rugDetected: number;
    falsePositives: number;
    detectionRate: string;
    commonFlags: Record<string, number>;
  } | null;
}

interface HotToken {
  tokenAddress: string;
  score: number;
  rank: number;
  volume24h: number | null;
  velocity: number | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  riskScore: number | null;
  updatedAt: string;
}

interface PerformanceData {
  last7Days: {
    detectionRate: string;
    falsePositiveRate: string;
    coverage: number;
    avgAnalysisTime: string;
  } | null;
  last30Days: {
    detectionRate: string;
    falsePositiveRate: string;
    coverage: number;
    avgAnalysisTime: string;
  } | null;
}

function getRiskBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  // REVERSED: 70-100 (green), 40-70 (yellow), 20-40 (orange), 0-20 (red)
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  if (score >= 20) return "outline";
  return "destructive";
}

function getRiskLevel(score: number): string {
  // REVERSED: 70-100 (green), 40-70 (yellow), 20-40 (orange), 0-20 (red)
  if (score >= 70) return "LOW";
  if (score >= 40) return "MODERATE";
  if (score >= 20) return "HIGH";
  return "EXTREME";
}

export default function Analytics() {
  const [selectedToken, setSelectedToken] = useState("");
  const [historicalDays, setHistoricalDays] = useState<7 | 30 | 90>(7);
  const [hotTokensRefresh, setHotTokensRefresh] = useState(0);

  // Market Overview Query
  const { data: marketOverview, isLoading: overviewLoading } = useQuery<MarketOverviewData>({
    queryKey: ["analytics", "market-overview"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/market-overview");
      return (await res.json()) as MarketOverviewData;
    },
  });

  // Historical Data Query
  const { data: historicalData, isLoading: historicalLoading } = useQuery<{
    tokenAddress: string;
    days: number;
    dataPoints: number;
    data: HistoricalDataPoint[];
  }>({
    queryKey: ["analytics", "historical", selectedToken, historicalDays],
    enabled: !!selectedToken && selectedToken.length >= 32,
    queryFn: async () => {
      const url = `/api/analytics/historical/${selectedToken}?days=${historicalDays}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // Risk Insights Query
  const { data: riskInsights, isLoading: insightsLoading } = useQuery<RiskInsightsData>({
    queryKey: ["analytics", "risk-insights"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/risk-insights");
      return (await res.json()) as RiskInsightsData;
    },
  });

  // Hot Tokens Query (with auto-refresh)
  const { data: hotTokens, isLoading: hotTokensLoading, refetch: refetchHotTokens } = useQuery<HotToken[]>({
    queryKey: ["analytics", "hot-tokens", hotTokensRefresh],
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/hot-tokens?limit=20&_=${hotTokensRefresh}`);
      return (await res.json()) as HotToken[];
    },
  });

  // Performance Metrics Query
  const { data: performance, isLoading: performanceLoading } = useQuery<PerformanceData>({
    queryKey: ["analytics", "performance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/performance");
      return (await res.json()) as PerformanceData;
    },
  });

  // Auto-refresh hot tokens every 2 minutes (reduced from 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setHotTokensRefresh(prev => prev + 1);
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="text-analytics-title">
            Advanced Analytics Dashboard
          </h1>
          <p className="text-secondary text-lg" data-testid="text-analytics-subtitle">
            Real-time market intelligence and risk analysis across the Solana ecosystem
          </p>
        </div>

        {/* Market Overview Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white" data-testid="text-section-market-overview">
            Market Overview
          </h2>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-total-analyzed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Analyzed</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-total-analyzed">
                      {(marketOverview?.totalAnalyzed ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Last hour</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-rugs-detected" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/rugs'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rugs Detected</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-destructive" data-testid="text-rugs-detected">
                      {(marketOverview?.rugsDetected ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">All time • Click to view</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-avg-risk-score">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-avg-risk-score">
                      {marketOverview?.avgRiskScore || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">0-100 scale</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-active-alerts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-active-alerts">
                      {marketOverview?.activeAlerts || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Price alerts</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trending Tokens Table */}
          <Card data-testid="card-trending-tokens">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Trending Tokens
              </CardTitle>
              <CardDescription>Hottest tokens based on volume, velocity, and activity</CardDescription>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-trending">
                    <thead>
                      <tr className="border-b text-sm text-muted-foreground">
                        <th className="text-left py-2 px-4">Rank</th>
                        <th className="text-left py-2 px-4">Token Address</th>
                        <th className="text-right py-2 px-4">Risk Score</th>
                        <th className="text-right py-2 px-4">Volume 24h</th>
                        <th className="text-right py-2 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketOverview?.trending.slice(0, 10).map((token, index) => (
                        <tr
                          key={token.tokenAddress}
                          className="border-b hover-elevate"
                          data-testid={`row-trending-${index}`}
                        >
                          <td className="py-3 px-4">
                            <Badge variant="outline">
                              #{token.rank}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm" data-testid={`text-trending-token-${index}`}>
                            {token.tokenAddress.slice(0, 8)}...{token.tokenAddress.slice(-8)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="outline" data-testid={`badge-risk-${index}`}>
                              Score: {Number(token.score).toFixed(2)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right" data-testid={`text-volume-${index}`}>
                            ${Number(token.volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/?token=${token.tokenAddress}`, '_blank')}
                              data-testid={`button-analyze-trending-${index}`}
                            >
                              Analyze
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Historical Tracking Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white" data-testid="text-section-historical">
            Historical Tracking
          </h2>

          <Card data-testid="card-historical-tracking">
            <CardHeader>
              <CardTitle>Token Price & Risk Timeline</CardTitle>
              <CardDescription>Track price movements and risk score changes over time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Input */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter token address (32-44 characters)"
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="pl-10"
                      data-testid="input-token-address"
                    />
                  </div>
                </div>

                {/* Timeframe Selector */}
                <Tabs
                  value={historicalDays.toString()}
                  onValueChange={(v) => setHistoricalDays(parseInt(v) as 7 | 30 | 90)}
                  data-testid="select-timeframe"
                >
                  <TabsList>
                    <TabsTrigger value="7" data-testid="tab-7d">7 Days</TabsTrigger>
                    <TabsTrigger value="30" data-testid="tab-30d">30 Days</TabsTrigger>
                    <TabsTrigger value="90" data-testid="tab-90d">90 Days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Charts */}
              {selectedToken && selectedToken.length >= 32 ? (
                historicalLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : historicalData && historicalData.data.length > 0 ? (
                  <div className="space-y-6" data-testid="chart-historical">
                    {/* Price Chart */}
                    <div data-testid="chart-price">
                      <h4 className="text-sm font-medium mb-2">Price (USD)</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={historicalData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(val) => new Date(val).toLocaleDateString()}
                            stroke="#666"
                          />
                          <YAxis stroke="#666" />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="priceUsd"
                            stroke="#FF6B2C"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Risk Score Chart */}
                    <div data-testid="chart-risk-score">
                      <h4 className="text-sm font-medium mb-2">Risk Score</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={historicalData.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(val) => new Date(val).toLocaleDateString()}
                            stroke="#666"
                          />
                          <YAxis stroke="#666" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="riskScore"
                            stroke="#DC2626"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-sm text-muted-foreground" data-testid="text-data-points">
                      Showing {historicalData.dataPoints} data points over {historicalData.days} days
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="text-no-historical-data">
                    No historical data available for this token. Try analyzing it first.
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-enter-token">
                  Enter a valid token address to view historical data
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Risk Insights Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white" data-testid="text-section-risk-insights">
            Risk Insights
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Common Flags Chart */}
            <Card data-testid="card-common-flags">
              <CardHeader>
                <CardTitle>Common Risk Flags (30 Days)</CardTitle>
                <CardDescription>Most frequently detected risk indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : riskInsights?.last30Days?.commonFlags ? (
                  <ResponsiveContainer width="100%" height={300} data-testid="chart-common-flags">
                    <BarChart
                      data={Object.entries(riskInsights.last30Days.commonFlags).map(([flag, count]) => ({
                        flag: flag.replace(/_/g, " ").toUpperCase(),
                        count,
                      }))}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis type="number" stroke="#666" />
                      <YAxis dataKey="flag" type="category" stroke="#666" width={150} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
                      />
                      <Bar dataKey="count" fill="#FF6B2C" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="text-no-insights">
                    No risk data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detection Stats */}
            <Card data-testid="card-detection-stats">
              <CardHeader>
                <CardTitle>Detection Statistics</CardTitle>
                <CardDescription>Performance metrics over different time windows</CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-6">
                    {riskInsights?.last7Days && (
                      <div data-testid="stats-7d">
                        <h4 className="text-sm font-medium mb-3">Last 7 Days</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Analyzed</p>
                            <p className="text-xl font-bold" data-testid="text-7d-total">
                              {(riskInsights.last7Days.totalAnalyzed ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Rugs Detected</p>
                            <p className="text-xl font-bold text-destructive" data-testid="text-7d-rugs">
                              {Number(riskInsights.last7Days.rugDetected)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Detection Rate</p>
                            <p className="text-xl font-bold" data-testid="text-7d-rate">
                              {Number(riskInsights.last7Days.detectionRate).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">False Positives</p>
                            <p className="text-xl font-bold" data-testid="text-7d-false-positives">
                              {Number(riskInsights.last7Days.falsePositives)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {riskInsights?.last30Days && (
                      <div data-testid="stats-30d">
                        <h4 className="text-sm font-medium mb-3">Last 30 Days</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Analyzed</p>
                            <p className="text-xl font-bold" data-testid="text-30d-total">
                              {(riskInsights.last30Days.totalAnalyzed ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Rugs Detected</p>
                            <p className="text-xl font-bold text-destructive" data-testid="text-30d-rugs">
                              {Number(riskInsights.last30Days.rugDetected)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Detection Rate</p>
                            <p className="text-xl font-bold" data-testid="text-30d-rate">
                              {Number(riskInsights.last30Days.detectionRate).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">False Positives</p>
                            <p className="text-xl font-bold" data-testid="text-30d-false-positives">
                              {Number(riskInsights.last30Days.falsePositives)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hot Tokens Feed Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white" data-testid="text-section-hot-tokens">
              Hot Tokens Feed
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHotTokens()}
              disabled={hotTokensLoading}
              data-testid="button-refresh-hot-tokens"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${hotTokensLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card data-testid="card-hot-tokens">
            <CardHeader>
              <CardDescription>Top trending tokens updated every 30 seconds</CardDescription>
            </CardHeader>
            <CardContent>
              {hotTokensLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : hotTokens && hotTokens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotTokens.slice(0, 20).map((token) => (
                    <Card
                      key={token.tokenAddress}
                      className="hover-elevate cursor-pointer"
                      data-testid={`card-hot-token-${token.rank}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" data-testid={`badge-hot-rank-${token.rank}`}>
                            #{token.rank}
                          </Badge>
                          {token.riskScore !== null && (
                            <Badge
                              variant={getRiskBadgeVariant(token.riskScore)}
                              data-testid={`badge-hot-risk-${token.rank}`}
                            >
                              {getRiskLevel(token.riskScore)}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-sm font-mono truncate" data-testid={`text-hot-token-name-${token.rank}`}>
                          {token.tokenAddress.slice(0, 12)}...
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-semibold" data-testid={`text-hot-price-${token.rank}`}>
                            ${Number(token.priceUsd || 0).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">24h Change</span>
                          <span
                            className={`font-semibold ${
                              (token.priceChange24h || 0) >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                            data-testid={`text-hot-change-${token.rank}`}
                          >
                            {token.priceChange24h !== null
                              ? `${token.priceChange24h > 0 ? "+" : ""}${Number(token.priceChange24h).toFixed(2)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Volume</span>
                          <span className="font-semibold" data-testid={`text-hot-volume-${token.rank}`}>
                            ${Number(token.volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          variant="outline"
                          onClick={() => window.open(`/?token=${token.tokenAddress}`, '_blank')}
                          data-testid={`button-analyze-hot-${token.rank}`}
                        >
                          Analyze
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-hot-tokens">
                  No trending tokens available yet. Start analyzing tokens to populate this feed.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white" data-testid="text-section-performance">
            Performance Metrics
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 7-Day Performance */}
            <Card data-testid="card-performance-7d">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  7-Day Performance
                </CardTitle>
                <CardDescription>Detection accuracy and system metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : performance?.last7Days ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/20 rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">Accuracy Rate</p>
                        <p className="text-3xl font-bold text-green-500" data-testid="text-7d-accuracy">
                          {Number(performance.last7Days.detectionRate).toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted/20 rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">False Positives</p>
                        <p className="text-3xl font-bold text-amber-500" data-testid="text-7d-false-positives">
                          {Number(performance.last7Days.falsePositiveRate).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage</p>
                        <p className="text-xl font-bold" data-testid="text-7d-coverage">
                          {(performance.last7Days.coverage ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Analysis Time</p>
                        <p className="text-xl font-bold" data-testid="text-7d-time">
                          {performance.last7Days.avgAnalysisTime}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="text-no-perf-7d">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 30-Day Performance */}
            <Card data-testid="card-performance-30d">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  30-Day Performance
                </CardTitle>
                <CardDescription>Long-term detection accuracy and system metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : performance?.last30Days ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/20 rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">Accuracy Rate</p>
                        <p className="text-3xl font-bold text-green-500" data-testid="text-30d-accuracy">
                          {Number(performance.last30Days.detectionRate).toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted/20 rounded-md">
                        <p className="text-sm text-muted-foreground mb-1">False Positives</p>
                        <p className="text-3xl font-bold text-amber-500" data-testid="text-30d-false-positives">
                          {Number(performance.last30Days.falsePositiveRate).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage</p>
                        <p className="text-xl font-bold" data-testid="text-30d-coverage">
                          {(performance.last30Days.coverage ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Analysis Time</p>
                        <p className="text-xl font-bold" data-testid="text-30d-time">
                          {performance.last30Days.avgAnalysisTime}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="text-no-perf-30d">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
