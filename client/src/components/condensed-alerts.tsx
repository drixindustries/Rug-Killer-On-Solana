import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldX, AlertOctagon, Info } from "lucide-react";
import type { RiskFlag } from "@shared/schema";

interface CondensedAlertsProps {
  redFlags: RiskFlag[];
  className?: string;
}

export function CondensedAlerts({ redFlags, className = "" }: CondensedAlertsProps) {
  if (redFlags.length === 0) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <ShieldX className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">No Critical Issues Detected</h3>
              <p className="text-sm text-green-600">Token appears to have standard configuration</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalFlags = redFlags.filter(f => f.severity === "critical");
  const highFlags = redFlags.filter(f => f.severity === "high");
  const mediumFlags = redFlags.filter(f => f.severity === "medium");

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <ShieldX className="h-4 w-4 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <AlertOctagon className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50 text-red-800";
      case "high":
        return "border-orange-200 bg-orange-50 text-orange-800";
      case "medium":
        return "border-yellow-200 bg-yellow-50 text-yellow-800";
      default:
        return "border-blue-200 bg-blue-50 text-blue-800";
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary Banner */}
      {criticalFlags.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <ShieldX className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">⚠️ High Risk Token</h3>
                <p className="text-sm text-red-600">
                  {criticalFlags.length} critical issue{criticalFlags.length !== 1 ? 's' : ''} detected. 
                  Proceed with extreme caution.
                </p>
              </div>
              <div className="text-right">
                <Badge variant="destructive" className="mb-1">
                  {redFlags.length} total flags
                </Badge>
                <div className="text-xs text-red-600">
                  {criticalFlags.length}C • {highFlags.length}H • {mediumFlags.length}M
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Issues - Always show if present */}
      {criticalFlags.length > 0 && (
        <div className="space-y-2">
          {criticalFlags.map((flag, index) => (
            <Card key={index} className={`border-l-4 border-l-red-500 ${getSeverityColor(flag.severity)}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(flag.severity)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight">{flag.title}</h4>
                    <p className="text-xs mt-1 text-muted-foreground line-clamp-2">
                      {flag.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {flag.severity.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Condensed High/Medium Issues */}
      {(highFlags.length > 0 || mediumFlags.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Additional Concerns ({highFlags.length + mediumFlags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {/* High priority issues */}
              {highFlags.slice(0, 2).map((flag, index) => (
                <div key={`high-${index}`} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-orange-800">{flag.title}</span>
                    <p className="text-xs text-orange-600 line-clamp-1">{flag.description}</p>
                  </div>
                </div>
              ))}
              
              {/* Show remaining count if there are more */}
              {(highFlags.length > 2 || mediumFlags.length > 0) && (
                <div className="text-xs text-orange-600 pt-1 border-t border-orange-200">
                  {highFlags.length > 2 && `+${highFlags.length - 2} more high risk issues`}
                  {(highFlags.length > 2 && mediumFlags.length > 0) && " • "}
                  {mediumFlags.length > 0 && `${mediumFlags.length} medium risk issue${mediumFlags.length !== 1 ? 's' : ''}`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CondensedAlerts;