import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Globe, FileText, AlertCircle, CheckCircle, Calendar, Clock } from "lucide-react";
import type { TokenMetadata } from "@shared/schema";

interface TokenMetadataCardProps {
  metadata?: TokenMetadata;
  tokenAddress: string;
  creationDate?: number;
}

export function TokenMetadataCard({ metadata, tokenAddress, creationDate }: TokenMetadataCardProps) {
  const getTokenAge = (timestamp?: number) => {
    if (!timestamp) return "Established (>30 days)";
    
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days === 0) {
      if (hours === 0) return "Just created";
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const getAgeRiskBadge = (timestamp?: number) => {
    if (!timestamp) {
      return <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
        <CheckCircle className="h-3 w-3" />
        Established
      </Badge>;
    }
    
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 1) {
      return <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Very New - High Risk
      </Badge>;
    }
    if (days < 7) {
      return <Badge className="gap-1 bg-orange-500">
        <Clock className="h-3 w-3" />
        New Token
      </Badge>;
    }
    if (days < 30) {
      return <Badge variant="secondary" className="gap-1">
        <Calendar className="h-3 w-3" />
        Recent
      </Badge>;
    }
    return <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
      <CheckCircle className="h-3 w-3" />
      Established
    </Badge>;
  };

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
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-start min-w-0">
                {metadata?.hasMetadata ? (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    Has Metadata
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" />
                    No Metadata
                  </Badge>
                )}
              </div>
              
              {metadata?.isMutable && (
                <div className="flex items-center justify-start min-w-0">
                  <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600 shrink-0" title="Dev can change name/symbol/image anytime. Rug risk: swap branding after pump.">
                    <AlertCircle className="h-3 w-3" />
                    Metadata Mutable
                  </Badge>
                </div>
              )}
              
              {metadata?.isMutable === false && (
                <div className="flex items-center justify-start min-w-0">
                  <Badge variant="secondary" className="gap-1 text-green-600 border-green-600 shrink-0" title="Update authority revoked. Token identity locked permanently.">
                    <CheckCircle className="h-3 w-3" />
                    Metadata Locked
                  </Badge>
                </div>
              )}
              
              <div className="flex items-center justify-start min-w-0">
                <div className="shrink-0">
                  {getAgeRiskBadge(creationDate)}
                </div>
              </div>
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
              {metadata?.supply !== null && metadata?.supply !== undefined && metadata?.decimals !== null && metadata?.decimals !== undefined
                ? (metadata.supply / Math.pow(10, metadata.decimals)).toLocaleString()
                : "Unknown"}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Token Age</span>
            <span className="text-sm font-semibold" data-testid="text-token-age">
              {getTokenAge(creationDate)}
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

export default TokenMetadataCard;
