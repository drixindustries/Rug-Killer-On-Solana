import { Card } from "@/components/ui/card";
import { AlertTriangle, Lock, Shield, Droplet } from "lucide-react";
import type { RiskFlag } from "@shared/schema";

interface CriticalAlertsProps {
  redFlags: RiskFlag[];
}

export function CriticalAlerts({ redFlags }: CriticalAlertsProps) {
  if (redFlags.length === 0) {
    return (
      <Card className="p-6" data-testid="card-no-alerts">
        <div className="flex items-center gap-3 text-green-600">
          <Shield className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">No Critical Alerts</h3>
            <p className="text-sm text-muted-foreground">All major security checks passed</p>
          </div>
        </div>
      </Card>
    );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "mint_authority":
        return <AlertTriangle className="h-5 w-5" />;
      case "freeze_authority":
        return <Lock className="h-5 w-5" />;
      case "low_liquidity":
        return <Droplet className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 dark:bg-red-950/20";
      case "high":
        return "text-orange-600 bg-orange-50 dark:bg-orange-950/20";
      case "medium":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20";
      default:
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold mb-4">Critical Alerts</h2>
      {redFlags.map((flag, index) => (
        <Card
          key={index}
          className={`p-4 ${getSeverityColor(flag.severity)}`}
          data-testid={`alert-${flag.type}`}
        >
          <div className="flex items-start gap-3">
            {getIconForType(flag.type)}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm" data-testid={`text-alert-title-${index}`}>
                {flag.title}
              </h3>
              <p className="text-sm mt-1 opacity-90" data-testid={`text-alert-description-${index}`}>
                {flag.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
