import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Package, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import type { JitoBundleData } from "@shared/schema";

interface JitoBundleCardProps {
  data: JitoBundleData;
}

export function JitoBundleCard({ data }: JitoBundleCardProps) {
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "HIGH":
        return <Badge variant="destructive">HIGH CONFIDENCE</Badge>;
      case "MEDIUM":
        return <Badge className="bg-yellow-500">MEDIUM</Badge>;
      case "LOW":
        return <Badge variant="secondary">LOW</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "FINALIZED":
      case "PROCESSED":
        return "text-green-500";
      case "ACCEPTED":
        return "text-yellow-500";
      case "REJECTED":
      case "DROPPED":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  // Clean state when no bundle detected
  if (!data.isBundle || data.confidence === 'LOW') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Jito Bundle Detection
          </CardTitle>
          <CardDescription>MEV bundle analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">No Jito Bundle Detected</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Token does not appear to have been launched via Jito MEV bundle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={data.confidence === "HIGH" ? "border-red-500/50" : "border-yellow-500/50"}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Jito Bundle Detected
            </CardTitle>
            <CardDescription>
              MEV bundle launch analysis
            </CardDescription>
          </div>
          {getConfidenceBadge(data.confidence)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bundle Status */}
        {data.status && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Bundle Status</span>
            <span className={`font-bold ${getStatusColor(data.status)}`}>
              {data.status}
            </span>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {data.tipAmountSol !== undefined && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="w-3 h-3" />
                Tip Amount
              </div>
              <div className="text-xl font-bold">{data.tipAmountSol.toFixed(4)} SOL</div>
            </div>
          )}

          {data.bundleActivity && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Package className="w-3 h-3" />
                Bundle Count
              </div>
              <div className="text-xl font-bold">{data.bundleActivity.bundleCount}</div>
            </div>
          )}
        </div>

        {/* Detection Signals */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Detection Signals:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded">
              {data.signals.hasJitoTip ? <XCircle className="w-3 h-3 text-red-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
              <span>Jito Tip: {data.signals.hasJitoTip ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded">
              {data.signals.tipAccountMatch ? <XCircle className="w-3 h-3 text-red-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
              <span>Tip Account: {data.signals.tipAccountMatch ? 'Match' : 'No'}</span>
            </div>
            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded">
              {data.signals.consecutiveTxsInSlot ? <XCircle className="w-3 h-3 text-yellow-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
              <span>Consecutive Txs: {data.signals.consecutiveTxsInSlot ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded">
              {data.signals.highPriorityFee ? <XCircle className="w-3 h-3 text-yellow-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
              <span>High Priority: {data.signals.highPriorityFee ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Bundle ID */}
        {data.bundleId && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Bundle ID:</div>
            <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
              {data.bundleId}
            </code>
          </div>
        )}

        {/* Slot Info */}
        {data.slotLanded && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Landed in slot: {data.slotLanded.toLocaleString()}</span>
          </div>
        )}

        {/* What This Means */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <div className="text-sm font-medium mb-1 text-yellow-400">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            What This Means:
          </div>
          <p className="text-xs text-muted-foreground">
            This token was launched using a Jito MEV bundle. Developers use bundles to atomically execute multiple 
            transactions (create token + add liquidity + snipe) in a single block. This can indicate coordinated 
            launch manipulation where insiders get priority access before retail traders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default JitoBundleCard;
