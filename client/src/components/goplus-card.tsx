import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, AlertTriangle, DollarSign, Lock, Code } from "lucide-react";
import type { GoPlusSecurityData } from "@shared/schema";

interface GoPlusCardProps {
  data: GoPlusSecurityData;
  tokenAddress: string;
}

export function GoPlusCard({ data, tokenAddress }: GoPlusCardProps) {
  const isHighRisk = data.is_scam === '1' || 
                     parseFloat(data.sell_tax) > 10 || 
                     data.securityRisks.length > 3;
  
  const isMediumRisk = data.securityRisks.length > 0 && !isHighRisk;

  const getRiskBadge = () => {
    if (isHighRisk) {
      return {
        variant: "destructive" as const,
        icon: <ShieldX className="h-4 w-4" />,
        text: "High Risk",
      };
    } else if (isMediumRisk) {
      return {
        variant: "secondary" as const,
        icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
        text: "Medium Risk",
      };
    } else {
      return {
        variant: "default" as const,
        icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
        text: "Low Risk",
      };
    }
  };

  const badge = getRiskBadge();
  const buyTax = parseFloat(data.buy_tax || '0');
  const sellTax = parseFloat(data.sell_tax || '0');

  return (
    <Card className="p-6" data-testid="card-goplus">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">GoPlus Security Scan</h3>
          <p className="text-sm text-muted-foreground">Honeypot & contract analysis</p>
        </div>
        <Badge variant={badge.variant} className="gap-1">
          {badge.icon}
          {badge.text}
        </Badge>
      </div>

      <div className="space-y-4">
        {data.is_scam === '1' && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <div className="flex items-start gap-2">
              <ShieldX className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-600">SCAM DETECTED</p>
                <p className="text-sm text-muted-foreground">This token has been flagged as malicious</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Mintable</span>
            </div>
            <div className="flex items-center gap-1 font-semibold" data-testid="goplus-mintable">
              <span>{data.is_mintable === '1' ? 'Yes' : 'No'}</span>
              {data.is_mintable === '1' ? (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Freezable</span>
            </div>
            <div className="flex items-center gap-1 font-semibold" data-testid="goplus-freezable">
              <span>{data.is_freezable === '1' ? 'Yes' : 'No'}</span>
              {data.is_freezable === '1' ? (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Buy Tax</span>
            </div>
            <div className="font-mono font-semibold" data-testid="goplus-buy-tax">
              {(typeof buyTax === 'number' ? buyTax.toFixed(2) : '0.00')}%
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Sell Tax</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-semibold" data-testid="goplus-sell-tax">
              <span>{(typeof sellTax === 'number' ? sellTax.toFixed(2) : '0.00')}%</span>
              {sellTax > 10 && <AlertTriangle className="h-4 w-4 text-orange-600" />}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Code className="h-4 w-4" />
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-1 font-semibold" data-testid="goplus-open-source">
              <span>{data.is_open_source === '1' ? 'Yes' : 'No'}</span>
              {data.is_open_source === '1' ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-1 font-semibold" data-testid="goplus-verified">
              <span>{data.is_true_token === '1' ? 'Yes' : 'No'}</span>
              {data.is_true_token === '1' ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              )}
            </div>
          </div>
        </div>

        {data.securityRisks && data.securityRisks.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Security Risks Detected:</p>
            <div className="space-y-1">
              {data.securityRisks.map((risk, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`goplus-risk-${index}`}
                >
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.securityRisks.length === 0 && data.is_scam !== '1' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-md">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-medium">No major security risks detected</span>
          </div>
        )}

        <div className="pt-2 border-t">
          <a
            href={`https://gopluslabs.io/token-security/solana/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            data-testid="link-goplus"
          >
            View full report on GoPlus
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </Card>
  );
}
