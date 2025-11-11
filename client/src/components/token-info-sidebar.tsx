import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TokenInfoSidebarProps {
  tokenAddress: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  lpAddresses?: string[];
}

export function TokenInfoSidebar({ tokenAddress, mintAuthority, freezeAuthority, lpAddresses }: TokenInfoSidebarProps) {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <Card className="sticky top-20" data-testid="card-token-info-sidebar">
      <CardHeader>
        <CardTitle className="text-lg">Token Addresses</CardTitle>
        <CardDescription>Quick reference for contract addresses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Contract Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Token Contract</span>
            <Badge variant="outline">Main</Badge>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all" data-testid="text-token-contract">
              {truncateAddress(tokenAddress)}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => copyToClipboard(tokenAddress, "Token address")}
              data-testid="button-copy-token"
            >
              {copiedAddress === tokenAddress ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <a
            href={`https://solscan.io/token/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            data-testid="link-token-explorer"
          >
            <ExternalLink className="h-3 w-3" />
            View on Solscan
          </a>
        </div>

        {/* Mint Authority */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Mint Authority</span>
            {mintAuthority ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>
          {mintAuthority ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all" data-testid="text-mint-authority">
                  {truncateAddress(mintAuthority)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => copyToClipboard(mintAuthority, "Mint authority")}
                  data-testid="button-copy-mint"
                >
                  {copiedAddress === mintAuthority ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <a
                href={`https://solscan.io/account/${mintAuthority}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid="link-mint-explorer"
              >
                <ExternalLink className="h-3 w-3" />
                View on Solscan
              </a>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Mint authority has been revoked ✓</p>
          )}
        </div>

        {/* Freeze Authority */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Freeze Authority</span>
            {freezeAuthority ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3" />
                Disabled
              </Badge>
            )}
          </div>
          {freezeAuthority ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all" data-testid="text-freeze-authority">
                  {truncateAddress(freezeAuthority)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => copyToClipboard(freezeAuthority, "Freeze authority")}
                  data-testid="button-copy-freeze"
                >
                  {copiedAddress === freezeAuthority ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <a
                href={`https://solscan.io/account/${freezeAuthority}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid="link-freeze-explorer"
              >
                <ExternalLink className="h-3 w-3" />
                View on Solscan
              </a>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Freeze authority has been revoked ✓</p>
          )}
        </div>

        {/* Liquidity Pool Addresses */}
        {lpAddresses && lpAddresses.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Liquidity Pools</span>
              <Badge variant="secondary">{lpAddresses.length}</Badge>
            </div>
            <div className="space-y-3">
              {lpAddresses.slice(0, 3).map((lpAddress, index) => (
                <div key={lpAddress} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all" data-testid={`text-lp-address-${index}`}>
                      {truncateAddress(lpAddress)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => copyToClipboard(lpAddress, `LP address ${index + 1}`)}
                      data-testid={`button-copy-lp-${index}`}
                    >
                      {copiedAddress === lpAddress ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <a
                    href={`https://solscan.io/account/${lpAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid={`link-lp-explorer-${index}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View LP on Solscan
                  </a>
                </div>
              ))}
              {lpAddresses.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{lpAddresses.length - 3} more liquidity pool{lpAddresses.length - 3 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Helper Info */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Click the copy icon to copy any address to your clipboard
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
