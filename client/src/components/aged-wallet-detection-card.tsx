import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, DollarSign, Users, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { AgedWalletData } from "@shared/schema";

interface AgedWalletDetectionCardProps {
  data: AgedWalletData;
}

export function AgedWalletDetectionCard({ data }: AgedWalletDetectionCardProps) {
  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-500";
    if (score >= 40) return "text-orange-500";
    return "text-yellow-500";
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive">Critical Risk</Badge>;
    if (score >= 40) return <Badge className="bg-orange-500">High Risk</Badge>;
    if (score > 0) return <Badge variant="secondary">Moderate Risk</Badge>;
    return <Badge variant="outline">Clean</Badge>;
  };

  // Prepare pie chart data
  const fakeVolumePercent = Math.min(data.totalFakeVolumePercent, 100);
  const legitimateVolumePercent = Math.max(100 - fakeVolumePercent, 0);
  
  const pieData = [
    { name: 'Fake Volume (Aged Wallets)', value: fakeVolumePercent, color: '#ef4444' },
    { name: 'Legitimate Volume', value: legitimateVolumePercent, color: '#22c55e' },
  ];

  const COLORS = ['#ef4444', '#22c55e'];

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Aged Wallet Detection
            </CardTitle>
            <CardDescription>
              Detects fake volume from pre-aged wallets
            </CardDescription>
          </div>
          {getRiskBadge(data.riskScore)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Fake Volume Risk Score</span>
          <span className={`text-2xl font-bold ${getRiskColor(data.riskScore)}`}>
            {data.riskScore}/100
          </span>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3 h-3" />
              Aged Wallets
            </div>
            <div className="text-xl font-bold">{data.agedWalletCount}</div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3 h-3" />
              Fake Volume %
            </div>
            <div className="text-xl font-bold">{data.totalFakeVolumePercent.toFixed(1)}%</div>
          </div>
        </div>

        {/* Volume Distribution Pie Chart */}
        {fakeVolumePercent > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PieChartIcon className="w-4 h-4 text-orange-500" />
              Volume Distribution
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pattern Detection */}
        {(data.patterns.sameFundingSource || data.patterns.similarAges || data.patterns.coordinatedBuys || data.patterns.noSells) && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Detected Patterns:</div>
            <div className="space-y-1.5">
              {data.patterns.sameFundingSource && (
                <div className="flex items-center gap-2 text-sm p-2 bg-red-500/10 rounded border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>Same funding source for multiple wallets</span>
                </div>
              )}
              {data.patterns.similarAges && (
                <div className="flex items-center gap-2 text-sm p-2 bg-orange-500/10 rounded border border-orange-500/20">
                  <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Wallets created around the same time</span>
                </div>
              )}
              {data.patterns.coordinatedBuys && (
                <div className="flex items-center gap-2 text-sm p-2 bg-orange-500/10 rounded border border-orange-500/20">
                  <TrendingUp className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Coordinated buying within narrow time window</span>
                </div>
              )}
              {data.patterns.noSells && (
                <div className="flex items-center gap-2 text-sm p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <Users className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span>Wallets only buy, never sell (fake holders)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Details */}
        {data.risks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Risk Details:</div>
            <div className="space-y-1">
              {data.risks.slice(0, 3).map((risk, idx) => (
                <div key={idx} className="text-xs text-muted-foreground p-2 bg-muted/50 rounded border border-border/50">
                  • {risk}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suspicious Wallets Sample */}
        {data.suspiciousWallets.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Sample Aged Wallets ({data.suspiciousWallets.length} total):
            </div>
            <div className="space-y-1.5">
              {data.suspiciousWallets.slice(0, 3).map((wallet, idx) => (
                <div key={idx} className="p-2 bg-muted/50 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <code className="text-xs text-muted-foreground">
                      {wallet.wallet.slice(0, 8)}...{wallet.wallet.slice(-6)}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {wallet.walletAge.toFixed(0)} days old
                    </Badge>
                  </div>
                  {wallet.hasOnlyBuys && (
                    <div className="text-orange-500 text-xs">⚠️ Only buys, no sells</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What This Means */}
        <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
          <div className="text-sm font-medium text-blue-400 mb-1">What This Means:</div>
          <p className="text-xs text-muted-foreground">
            Scammers create wallets months in advance, give them transaction history, then use them to buy their own token. This creates fake volume and tricks traders into thinking there's genuine interest. These aged wallets rarely sell.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
