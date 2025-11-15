import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle, XCircle } from "lucide-react";
import type { QuillCheckData } from "@shared/schema";

interface HoneypotDetectionCardProps {
  data: QuillCheckData | undefined;
}

export function HoneypotDetectionCard({ data }: HoneypotDetectionCardProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Honeypot Detection
          </CardTitle>
          <CardDescription>AI-powered sell simulation unavailable</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            QuillCheck data not available for this token
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = () => {
    if (data.isHoneypot || !data.canSell) return "destructive";
    if (data.sellTax > 15 || data.sellTax - data.buyTax > 5) return "destructive";
    if (data.liquidityRisk) return "destructive";
    if (data.sellTax > 10 || data.buyTax > 10) return "secondary";
    return "default";
  };

  const getStatusIcon = () => {
    if (data.isHoneypot || !data.canSell) return <XCircle className="h-6 w-6 text-destructive" />;
    if (data.sellTax > 15 || data.liquidityRisk) return <AlertTriangle className="h-6 w-6 text-destructive" />;
    if (data.sellTax > 10 || data.buyTax > 10) return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    return <CheckCircle className="h-6 w-6 text-green-500" />;
  };

  return (
    <Card className={data.isHoneypot || !data.canSell ? "border-destructive" : ""}>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {getStatusIcon()}
            <span className="truncate">Honeypot Detection</span>
          </CardTitle>
          <Badge variant={getSeverityColor()} className="self-start sm:self-auto whitespace-nowrap">
            Risk: {data.riskScore}/100
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">AI-powered sell simulation by QuillCheck</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Critical Alerts */}
        {data.isHoneypot && (
          <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive rounded-lg">
            <div className="flex items-center gap-2 font-bold text-destructive mb-2 text-sm sm:text-base">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>HONEYPOT DETECTED</span>
            </div>
            <p className="text-xs sm:text-sm">This token cannot be sold. Do not buy!</p>
          </div>
        )}

        {!data.isHoneypot && !data.canSell && (
          <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive rounded-lg">
            <div className="flex items-center gap-2 font-bold text-destructive mb-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Sell Restrictions Detected</span>
            </div>
            <p className="text-xs sm:text-sm">Selling may be disabled or restricted</p>
          </div>
        )}

        {data.liquidityRisk && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <div className="flex items-center gap-2 font-bold text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              Liquidity Drain Risk
            </div>
            <p className="text-sm">Contract owner can drain all liquidity</p>
          </div>
        )}

        {/* Tax Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Buy Tax</p>
            <p className="text-2xl font-bold">{data.buyTax}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Sell Tax</p>
            <p className={`text-2xl font-bold ${data.sellTax > 15 ? 'text-destructive' : data.sellTax > 10 ? 'text-yellow-500' : ''}`}>
              {data.sellTax}%
            </p>
          </div>
        </div>

        {/* Tax Asymmetry Warning */}
        {data.sellTax - data.buyTax > 5 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              ⚠️ Asymmetric Tax Structure
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sell tax is {(data.sellTax - data.buyTax).toFixed(1)}% higher than buy tax - classic honeypot indicator
            </p>
          </div>
        )}

        {/* Sell Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded">
          <span className="text-sm font-medium">Can Sell Tokens</span>
          {data.canSell ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Yes
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              No
            </Badge>
          )}
        </div>

        {/* Risk List */}
        {data.risks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Detected Risks:</p>
            <ul className="space-y-1">
              {data.risks.map((risk, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
