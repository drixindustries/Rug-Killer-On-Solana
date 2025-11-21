import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { HolderFilteringMetadata } from "@shared/schema";
import { Users, Droplet, Building2, Network, AlertTriangle, Clock, Bot, Brain, Target, Zap, TrendingUp } from "lucide-react";

interface BundleVisualizationChartProps {
  filtering: HolderFilteringMetadata;
  totalHolders: number;
}

export function BundleVisualizationChart({ filtering, totalHolders }: BundleVisualizationChartProps) {
  // Clamp to prevent negative values when totalHolders is low
  const legitHolders = Math.max(totalHolders - filtering.totals.total, 0);

  const holderData = [
    {
      name: "Legitimate Holders",
      value: legitHolders,
      color: "hsl(var(--chart-1))",
      icon: Users,
      description: "Regular token holders"
    },
    {
      name: "LP Addresses",
      value: filtering.totals.lp,
      color: "hsl(var(--chart-2))",
      icon: Droplet,
      description: "Liquidity pools excluded from analysis"
    },
    {
      name: "Exchange Wallets",
      value: filtering.totals.exchanges,
      color: "hsl(var(--chart-3))",
      icon: Building2,
      description: "Centralized exchange wallets"
    },
    {
      name: "Protocol Addresses",
      value: filtering.totals.protocols,
      color: "hsl(var(--chart-4))",
      icon: Network,
      description: "DeFi protocol contracts"
    },
    {
      name: "Bundled Wallets",
      value: filtering.totals.bundled,
      color: "hsl(var(--destructive))",
      icon: AlertTriangle,
      description: "Suspicious coordinated wallets"
    }
  ].filter(item => item.value > 0);

  // GMGN-style wallet intelligence data
  const walletIntelData = filtering.walletIntelligence ? [
    {
      name: "Degens",
      value: filtering.totals.degens || 0,
      color: "#ff6b6b",
      icon: Zap,
      description: "High-risk degenerate traders",
      supplyPercent: filtering.walletIntelligence.classifications?.degens?.supplyPercent || 0
    },
    {
      name: "Bots",
      value: filtering.totals.bots || 0,
      color: "#4ecdc4",
      icon: Bot,
      description: "Automated trading bots",
      supplyPercent: filtering.walletIntelligence.classifications?.bots?.supplyPercent || 0
    },
    {
      name: "Smart Money",
      value: filtering.totals.smartMoney || 0,
      color: "#45b7d1",
      icon: Brain,
      description: "Successful traders and whales",
      supplyPercent: filtering.walletIntelligence.classifications?.smartMoney?.supplyPercent || 0
    },
    {
      name: "Snipers",
      value: filtering.totals.snipers || 0,
      color: "#f7b731",
      icon: Target,
      description: "MEV bots and launch snipers",
      supplyPercent: filtering.walletIntelligence.classifications?.snipers?.supplyPercent || 0
    },
    {
      name: "Aged Wallets",
      value: filtering.totals.aged || 0,
      color: "#5f27cd",
      icon: Clock,
      description: "Wallets older than 6 months",
      supplyPercent: 0
    },
    {
      name: "New Wallets",
      value: filtering.totals.newWallets || 0,
      color: "#ff9ff3",
      icon: TrendingUp,
      description: "Wallets created in last 30 days",
      supplyPercent: 0
    }
  ].filter(item => item.value > 0) : [];

  // Age distribution data for bar chart
  const ageDistributionData = filtering.walletIntelligence?.ageDistribution ? [
    { name: "Very New (<7d)", value: filtering.walletIntelligence.ageDistribution.veryNew, color: "#ff4757" },
    { name: "New (7-30d)", value: filtering.walletIntelligence.ageDistribution.new, color: "#ff6348" },
    { name: "Recent (30-90d)", value: filtering.walletIntelligence.ageDistribution.recent, color: "#ffa726" },
    { name: "Established (90-365d)", value: filtering.walletIntelligence.ageDistribution.established, color: "#66bb6a" },
    { name: "Aged (>365d)", value: filtering.walletIntelligence.ageDistribution.aged, color: "#42a5f5" }
  ].filter(item => item.value > 0) : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Guard against division by zero
      const percentage = totalHolders > 0 ? ((data.value / totalHolders) * 100).toFixed(2) : '0.00';
      
      return (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <data.icon className="h-4 w-4" />
            <span className="font-semibold">{data.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{data.description}</p>
          <p className="text-lg font-bold">{data.value.toLocaleString()} holders</p>
          <p className="text-xs text-muted-foreground">
            {percentage}% of total
          </p>
        </Card>
      );
    }
    return null;
  };

  const IntelligenceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <data.icon className="h-4 w-4" />
            <span className="font-semibold">{data.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{data.description}</p>
          <p className="text-lg font-bold">{data.value.toLocaleString()} wallets</p>
          {data.supplyPercent > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.supplyPercent.toFixed(2)}% of token supply
            </p>
          )}
        </Card>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const IconComponent = entry.payload.icon;
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <IconComponent className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {entry.value}: <span className="font-semibold text-foreground">{entry.payload.value}</span>
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderIntelligenceLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const IconComponent = entry.payload.icon;
          return (
            <div key={`intel-legend-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <IconComponent className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {entry.value}: <span className="font-semibold text-foreground">{entry.payload.value}</span>
                {entry.payload.supplyPercent > 0 && (
                  <span className="text-xs"> ({entry.payload.supplyPercent.toFixed(1)}%)</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card data-testid="card-bundle-visualization">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle>Holder Intelligence Analysis</CardTitle>
        {filtering.totals.bundled > 0 && filtering.bundledDetection && (
          <div className="flex items-center gap-2">
            {filtering.bundledDetection.bundleSupplyPct !== undefined && (
              <Badge 
                variant="outline" 
                className="bg-orange-500/10 text-orange-600 border-orange-500/20 flex items-center gap-1"
                data-testid="badge-bundle-percentage"
              >
                <AlertTriangle className="h-3 w-3" />
                {filtering.bundledDetection.bundleSupplyPct.toFixed(2)}% Supply
              </Badge>
            )}
            <Badge variant="destructive" className="flex items-center gap-1" data-testid="badge-bundle-warning">
              <AlertTriangle className="h-3 w-3" />
              {filtering.totals.bundled} Wallet{filtering.totals.bundled > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="holders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="holders">Holder Types</TabsTrigger>
            <TabsTrigger value="intelligence">Wallet Intelligence</TabsTrigger>
            <TabsTrigger value="age">Age Distribution</TabsTrigger>
          </TabsList>
          
          {/* Holder Types Tab */}
          <TabsContent value="holders" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={holderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {holderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Wallet Intelligence Tab - GMGN Style */}
          <TabsContent value="intelligence" className="space-y-4">
            {walletIntelData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={walletIntelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, supplyPercent }) => 
                        `${name}: ${value} (${supplyPercent ? supplyPercent.toFixed(1) + '% supply' : ''})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {walletIntelData.map((entry, index) => (
                        <Cell key={`intel-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<IntelligenceTooltip />} />
                    <Legend content={renderIntelligenceLegend} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Wallet intelligence analysis not available</p>
              </div>
            )}
            
            {/* Intelligence Summary */}
            {filtering.walletIntelligence && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <Zap className="h-6 w-6 mx-auto mb-1 text-red-500" />
                  <p className="text-lg font-bold text-red-600">{filtering.totals.degens || 0}</p>
                  <p className="text-xs text-red-500">Degens</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Bot className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-bold text-blue-600">{filtering.totals.bots || 0}</p>
                  <p className="text-xs text-blue-500">Bots</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Brain className="h-6 w-6 mx-auto mb-1 text-green-500" />
                  <p className="text-lg font-bold text-green-600">{filtering.totals.smartMoney || 0}</p>
                  <p className="text-xs text-green-500">Smart Money</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                  <p className="text-lg font-bold text-yellow-600">{filtering.totals.snipers || 0}</p>
                  <p className="text-xs text-yellow-500">Snipers</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Age Distribution Tab */}
          <TabsContent value="age" className="space-y-4">
            {ageDistributionData.length > 0 ? (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <Card className="p-2">
                                <p className="font-semibold">{label}</p>
                                <p className="text-lg">{data.value} wallets</p>
                              </Card>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value">
                        {ageDistributionData.map((bucket) => (
                          <Cell key={bucket.name} fill={bucket.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Age Metrics */}
                {filtering.walletIntelligence && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{filtering.walletIntelligence.avgWalletAge.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Avg Age (days)</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <TrendingUp className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{filtering.walletIntelligence.oldestWallet.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Oldest (days)</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{filtering.walletIntelligence.newestWallet.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Newest (days)</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Wallet age analysis not available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Holders</p>
            <p className="text-2xl font-bold" data-testid="text-total-holders">
              {totalHolders.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Filtered Addresses</p>
            <p className="text-2xl font-bold" data-testid="text-filtered-count">
              {filtering.totals.total.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Legitimate Holders</p>
            <p className="text-2xl font-bold text-green-600" data-testid="text-legit-holders">
              {legitHolders.toLocaleString()}
            </p>
          </div>
          {filtering.totals.bundled > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Suspicious Bundles</p>
              <p className="text-2xl font-bold text-destructive" data-testid="text-bundle-count">
                {filtering.totals.bundled.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Bundle Detection Details */}
        {filtering.totals.bundled > 0 && filtering.bundledDetection && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h4 className="font-semibold text-sm">Bundle Detection Alert</h4>
              <Badge 
                variant={filtering.bundledDetection.confidence === 'high' ? 'destructive' : 'secondary'}
                data-testid="badge-confidence"
              >
                {filtering.bundledDetection.confidence} confidence
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-bundle-details">
              {filtering.bundledDetection.details}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Detection strategy: {filtering.bundledDetection.strategy}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
