/**
 * Honeypot Detection Card Component
 * Displays comprehensive honeypot risk grading with detected evasion techniques
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { HoneypotDetectionResult } from "@/../../shared/schema";

interface HoneypotCardProps {
  data: HoneypotDetectionResult;
}

export function HoneypotCard({ data }: HoneypotCardProps) {
  // Grade styling
  const getGradeConfig = (grade: HoneypotDetectionResult["grade"]) => {
    switch (grade) {
      case "CRITICAL":
        return {
          icon: ShieldAlert,
          color: "text-red-500",
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-500",
          badgeVariant: "destructive" as const,
          label: "CRITICAL RISK",
          emoji: "🚨🍯",
        };
      case "DANGER":
        return {
          icon: ShieldAlert,
          color: "text-orange-500",
          bgColor: "bg-orange-50 dark:bg-orange-950",
          borderColor: "border-orange-500",
          badgeVariant: "destructive" as const,
          label: "HIGH RISK",
          emoji: "⚠️🍯",
        };
      case "WARNING":
        return {
          icon: AlertTriangle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          borderColor: "border-yellow-500",
          badgeVariant: "default" as const,
          label: "MODERATE RISK",
          emoji: "⚠️🍯",
        };
      case "CAUTION":
        return {
          icon: AlertCircle,
          color: "text-blue-500",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-500",
          badgeVariant: "secondary" as const,
          label: "LOW RISK",
          emoji: "🟡🍯",
        };
      case "SAFE":
        return {
          icon: ShieldCheck,
          color: "text-green-500",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-500",
          badgeVariant: "default" as const,
          label: "SAFE",
          emoji: "✅🍯",
        };
    }
  };

  const config = getGradeConfig(data.grade);
  const Icon = config.icon;

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-600 dark:text-red-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 20) return "text-blue-600 dark:text-blue-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <Card className={`${config.bgColor} border-2 ${config.borderColor}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <span className={config.color}>
              {config.emoji} Honeypot Detection
            </span>
          </CardTitle>
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Risk Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
              {data.score}/100
            </span>
          </div>
          <Progress value={data.score} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Confidence: {data.confidence}% • 0 = Safe, 100 = Definite Honeypot
          </p>
        </div>

        {/* Sell/Buy/Transfer Status */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1 text-sm">
            {data.canBuy ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={data.canBuy ? "text-green-600" : "text-red-600"}>
              Can Buy
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {data.canSell ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={data.canSell ? "text-green-600" : "text-red-600"}>
              Can Sell
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {data.canTransfer ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span
              className={data.canTransfer ? "text-green-600" : "text-red-600"}
            >
              Can Transfer
            </span>
          </div>
        </div>

        {/* Tax Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" />
            Tax Analysis
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Buy Tax:</span>{" "}
              <span className="font-semibold">{data.taxes.buyTax}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sell Tax:</span>{" "}
              <span className="font-semibold">{data.taxes.sellTax}%</span>
            </div>
            {data.taxes.transferTax > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Transfer Tax:</span>{" "}
                <span className="font-semibold">{data.taxes.transferTax}%</span>
              </div>
            )}
            {data.taxes.isVariable && (
              <div className="col-span-2">
                <Badge variant="destructive" className="text-xs">
                  ⚠️ Variable Taxes Detected
                </Badge>
              </div>
            )}
            {data.taxes.maxObservedTax > data.taxes.sellTax && (
              <div className="col-span-2 text-xs text-red-600">
                Max Observed: {data.taxes.maxObservedTax}%
              </div>
            )}
          </div>
        </div>

        {/* Detection Methods Results */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Detection Tests
          </h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(data.detectionMethods).map(([method, result]) => {
              const methodLabel = method
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .replace("Test", "");
              return (
                <div key={method} className="flex items-center gap-1">
                  {result === "PASS" ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : result === "FAIL" ? (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Info className="h-3 w-3 text-gray-400" />
                  )}
                  <span className="text-muted-foreground">{methodLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detected Evasion Techniques */}
        {data.evasionTechniques.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              🚨 Detected Evasion Techniques
            </h4>
            <div className="space-y-2">
              {data.evasionTechniques.slice(0, 5).map((tech) => {
                const severityColor =
                  tech.severity === "critical"
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : tech.severity === "high"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      : tech.severity === "medium"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";

                const severityEmoji =
                  tech.severity === "critical"
                    ? "🔴"
                    : tech.severity === "high"
                      ? "🟠"
                      : tech.severity === "medium"
                        ? "🟡"
                        : "🔵";

                return (
                  <div
                    key={tech.id}
                    className={`p-2 rounded-md ${severityColor}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs">{severityEmoji}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{tech.name}</p>
                        <p className="text-xs opacity-80 mt-1">
                          {tech.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.evasionTechniques.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ... and {data.evasionTechniques.length - 5} more techniques
                </p>
              )}
            </div>
          </div>
        )}

        {/* Risks & Warnings */}
        {data.risks.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
              ⚠️ Critical Risks
            </h4>
            {data.risks.map((risk, idx) => (
              <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                • {risk}
              </p>
            ))}
          </div>
        )}

        {data.warnings.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              ⚠️ Warnings
            </h4>
            {data.warnings.map((warning, idx) => (
              <p
                key={idx}
                className="text-xs text-yellow-600 dark:text-yellow-400"
              >
                • {warning}
              </p>
            ))}
          </div>
        )}

        {/* Last Checked */}
        <p className="text-xs text-muted-foreground text-right">
          Last checked:{" "}
          {new Date(data.lastChecked).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </CardContent>
    </Card>
  );
}

export default HoneypotCard;
