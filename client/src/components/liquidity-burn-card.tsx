import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

interface LiquidityBurnCardProps {
  burnPercentage: number;
  lpMintAddress?: string;
  lpReserve?: number;
  actualSupply?: number;
  isBurned: boolean;
}

export function LiquidityBurnCard({ 
  burnPercentage, 
  lpMintAddress, 
  lpReserve,
  actualSupply,
  isBurned 
}: LiquidityBurnCardProps) {
  const getBurnStatus = () => {
    if (isBurned || burnPercentage >= 99.99) {
      return {
        badge: (
          <Badge className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            100% Burned
          </Badge>
        ),
        icon: <Flame className="h-8 w-8 text-green-600" />,
        color: "text-green-600",
        progressColor: "bg-green-600",
        status: "SAFE",
        message: "Liquidity is permanently locked. Creator cannot withdraw funds.",
      };
    } else if (burnPercentage >= 90) {
      return {
        badge: (
          <Badge variant="secondary" className="gap-1 text-yellow-600">
            <AlertTriangle className="h-3 w-3" />
            Partially Burned
          </Badge>
        ),
        icon: <Flame className="h-8 w-8 text-yellow-600" />,
        color: "text-yellow-600",
        progressColor: "bg-yellow-600",
        status: "CAUTION",
        message: "Most LP tokens burned, but some remain in circulation.",
      };
    } else {
      return {
        badge: (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not Burned
          </Badge>
        ),
        icon: <Flame className="h-8 w-8 text-red-600" />,
        color: "text-red-600",
        progressColor: "bg-red-600",
        status: "HIGH RISK",
        message: "Creator can withdraw liquidity at any time. High rug pull risk!",
      };
    }
  };

  const status = getBurnStatus();

  return (
    <Card className="p-6" data-testid="card-liquidity-burn">
      <div className="flex items-start justify-between mb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Liquidity Pool Burn Status
          </CardTitle>
          <CardDescription>Verifies if LP tokens have been permanently burned</CardDescription>
        </div>
        {status.badge}
      </div>

      <div className="space-y-6">
        {/* Burn Percentage Display */}
        <div className="flex items-center justify-center py-6">
          {status.icon}
          <div className="ml-6 flex-1">
            <div className={`text-5xl font-bold ${status.color}`} data-testid="text-burn-percentage">
              {(typeof burnPercentage === 'number' ? burnPercentage.toFixed(2) : '0.00')}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              LP Tokens Burned
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={Math.min(burnPercentage, 100)} 
            className="h-3"
            data-testid="progress-burn"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="font-semibold">100% Burn = Locked Forever</span>
          </div>
        </div>

        {/* Status Message */}
        <div className={`p-4 rounded-md ${
          isBurned 
            ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900" 
            : burnPercentage >= 90
            ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"
            : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
        }`}>
          <div className="flex items-start gap-2">
            {isBurned ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : burnPercentage >= 90 ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`font-semibold ${status.color}`} data-testid="text-burn-status">
                {status.status}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {status.message}
              </p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        {(lpReserve !== undefined || actualSupply !== undefined) && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-semibold">Technical Details:</p>
            {lpReserve !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">LP Reserve:</span>
                <span className="font-mono" data-testid="text-lp-reserve">
                  {lpReserve.toLocaleString()}
                </span>
              </div>
            )}
            {actualSupply !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actual Supply:</span>
                <span className="font-mono" data-testid="text-actual-supply">
                  {actualSupply.toLocaleString()}
                </span>
              </div>
            )}
            {lpMintAddress && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">LP Mint Address:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                    {lpMintAddress.slice(0, 8)}...{lpMintAddress.slice(-8)}
                  </code>
                  <a
                    href={`https://solscan.io/token/${lpMintAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                    data-testid="link-lp-mint"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explanation */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-semibold">What does this mean?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>100% Burned:</strong> Liquidity permanently locked, cannot be withdrawn</li>
            <li><strong>Partially Burned:</strong> Some LP tokens still exist, partial rug risk</li>
            <li><strong>Not Burned:</strong> Creator can remove liquidity at any time</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

export default LiquidityBurnCard;
