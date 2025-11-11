import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TokenInputProps {
  onAnalyze: (tokenAddress: string) => void;
  isAnalyzing?: boolean;
}

const EXAMPLE_TOKENS = [
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", label: "USDC" },
  { address: "So11111111111111111111111111111111111111112", label: "SOL" },
];

export function TokenInput({ onAnalyze, isAnalyzing }: TokenInputProps) {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenAddress.trim()) {
      setError("Please enter a token address");
      return;
    }
    
    if (tokenAddress.length < 32 || tokenAddress.length > 44) {
      setError("Invalid Solana address format");
      return;
    }
    
    setError("");
    onAnalyze(tokenAddress);
    
    if (!recentSearches.includes(tokenAddress)) {
      setRecentSearches(prev => [tokenAddress, ...prev.slice(0, 4)]);
    }
  };

  const handleRemoveRecent = (address: string) => {
    setRecentSearches(prev => prev.filter(a => a !== address));
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter Solana token address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)"
            value={tokenAddress}
            onChange={(e) => {
              setTokenAddress(e.target.value);
              setError("");
            }}
            className="pl-12 pr-32 h-12 text-base font-mono"
            data-testid="input-token-address"
            disabled={isAnalyzing}
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            size="sm"
            disabled={isAnalyzing}
            data-testid="button-analyze"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Token"}
          </Button>
        </div>
      </form>
      
      {error && (
        <p className="text-sm text-destructive" data-testid="text-error">
          {error}
        </p>
      )}
      
      {recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Recent:
          </span>
          {recentSearches.map((address) => (
            <Badge
              key={address}
              variant="secondary"
              className="gap-1 font-mono text-xs"
              data-testid={`badge-recent-${address.slice(0, 8)}`}
            >
              {address.slice(0, 4)}...{address.slice(-4)}
              <button
                onClick={() => handleRemoveRecent(address)}
                className="ml-1 hover:text-destructive"
                data-testid={`button-remove-recent-${address.slice(0, 8)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Try example:
        </span>
        {EXAMPLE_TOKENS.map((token) => (
          <Button
            key={token.address}
            variant="outline"
            size="sm"
            onClick={() => {
              setTokenAddress(token.address);
              setError("");
            }}
            disabled={isAnalyzing}
            data-testid={`button-example-${token.label.toLowerCase()}`}
            className="h-7 text-xs"
          >
            {token.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
