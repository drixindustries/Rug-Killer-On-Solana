import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Send, Coins, Flame, AlertTriangle } from "lucide-react";
import type { TransactionInfo } from "@shared/schema";

interface TransactionTimelineProps {
  transactions: TransactionInfo[];
}

export function TransactionTimeline({ transactions }: TransactionTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const displayedTxs = showAll ? transactions : transactions.slice(0, 5);

  const getIcon = (type: string) => {
    switch (type) {
      case "swap":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "transfer":
        return <Send className="h-4 w-4" />;
      case "mint":
        return <Coins className="h-4 w-4" />;
      case "burn":
        return <Flame className="h-4 w-4" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (transactions.length === 0) {
    return (
      <Card className="p-6" data-testid="card-no-transactions">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <p className="text-sm text-muted-foreground">No recent transactions found</p>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-transaction-timeline">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      
      <div className="space-y-3">
        {displayedTxs.map((tx, index) => (
          <div
            key={tx.signature}
            className={`flex items-start gap-3 p-3 rounded-md border-l-2 ${
              tx.suspicious 
                ? "border-l-red-600 bg-red-50 dark:bg-red-950/20" 
                : "border-l-primary bg-muted/30"
            }`}
            data-testid={`transaction-${index}`}
          >
            <div className={`p-2 rounded-md ${tx.suspicious ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10"}`}>
              {tx.suspicious ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                getIcon(tx.type)
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-semibold capitalize" data-testid={`text-tx-type-${index}`}>
                  {tx.type}
                  {tx.suspicious && (
                    <span className="ml-2 text-xs text-red-600 font-normal">• Suspicious</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground" data-testid={`text-tx-time-${index}`}>
                  {formatTime(tx.timestamp)}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground mt-1 font-mono" data-testid={`text-tx-signature-${index}`}>
                {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
              </div>
              
              {tx.from && (
                <div className="text-xs text-muted-foreground mt-1">
                  From: <span className="font-mono">{tx.from.slice(0, 4)}...{tx.from.slice(-4)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {transactions.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            data-testid="button-toggle-transactions"
          >
            {showAll ? "Show Less" : `Load More (${transactions.length - 5} remaining)`}
          </Button>
        </div>
      )}
    </Card>
  );
}
