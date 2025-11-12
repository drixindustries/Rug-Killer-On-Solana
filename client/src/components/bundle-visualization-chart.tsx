import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { HolderFilteringMetadata } from "@shared/schema";
import { Users, Droplet, Building2, Network, AlertTriangle } from "lucide-react";

interface BundleVisualizationChartProps {
  filtering: HolderFilteringMetadata;
  totalHolders: number;
}

export function BundleVisualizationChart({ filtering, totalHolders }: BundleVisualizationChartProps) {
  // Clamp to prevent negative values when totalHolders is low
  const legitHolders = Math.max(totalHolders - filtering.totals.total, 0);

  const data = [
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

  return (
    <Card data-testid="card-bundle-visualization">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle>Holder Distribution Analysis</CardTitle>
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
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>

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
