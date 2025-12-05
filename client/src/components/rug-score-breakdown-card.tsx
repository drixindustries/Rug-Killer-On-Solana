import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Shield, Lock, Users, Droplets, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import type { RugScoreBreakdown } from "@shared/schema";

interface RugScoreBreakdownCardProps {
  data: RugScoreBreakdown;
}

export function RugScoreBreakdownCard({ data }: RugScoreBreakdownCardProps) {
  const getScoreColor = (score: number) => {
    if (score < 10) return "text-green-500";
    if (score < 30) return "text-lime-500";
    if (score < 50) return "text-yellow-500";
    if (score < 70) return "text-orange-500";
    return "text-red-500";
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case "SAFE":
        return <Badge className="bg-green-500">SAFE</Badge>;
      case "WARNING":
        return <Badge className="bg-yellow-500">WARNING</Badge>;
      case "DANGER":
        return <Badge variant="destructive">DANGER</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case "authorities":
        return <Lock className="w-4 h-4" />;
      case "holderDistribution":
        return <Users className="w-4 h-4" />;
      case "liquidity":
        return <Droplets className="w-4 h-4" />;
      case "taxesAndFees":
        return <TrendingUp className="w-4 h-4" />;
      case "marketActivity":
        return <TrendingUp className="w-4 h-4" />;
      case "tokenAge":
        return <Clock className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const componentLabels: Record<string, string> = {
    authorities: "Authorities",
    holderDistribution: "Holder Distribution",
    liquidity: "Liquidity",
    taxesAndFees: "Taxes & Fees",
    marketActivity: "Market Activity",
    tokenAge: "Token Age",
  };

  return (
    <Card className={data.classification === "DANGER" ? "border-red-500/50" : data.classification === "WARNING" ? "border-yellow-500/50" : "border-green-500/50"}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Rug Score Breakdown (SolRPDS)
            </CardTitle>
            <CardDescription>
              Professional rug pull risk analysis
            </CardDescription>
          </div>
          {getClassificationBadge(data.classification)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Total Rug Score</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(data.totalScore)}`}>
              {data.totalScore}
            </span>
            <span className="text-xs text-muted-foreground">/100+</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center -mt-2">
          &lt;10 = Safe • 10-50 = Warning • &gt;50 = Danger
        </div>

        {/* Score Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={Math.min(data.totalScore, 100)} 
            className={`h-2 ${data.totalScore >= 50 ? '[&>div]:bg-red-500' : data.totalScore >= 10 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
          />
        </div>

        {/* Component Breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Component Breakdown:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(data.components).map(([key, component]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <div className="flex items-center gap-2">
                  {getComponentIcon(key)}
                  <span>{componentLabels[key] || key}</span>
                </div>
                <span className={`font-medium ${component.score > 20 ? 'text-red-500' : component.score > 10 ? 'text-yellow-500' : 'text-green-500'}`}>
                  +{component.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Authorities Details */}
        {data.components.authorities && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Authority Details
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 p-2 bg-muted/30 rounded">
                {data.components.authorities.mintAuthority > 0 ? <XCircle className="w-3 h-3 text-red-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
                <span>Mint: {data.components.authorities.mintAuthority > 0 ? 'Active' : 'Revoked'}</span>
              </div>
              <div className="flex items-center gap-1 p-2 bg-muted/30 rounded">
                {data.components.authorities.freezeAuthority > 0 ? <XCircle className="w-3 h-3 text-red-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
                <span>Freeze: {data.components.authorities.freezeAuthority > 0 ? 'Active' : 'Revoked'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown List */}
        {data.breakdown && data.breakdown.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Issues Detected:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {data.breakdown.slice(0, 5).map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-red-500/10 rounded border border-red-500/20">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  <span>{issue}</span>
                </div>
              ))}
              {data.breakdown.length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{data.breakdown.length - 5} more issues
                </div>
              )}
            </div>
          </div>
        )}

        {/* What This Means */}
        <div className={`p-3 rounded border ${data.classification === 'SAFE' ? 'bg-green-500/10 border-green-500/20' : data.classification === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className={`text-sm font-medium mb-1 ${data.classification === 'SAFE' ? 'text-green-400' : data.classification === 'WARNING' ? 'text-yellow-400' : 'text-red-400'}`}>
            {data.classification === 'SAFE' ? '✅ Low Rug Risk' : data.classification === 'WARNING' ? '⚠️ Moderate Risk' : '🚨 High Rug Risk'}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.classification === 'SAFE' 
              ? 'This token passes most security checks. Authority revocations and holder distribution look healthy.'
              : data.classification === 'WARNING'
              ? 'Some concerning factors detected. Review the breakdown above before investing.'
              : 'Multiple high-risk factors detected. Exercise extreme caution - high probability of rug pull.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default RugScoreBreakdownCard;
