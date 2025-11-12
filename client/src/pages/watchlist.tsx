import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Star } from "lucide-react";
import { format } from "date-fns";
import type { WatchlistEntry } from "@shared/schema";

export default function Watchlist() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [label, setLabel] = useState("");

  const { data: watchlist, isLoading } = useQuery<WatchlistEntry[]>({
    queryKey: ["/api/watchlist"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { tokenAddress: string; label?: string }) => {
      const response = await apiRequest("POST", "/api/watchlist", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Token added to watchlist",
      });
      setIsDialogOpen(false);
      setTokenAddress("");
      setLabel("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message.includes("409") 
          ? "This token is already in your watchlist"
          : "Failed to add token to watchlist",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (tokenAddress: string) => {
      await apiRequest("DELETE", `/api/watchlist/${tokenAddress}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Token removed from watchlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove token from watchlist",
        variant: "destructive",
      });
    },
  });

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a token address",
        variant: "destructive",
      });
      return;
    }

    if (tokenAddress.length < 32 || tokenAddress.length > 44) {
      toast({
        title: "Error",
        description: "Invalid token address format",
        variant: "destructive",
      });
      return;
    }

    addMutation.mutate({
      tokenAddress: tokenAddress.trim(),
      label: label.trim() || undefined,
    });
  };

  const handleRemoveToken = (address: string) => {
    removeMutation.mutate(address);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
                  <Star className="w-8 h-8 text-primary" />
                  My Watchlist
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-2">
                  Track your favorite tokens and monitor their activity
                </p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-watchlist">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Token
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-watchlist">
                  <DialogHeader>
                    <DialogTitle>Add Token to Watchlist</DialogTitle>
                    <DialogDescription>
                      Enter the Solana token address you want to track
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddToken}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="tokenAddress">
                          Token Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="tokenAddress"
                          placeholder="e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                          value={tokenAddress}
                          onChange={(e) => setTokenAddress(e.target.value)}
                          data-testid="input-token-address"
                          disabled={addMutation.isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="label">Label (Optional)</Label>
                        <Input
                          id="label"
                          placeholder="e.g., USDC, My favorite token"
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          maxLength={120}
                          data-testid="input-label"
                          disabled={addMutation.isPending}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={addMutation.isPending}
                        data-testid="button-cancel-add"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={addMutation.isPending}
                        data-testid="button-submit-add"
                      >
                        {addMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Add to Watchlist
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card data-testid="card-watchlist">
              <CardHeader>
                <CardTitle>Tracked Tokens</CardTitle>
                <CardDescription>
                  Tokens you're currently monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !watchlist || watchlist.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-state">
                    <Star className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tokens in watchlist</h3>
                    <p className="text-muted-foreground mb-4">
                      Start tracking tokens by adding them to your watchlist
                    </p>
                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      data-testid="button-add-first-token"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Token
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token Address</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Added Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {watchlist.map((entry) => (
                          <TableRow key={entry.id} data-testid={`row-watchlist-${entry.id}`}>
                            <TableCell className="font-mono text-sm">
                              <span className="hidden sm:inline" data-testid={`text-address-full-${entry.id}`}>
                                {entry.tokenAddress}
                              </span>
                              <span className="sm:hidden" data-testid={`text-address-truncated-${entry.id}`}>
                                {truncateAddress(entry.tokenAddress)}
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-label-${entry.id}`}>
                              {entry.label || (
                                <span className="text-muted-foreground italic">No label</span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-date-${entry.id}`}>
                              {entry.createdAt 
                                ? format(new Date(entry.createdAt), 'MMM d, yyyy')
                                : 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveToken(entry.tokenAddress)}
                                disabled={removeMutation.isPending}
                                data-testid={`button-remove-${entry.id}`}
                                aria-label="Remove from watchlist"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
