import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { RiskLevel } from "@shared/schema";

interface RiskScoreCardProps {
  score: number;
  riskLevel: RiskLevel;
  redFlagsCount: number;
  analyzedAt: number;
}

export function RiskScoreCard({ score, riskLevel, redFlagsCount, analyzedAt }: RiskScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);

  const safeScore = isNaN(score) || !isFinite(score) ? 100 : Math.min(100, Math.max(0, score));

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = safeScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= safeScore) {
        setDisplayScore(safeScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [safeScore]);

  const getRiskColor = () => {
    switch (riskLevel) {
      case "LOW":
        return "text-green-600";
      case "MODERATE":
        return "text-yellow-600";
      case "HIGH":
        return "text-orange-600";
      case "EXTREME":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case "LOW":
        return <ShieldCheck className="h-12 w-12 text-green-600" />;
      case "MODERATE":
        return <ShieldAlert className="h-12 w-12 text-yellow-600" />;
      case "HIGH":
        return <AlertTriangle className="h-12 w-12 text-orange-600" />;
      case "EXTREME":
        return <ShieldX className="h-12 w-12 text-red-600" />;
    }
  };

  const getProgressColor = () => {
    // REVERSED: 70-100 (green), 40-70 (yellow), 20-40 (orange), 0-20 (red)
    if (safeScore >= 70) return "bg-green-600";
    if (safeScore >= 40) return "bg-yellow-600";
    if (safeScore >= 20) return "bg-orange-600";
    return "bg-red-600";
  };

  const safeAnalyzedAt = isNaN(analyzedAt) || !isFinite(analyzedAt) || analyzedAt === 0 
    ? Date.now() 
    : analyzedAt;

  return (
    <Card className="p-8" data-testid="card-risk-score">
      <div className="flex flex-col items-center text-center space-y-6">
        {getRiskIcon()}
        
        <div className="space-y-2">
          <div className={`text-6xl font-bold ${getRiskColor()}`} data-testid="text-risk-score">
            {displayScore}
          </div>
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            Risk Score (0-100)
          </div>
        </div>

        <div className="w-full max-w-md">
          <Progress 
            value={displayScore} 
            className="h-2" 
            data-testid="progress-risk-score"
          />
        </div>

        <div className="space-y-1">
          <div className={`text-2xl font-semibold ${getRiskColor()}`} data-testid="text-risk-level">
            {riskLevel} RISK
          </div>
          <div className="text-sm text-muted-foreground" data-testid="text-red-flags">
            {redFlagsCount}/10 red flags detected
          </div>
        </div>

        <div className="text-xs text-muted-foreground" data-testid="text-analyzed-at">
          Analyzed {new Date(safeAnalyzedAt).toLocaleString()}
        </div>
      </div>
    </Card>
  );
}
