import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { HolderInfo } from "@shared/schema";

interface HolderDistributionChartProps {
  holders: HolderInfo[];
  totalConcentration: number;
}

export function HolderDistributionChart({ holders, totalConcentration }: HolderDistributionChartProps) {
  const top10 = holders.slice(0, 10);

  const chartData = top10.map((holder) => ({
    name: `${holder.address.slice(0, 4)}...${holder.address.slice(-4)}`,
    percentage: holder.percentage,
    rank: holder.rank,
  }));

  const getBarColor = (percentage: number) => {
    if (percentage > 15) return "hsl(var(--destructive))";
    if (percentage > 10) return "hsl(var(--chart-4))";
    if (percentage > 5) return "hsl(var(--chart-2))";
    return "hsl(var(--primary))";
  };

  return (
    <Card className="p-6" data-testid="card-holder-distribution">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Holder Distribution</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Top 10 holders control <span className="font-semibold text-foreground">{(typeof totalConcentration === 'number' ? totalConcentration.toFixed(1) : '0.0')}%</span> of total supply
          </p>
        </div>

        <div className="w-full h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 40, left: 100, bottom: 20 }}
              barGap={8}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                type="number" 
                domain={[0, 'auto']}
                label={{ value: '% of Total Supply', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Percentage']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--primary))" }} />
            <span className="text-muted-foreground">&lt;5%: Low concentration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
            <span className="text-muted-foreground">5-10%: Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
            <span className="text-muted-foreground">10-15%: High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }} />
            <span className="text-muted-foreground">&gt;15%: Critical</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
