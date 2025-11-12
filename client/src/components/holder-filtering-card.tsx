import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Filter, Info } from "lucide-react";
import { useState } from "react";
import type { HolderFilteringMetadata } from "@shared/schema";

interface HolderFilteringCardProps {
  filtering: HolderFilteringMetadata;
}

export function HolderFilteringCard({ filtering }: HolderFilteringCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getCategoryBadgeVariant = (count: number) => {
    if (count === 0) return "outline" as const;
    if (count >= 10) return "destructive" as const;
    return "secondary" as const;
  };

  const getConfidenceBadgeVariant = (confidence: 'low' | 'medium' | 'high') => {
    if (confidence === 'high') return "destructive" as const;
    if (confidence === 'medium') return "default" as const;
    return "outline" as const;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lp': return 'Liquidity Pool';
      case 'exchange': return 'Exchange';
      case 'protocol': return 'DeFi Protocol';
      case 'bundled': return 'Bundled Wallet';
      default: return type;
    }
  };

  const totalFiltered = filtering.totals.total;

  return (
    <Card data-testid="card-holder-filtering">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Holder Filtering
            </CardTitle>
            <CardDescription>
              {totalFiltered} {totalFiltered === 1 ? 'address' : 'addresses'} excluded from concentration calculations
            </CardDescription>
          </div>
          {totalFiltered > 0 && (
            <Badge variant={totalFiltered >= 20 ? "destructive" : "secondary"} data-testid="badge-total-filtered">
              {totalFiltered}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid="filter-category-lp">
            <span className="text-sm text-muted-foreground">LP Addresses</span>
            <Badge variant={getCategoryBadgeVariant(filtering.totals.lp)}>
              {filtering.totals.lp}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid="filter-category-exchanges">
            <span className="text-sm text-muted-foreground">Exchanges</span>
            <Badge variant={getCategoryBadgeVariant(filtering.totals.exchanges)}>
              {filtering.totals.exchanges}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid="filter-category-protocols">
            <span className="text-sm text-muted-foreground">Protocols</span>
            <Badge variant={getCategoryBadgeVariant(filtering.totals.protocols)}>
              {filtering.totals.protocols}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid="filter-category-bundled">
            <span className="text-sm text-muted-foreground">Bundled</span>
            <Badge variant={getCategoryBadgeVariant(filtering.totals.bundled)}>
              {filtering.totals.bundled}
            </Badge>
          </div>
        </div>

        {/* Bundle Detection Info */}
        {filtering.bundledDetection && filtering.totals.bundled > 0 && (
          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
            <Info className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Bundle Detection</span>
                <Badge variant={getConfidenceBadgeVariant(filtering.bundledDetection.confidence)} className="text-xs">
                  {filtering.bundledDetection.confidence} confidence
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {filtering.bundledDetection.details}
              </p>
              <p className="text-xs text-muted-foreground">
                Strategy: {filtering.bundledDetection.strategy}
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            These addresses are automatically excluded from top holder concentration calculations to provide more accurate whale analysis.
          </p>
        </div>

        {/* Expandable Address List */}
        {totalFiltered > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" data-testid="button-toggle-filtered-addresses">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              <span>View {totalFiltered} filtered {totalFiltered === 1 ? 'address' : 'addresses'}</span>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtering.excluded.map((addr, index) => (
                  <div 
                    key={index}
                    className="flex items-start justify-between gap-2 p-2 bg-muted rounded-md text-xs"
                    data-testid={`filtered-address-${index}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <code className="font-mono text-xs break-all">
                        {addr.address}
                      </code>
                      {addr.label && (
                        <p className="text-muted-foreground">{addr.label}</p>
                      )}
                      <p className="text-muted-foreground italic">{addr.reason}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {getTypeLabel(addr.type)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
