import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import type { HolderInfo } from "@shared/schema";

interface TopHoldersTableProps {
  holders: HolderInfo[];
}

export function TopHoldersTable({ holders }: TopHoldersTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const displayedHolders = showAll ? holders : holders.slice(0, 10);

  const copyToClipboard = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatBalance = (balance: number) => {
    if (balance >= 1e9) return `${(balance / 1e9).toFixed(2)}B`;
    if (balance >= 1e6) return `${(balance / 1e6).toFixed(2)}M`;
    if (balance >= 1e3) return `${(balance / 1e3).toFixed(2)}K`;
    if (balance >= 1) return balance.toFixed(2);
    return balance.toPrecision(3);
  };

  const solscanUrl = (address: string) => `https://solscan.io/account/${address}`;

  return (
    <Card className="p-3 sm:p-4 lg:p-6" data-testid="card-top-holders">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Top Holders</h2>
      
      <div>
        <table className="w-full">
          <thead className="sticky top-0 bg-card border-b">
            <tr className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
              <th className="text-left py-2 sm:py-3 px-2 font-medium">Rank</th>
              <th className="text-left py-2 sm:py-3 px-2 font-medium">Address</th>
              <th className="text-right py-2 sm:py-3 px-2 font-medium">Balance</th>
              <th className="text-right py-2 sm:py-3 px-2 font-medium hidden sm:table-cell">% of Supply</th>
              <th className="text-right py-2 sm:py-3 px-2 font-medium sm:hidden">%</th>
              <th className="text-right py-2 sm:py-3 px-2 font-medium">Links</th>
            </tr>
          </thead>
          <tbody>
            {displayedHolders.map((holder, index) => (
              <tr
                key={holder.address}
                className="border-b last:border-b-0 hover:bg-muted/50"
                data-testid={`row-holder-${index}`}
              >
                <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium">
                  #{holder.rank}
                </td>
                <td className="py-2 sm:py-3 px-2 font-mono text-xs sm:text-sm" data-testid={`text-holder-address-${index}`}>
                  <span className="hidden sm:inline">{holder.address.slice(0, 6)}...{holder.address.slice(-6)}</span>
                  <span className="sm:hidden">{holder.address.slice(0, 4)}...{holder.address.slice(-4)}</span>
                </td>
                <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right font-semibold" data-testid={`text-holder-balance-${index}`}>
                  {formatBalance(holder.balance)}
                </td>
                <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right font-semibold" data-testid={`text-holder-percentage-${index}`}>
                  {holder.percentage.toFixed(2)}%
                </td>
                <td className="py-2 sm:py-3 px-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(holder.address)}
                      data-testid={`button-copy-${index}`}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      aria-label={`Copy ${holder.address}`}
                    >
                      {copiedAddress === holder.address ? (
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      aria-label={`Open ${holder.address} on Solscan`}
                      data-testid={`button-solscan-${index}`}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                    >
                      <a href={solscanUrl(holder.address)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                      </a>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {holders.length > 10 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            data-testid="button-toggle-holders"
          >
            {showAll ? "Show Less" : `Show All ${holders.length} Holders`}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default TopHoldersTable;
