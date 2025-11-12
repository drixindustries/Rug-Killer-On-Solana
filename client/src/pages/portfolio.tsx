import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PortfolioPosition, PortfolioTransaction } from "@shared/schema";

export default function Portfolio() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Fetch positions
  const { data: positions = [], isLoading } = useQuery<PortfolioPosition[]>({
    queryKey: ['/api/portfolio/positions'],
  });

  // Fetch transactions for selected token
  const { data: transactions = [] } = useQuery<PortfolioTransaction[]>({
    queryKey: ['/api/portfolio/transactions', selectedToken],
    queryFn: async () => {
      const url = selectedToken 
        ? `/api/portfolio/transactions?tokenAddress=${selectedToken}`
        : '/api/portfolio/transactions';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!selectedToken,
  });

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/portfolio/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/transactions'] });
      setIsAddDialogOpen(false);
      toast({ title: "Transaction recorded", description: "Your portfolio has been updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete position mutation
  const deletePosition = useMutation({
    mutationFn: async (tokenAddress: string) => {
      return apiRequest(`/api/portfolio/positions/${tokenAddress}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/positions'] });
      toast({ title: "Position deleted", description: "Position removed from portfolio" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Validate token address
    const tokenAddress = formData.get('tokenAddress') as string;
    if (!tokenAddress || tokenAddress.trim().length < 32) {
      toast({ 
        title: "Invalid Token Address", 
        description: "Token address must be at least 32 characters", 
        variant: "destructive" 
      });
      return;
    }
    
    // Parse and validate quantity
    const quantityStr = formData.get('quantity') as string;
    if (!quantityStr) {
      toast({ title: "Error", description: "Quantity is required", variant: "destructive" });
      return;
    }
    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity)) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid number for quantity", variant: "destructive" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be greater than zero", variant: "destructive" });
      return;
    }
    
    // Parse and validate price (optional but must be valid if provided)
    let priceUsd: number | undefined;
    const priceStr = formData.get('priceUsd') as string;
    if (priceStr && priceStr !== '') {
      priceUsd = parseFloat(priceStr);
      if (isNaN(priceUsd)) {
        toast({ title: "Invalid Price", description: "Please enter a valid number for price", variant: "destructive" });
        return;
      }
      if (priceUsd < 0) {
        toast({ title: "Invalid Price", description: "Price cannot be negative", variant: "destructive" });
        return;
      }
    }
    
    // Parse and validate fee (optional but must be valid if provided)
    let feeUsd: number | undefined;
    const feeStr = formData.get('feeUsd') as string;
    if (feeStr && feeStr !== '') {
      feeUsd = parseFloat(feeStr);
      if (isNaN(feeUsd)) {
        toast({ title: "Invalid Fee", description: "Please enter a valid number for fee", variant: "destructive" });
        return;
      }
      if (feeUsd < 0) {
        toast({ title: "Invalid Fee", description: "Fee cannot be negative", variant: "destructive" });
        return;
      }
    }
    
    addTransaction.mutate({
      tokenAddress: tokenAddress.trim(),
      txType: formData.get('txType') as string,
      quantity,
      priceUsd,
      feeUsd,
      note: formData.get('note') as string || undefined,
    });
  };

  // Calculate portfolio totals
  const totalValue = positions.reduce((sum, p) => {
    const qty = Number(p.quantity || 0);
    const price = Number(p.latestPriceUsd || 0);
    return sum + (qty * price);
  }, 0);

  const totalPnl = positions.reduce((sum, p) => {
    return sum + Number(p.unrealizedPnlUsd || 0) + Number(p.realizedPnlUsd || 0);
  }, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-portfolio">Portfolio Tracker</h1>
          <p className="text-muted-foreground">Track your holdings, transactions, and P&L</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-transaction">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>
                Add a buy, sell, or other transaction to your portfolio
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tokenAddress">Token Address</Label>
                <Input id="tokenAddress" name="tokenAddress" required data-testid="input-token-address" />
              </div>
              <div>
                <Label htmlFor="txType">Type</Label>
                <Select name="txType" required>
                  <SelectTrigger data-testid="select-tx-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="airdrop">Airdrop</SelectItem>
                    <SelectItem value="manual_adjust">Manual Adjust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" step="any" required data-testid="input-quantity" />
              </div>
              <div>
                <Label htmlFor="priceUsd">Price USD (required for buy/sell)</Label>
                <Input id="priceUsd" name="priceUsd" type="number" step="any" data-testid="input-price" />
              </div>
              <div>
                <Label htmlFor="feeUsd">Fee USD</Label>
                <Input id="feeUsd" name="feeUsd" type="number" step="any" data-testid="input-fee" />
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" data-testid="input-note" />
              </div>
              <Button type="submit" className="w-full" disabled={addTransaction.isPending} data-testid="button-submit-transaction">
                {addTransaction.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              ${Number(totalValue || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalPnl >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-total-pnl">
              ${Number(totalPnl || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-position-count">{positions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>Your current token positions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading positions...</p>
          ) : positions.length === 0 ? (
            <p className="text-muted-foreground" data-testid="text-empty-portfolio">No positions yet. Add a transaction to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Unrealized P&L</TableHead>
                  <TableHead className="text-right">Realized P&L</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const quantity = Number(position.quantity || 0);
                  const avgCost = Number(position.avgCostUsd || 0);
                  const currentPrice = Number(position.latestPriceUsd || 0);
                  const value = quantity * currentPrice;
                  const unrealizedPnl = Number(position.unrealizedPnlUsd || 0);
                  const realizedPnl = Number(position.realizedPnlUsd || 0);
                  const pnlPct = Number(position.pnlPct || 0);

                  return (
                    <TableRow key={position.id} data-testid={`row-position-${position.tokenAddress}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-token-${position.tokenAddress}`}>
                        {position.tokenAddress.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-quantity-${position.tokenAddress}`}>
                        {Number(quantity || 0).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-avg-cost-${position.tokenAddress}`}>
                        ${Number(avgCost || 0).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-current-price-${position.tokenAddress}`}>
                        ${Number(currentPrice || 0).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-value-${position.tokenAddress}`}>
                        ${Number(value || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right ${unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid={`cell-unrealized-pnl-${position.tokenAddress}`}>
                        ${Number(unrealizedPnl || 0).toFixed(2)} ({Number(pnlPct || 0).toFixed(2)}%)
                      </TableCell>
                      <TableCell className={`text-right ${realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid={`cell-realized-pnl-${position.tokenAddress}`}>
                        ${Number(realizedPnl || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedToken(position.tokenAddress)}
                            data-testid={`button-view-transactions-${position.tokenAddress}`}
                          >
                            View Txs
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePosition.mutate(position.tokenAddress)}
                            data-testid={`button-delete-${position.tokenAddress}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedToken && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Transactions for {selectedToken.slice(0, 8)}...</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground">No transactions found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell data-testid={`cell-tx-date-${tx.id}`}>
                        {new Date(tx.executedAt!).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`cell-tx-type-${tx.id}`}>
                        <Badge data-testid={`badge-tx-type-${tx.id}`}>{tx.txType}</Badge>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-tx-quantity-${tx.id}`}>
                        {Number(tx.quantity || 0).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-tx-price-${tx.id}`}>
                        {tx.priceUsd ? `$${Number(tx.priceUsd || 0).toFixed(4)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-tx-fee-${tx.id}`}>
                        {tx.feeUsd ? `$${Number(tx.feeUsd || 0).toFixed(4)}` : '-'}
                      </TableCell>
                      <TableCell data-testid={`cell-tx-note-${tx.id}`}>{tx.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
