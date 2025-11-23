import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, DollarSign, Users, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { AgedWalletData } from "@shared/schema";

interface AgedWalletDetectionCardProps {
  data: AgedWalletData;
}

export function AgedWalletDetectionCard({ data }: AgedWalletDetectionCardProps) {
  // Calculate Safety Score (100 = safe/good, 0 = risky/bad) - inverse of risk score
  const safetyScore = Math.max(0, Math.min(100, 100 - data.riskScore));
  
  const getSafetyColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-lime-500";
    if (score >= 40) return "text-yellow-500";
    if (score >= 20) return "text-orange-500";
    return "text-red-500";
  };

  const getSafetyBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-lime-500">Good</Badge>;
    if (score >= 40) return <Badge variant="secondary">Fair</Badge>;
    if (score >= 20) return <Badge className="bg-orange-500">Poor</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  // Analyze wallet age distribution
  const now = Date.now();
  const walletAgeGroups = {
    bundled: { count: 0, percentage: 0 }, // Jito bundle wallets (<400ms timing)
    veryOld: { count: 0, percentage: 0 }, // >400 days (suspicious aged wallets)
    old: { count: 0, percentage: 0 }, // 90-400 days
    moderate: { count: 0, percentage: 0 }, // 30-90 days
    new: { count: 0, percentage: 0 }, // <30 days (legitimate)
  };

  // Categorize suspicious wallets by age
  data.suspiciousWallets.forEach(wallet => {
    const ageDays = wallet.walletAge;
    if (ageDays > 400) {
      walletAgeGroups.veryOld.count++;
    } else if (ageDays > 90) {
      walletAgeGroups.old.count++;
    } else if (ageDays > 30) {
      walletAgeGroups.moderate.count++;
    } else {
      walletAgeGroups.new.count++;
    }
  });

  // Calculate percentages
  const totalWallets = data.suspiciousWallets.length || 1;
  Object.keys(walletAgeGroups).forEach(key => {
    walletAgeGroups[key as keyof typeof walletAgeGroups].percentage = 
      (walletAgeGroups[key as keyof typeof walletAgeGroups].count / totalWallets) * 100;
  });

  // Prepare enhanced pie chart data with age groups
  const pieData = [
    { name: 'Aged Wallets (>400d)', value: walletAgeGroups.veryOld.percentage, color: '#dc2626', count: walletAgeGroups.veryOld.count },
    { name: 'Old Wallets (90-400d)', value: walletAgeGroups.old.percentage, color: '#f97316', count: walletAgeGroups.old.count },
    { name: 'Moderate (30-90d)', value: walletAgeGroups.moderate.percentage, color: '#eab308', count: walletAgeGroups.moderate.count },
    { name: 'New Wallets (<30d)', value: walletAgeGroups.new.percentage, color: '#22c55e', count: walletAgeGroups.new.count },
  ].filter(item => item.value > 0);

  const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e'];

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
          {getSafetyBadge(safetyScore)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety Score */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Wallet Ages Safety Score</span>
          <span className={`text-2xl font-bold ${getSafetyColor(safetyScore)}`}>
            {safetyScore}/100
          </span>
        </div>
        <div className="text-xs text-muted-foreground text-center -mt-2">
          100 = Safe (no aged wallets) • 0 = Critical (high fake volume)
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
            <div className="text-xl font-bold">{(typeof data.totalFakeVolumePercent === 'number' ? data.totalFakeVolumePercent.toFixed(1) : '0.0')}%</div>
          </div>
        </div>

        {/* Wallet Age Distribution Pie Chart */}
        {data.suspiciousWallets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PieChartIcon className="w-4 h-4 text-orange-500" />
              📦 Wallet Age Distribution (Bundle Analysis)
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count, percent }) => `${name}: ${count} wallets (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${props.payload.count} wallets (${value.toFixed(1)}%)`,
                      name
                    ]}
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
                      {(typeof wallet.walletAge === 'number' ? wallet.walletAge.toFixed(0) : '0')} days old
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
        <div className={`p-3 rounded border ${safetyScore >= 80 ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <div className={`text-sm font-medium mb-1 ${safetyScore >= 80 ? 'text-green-400' : 'text-blue-400'}`}>
            {safetyScore >= 80 ? '✅ Good News:' : '📦 What This Means:'}
          </div>
          <p className="text-xs text-muted-foreground">
            {safetyScore >= 80 
              ? 'No aged wallet manipulation or bundle detected. The token\'s volume appears to be from legitimate traders with natural wallet ages.'
              : 'Scammers create wallets months in advance, give them transaction history, then use Jito bundles (coordinated atomic transactions within 400ms) to buy their own token. This creates fake volume and tricks traders into thinking there\'s genuine interest. These aged wallets rarely sell.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
