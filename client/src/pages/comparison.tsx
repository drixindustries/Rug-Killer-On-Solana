import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, GitCompare, AlertTriangle, TrendingUp, Users, Droplet } from "lucide-react";
import type { TokenAnalysisResponse, RiskLevel } from "@shared/schema";

type ComparisonResult = TokenAnalysisResponse & {
  error?: boolean;
  message?: string;
};

interface ComparisonResponse {
  comparisons: ComparisonResult[];
  comparedAt: number;
}

export default function Comparison() {
  const { toast } = useToast();
  const [tokenAddresses, setTokenAddresses] = useState<string[]>(["", ""]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[] | null>(null);

  const compareMutation = useMutation({
    mutationFn: async (addresses: string[]) => {
      const response = await apiRequest("/api/compare-tokens", {
        method: "POST",
        body: JSON.stringify({ tokenAddresses: addresses }),
      });
      return await response.json() as ComparisonResponse;
    },
    onSuccess: (data) => {
      setComparisonResults(data.comparisons);
      toast({
        title: "Comparison Complete",
        description: `Analyzed ${data.comparisons.length} tokens successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Comparison Failed",
        description: error.message || "Failed to compare tokens",
        variant: "destructive",
      });
    },
  });

  const handleAddTokenInput = () => {
    if (tokenAddresses.length < 5) {
      setTokenAddresses([...tokenAddresses, ""]);
    }
  };

  const handleRemoveTokenInput = (index: number) => {
    if (tokenAddresses.length > 2) {
      setTokenAddresses(tokenAddresses.filter((_, i) => i !== index));
    }
  };

  const handleTokenAddressChange = (index: number, value: string) => {
    const newAddresses = [...tokenAddresses];
    newAddresses[index] = value;
    setTokenAddresses(newAddresses);
  };

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validAddresses = tokenAddresses.filter(addr => addr.trim().length >= 32);
    
    if (validAddresses.length < 2) {
      toast({
        title: "Invalid Input",
        description: "Please enter at least 2 valid token addresses",
        variant: "destructive",
      });
      return;
    }

    if (validAddresses.length > 5) {
      toast({
        title: "Too Many Tokens",
        description: "Maximum 5 tokens allowed for comparison",
        variant: "destructive",
      });
      return;
    }

    compareMutation.mutate(validAddresses);
  };

  const getRiskBadgeVariant = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case "LOW":
        return "default";
      case "MODERATE":
        return "secondary";
      case "HIGH":
        return "destructive";
      case "EXTREME":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRiskColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case "LOW":
        return "text-green-500";
      case "MODERATE":
        return "text-yellow-500";
      case "HIGH":
        return "text-orange-500";
      case "EXTREME":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
                <GitCompare className="w-8 h-8 text-primary" />
                Token Comparison
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mt-2">
                Compare up to 5 tokens side-by-side to analyze their risk profiles and metrics
              </p>
            </div>

            {/* Input Form */}
            <Card data-testid="card-comparison-form">
              <CardHeader>
                <CardTitle>Enter Token Addresses</CardTitle>
                <CardDescription>
                  Add 2-5 Solana token addresses to compare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompare} className="space-y-4">
                  <div className="space-y-3">
                    {tokenAddresses.map((address, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Label htmlFor={`token-${index}`} className="sr-only">
                            Token {index + 1}
                          </Label>
                          <Input
                            id={`token-${index}`}
                            placeholder={`Token ${index + 1} address (e.g., EPjFWdd5AufqSSqeM2qN...)`}
                            value={address}
                            onChange={(e) => handleTokenAddressChange(index, e.target.value)}
                            disabled={compareMutation.isPending}
                            data-testid={`input-token-${index}`}
                          />
                        </div>
                        {tokenAddresses.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveTokenInput(index)}
                            disabled={compareMutation.isPending}
                            data-testid={`button-remove-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    {tokenAddresses.length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTokenInput}
                        disabled={compareMutation.isPending}
                        data-testid="button-add-token"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Token
                      </Button>
                    )}
                    
                    <Button
                      type="submit"
                      disabled={compareMutation.isPending}
                      data-testid="button-compare"
                    >
                      {compareMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <GitCompare className="w-4 h-4 mr-2" />
                          Compare Tokens
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Results Display */}
            {comparisonResults && comparisonResults.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Comparison Results</h2>

                {/* Side-by-side cards for mobile/tablet */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:hidden">
                  {comparisonResults.map((result, index) => (
                    <Card key={result.tokenAddress} data-testid={`card-result-${index}`}>
                      <CardHeader className="space-y-1 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-mono truncate">
                            {truncateAddress(result.tokenAddress)}
                          </CardTitle>
                          {!result.error && (
                            <Badge 
                              variant={getRiskBadgeVariant(result.riskLevel)}
                              data-testid={`badge-risk-${index}`}
                            >
                              {result.riskLevel}
                            </Badge>
                          )}
                        </div>
                        {result.metadata && (
                          <p className="text-sm text-muted-foreground">
                            {result.metadata.symbol} - {result.metadata.name}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.error ? (
                          <div className="flex items-start gap-2 text-destructive">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <p className="text-sm">{result.message || "Analysis failed"}</p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                  Risk Score
                                </span>
                                <span className={`text-xl font-bold ${getRiskColor(result.riskLevel)}`} data-testid={`text-risk-score-${index}`}>
                                  {Number(result.riskScore || 0).toFixed(0)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  <span>Holders</span>
                                </div>
                                <span className="text-sm font-semibold" data-testid={`text-holders-${index}`}>
                                  {formatNumber(result.holderCount)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Droplet className="w-3 h-3" />
                                  <span>Liquidity</span>
                                </div>
                                <span className="text-sm font-semibold" data-testid={`text-liquidity-${index}`}>
                                  ${formatNumber(result.marketData?.liquidityUsd)}
                                </span>
                              </div>

                              {result.marketData?.priceUsd !== null && result.marketData?.priceUsd !== undefined && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Price</span>
                                  </div>
                                  <span className="text-sm font-semibold" data-testid={`text-price-${index}`}>
                                    ${Number(result.marketData?.priceUsd || 0).toFixed(6)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  Top 10 Hold
                                </span>
                                <span className="text-sm font-semibold" data-testid={`text-concentration-${index}`}>
                                  {Number(result.topHolderConcentration || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {result.redFlags.length > 0 && (
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {result.redFlags.length} Risk Flag{result.redFlags.length > 1 ? 's' : ''}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {result.redFlags.slice(0, 3).map((flag, flagIndex) => (
                                    <Badge 
                                      key={flagIndex} 
                                      variant="outline" 
                                      className="text-xs"
                                      data-testid={`badge-flag-${index}-${flagIndex}`}
                                    >
                                      {flag.type?.replace(/_/g, ' ') || 'Unknown'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Comparison table for desktop */}
                <Card className="hidden lg:block" data-testid="card-comparison-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Metric</TableHead>
                        {comparisonResults.map((result, index) => (
                          <TableHead key={result.tokenAddress} className="text-center" data-testid={`header-token-${index}`}>
                            <div className="space-y-1">
                              <div className="font-mono text-xs">
                                {truncateAddress(result.tokenAddress)}
                              </div>
                              {result.metadata && (
                                <div className="text-xs text-muted-foreground">
                                  {result.metadata.symbol}
                                </div>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Risk Level</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-risk-level-${index}`}>
                            {result.error ? (
                              <span className="text-destructive text-sm">Error</span>
                            ) : (
                              <Badge variant={getRiskBadgeVariant(result.riskLevel)}>
                                {result.riskLevel}
                              </Badge>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Risk Score</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-risk-score-${index}`}>
                            {result.error ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <span className={`text-xl font-bold ${getRiskColor(result.riskLevel)}`}>
                                {Number(result.riskScore || 0).toFixed(0)}
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Holder Count</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-holders-${index}`}>
                            {result.error ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              formatNumber(result.holderCount)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Liquidity (USD)</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-liquidity-${index}`}>
                            {result.error ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              `$${formatNumber(result.marketData?.liquidityUsd)}`
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Price (USD)</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-price-${index}`}>
                            {result.error || !result.marketData?.priceUsd ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              `$${Number(result.marketData.priceUsd || 0).toFixed(6)}`
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Top 10 Concentration</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-concentration-${index}`}>
                            {result.error ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              `${Number(result.topHolderConcentration || 0).toFixed(1)}%`
                            )}
                          </TableCell>
                        ))}
                      </TableRow>

                      <TableRow>
                        <TableCell className="font-medium">Risk Flags</TableCell>
                        {comparisonResults.map((result, index) => (
                          <TableCell key={result.tokenAddress} className="text-center" data-testid={`cell-flags-${index}`}>
                            {result.error ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <span className={result.redFlags.length > 0 ? "text-orange-500 font-semibold" : ""}>
                                {result.redFlags.length}
                              </span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
