import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Globe, FileText, AlertCircle, CheckCircle } from "lucide-react";
import type { TokenMetadata } from "@shared/schema";

interface TokenMetadataCardProps {
  metadata?: TokenMetadata;
  tokenAddress: string;
}

export function TokenMetadataCard({ metadata, tokenAddress }: TokenMetadataCardProps) {
  if (!metadata) {
    return (
      <Card className="p-6" data-testid="card-token-metadata">
        <h2 className="text-xl font-semibold mb-4">Token Metadata</h2>
        <p className="text-sm text-muted-foreground">Metadata unavailable</p>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-token-metadata">
      <h2 className="text-xl font-semibold mb-4">Token Metadata</h2>
      
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-border bg-muted flex items-center justify-center flex-shrink-0">
            {metadata?.logoUri ? (
              <img 
                src={metadata.logoUri} 
                alt={metadata.name || "Token"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Coins className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold" data-testid="text-token-name">
              {metadata?.name || "Unknown Token"}
            </h3>
            <p className="text-sm text-muted-foreground font-mono" data-testid="text-token-symbol">
              ${metadata?.symbol || "???"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata?.hasMetadata ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Has Metadata
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No Metadata
                </Badge>
              )}
              
              {metadata?.isMutable && (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
                  <AlertCircle className="h-3 w-3" />
                  Mutable
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Token Address</span>
            <span className="text-sm font-mono" data-testid="text-token-address">
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-6)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Decimals</span>
            <span className="text-sm font-semibold" data-testid="text-token-decimals">
              {metadata?.decimals || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Supply</span>
            <span className="text-sm font-semibold" data-testid="text-token-supply">
              {metadata?.supply && metadata?.decimals 
                ? (metadata.supply / Math.pow(10, metadata.decimals)).toLocaleString()
                : "Unknown"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <a
            href={`https://solscan.io/token/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            data-testid="link-explorer"
          >
            <Globe className="h-4 w-4" />
            View on Solscan
          </a>
        </div>
      </div>
    </Card>
  );
}
