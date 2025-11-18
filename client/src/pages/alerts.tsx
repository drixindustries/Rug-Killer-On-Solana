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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PriceAlert } from "@shared/schema";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";

export default function Alerts() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch alerts
  const { data: alerts = [], isLoading } = useQuery<PriceAlert[]>({
    queryKey: ['/api/alerts'],
  });

  // Create alert mutation
  const createAlert = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      setIsAddDialogOpen(false);
      toast({ title: "Alert created", description: "You'll be notified when conditions are met" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle alert mutation
  const toggleAlert = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({ title: "Alert updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete alert mutation
  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/alerts/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({ title: "Alert deleted" });
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
    
    // Validate alert type
    const alertType = formData.get('alertType') as string;
    if (!alertType) {
      toast({ title: "Error", description: "Please select an alert type", variant: "destructive" });
      return;
    }
    
    // Parse and validate target value
    const targetValueStr = formData.get('targetValue') as string;
    if (!targetValueStr) {
      toast({ title: "Error", description: "Target value is required", variant: "destructive" });
      return;
    }
    const targetValue = parseFloat(targetValueStr);
    if (isNaN(targetValue)) {
      toast({ 
        title: "Invalid Target Value", 
        description: "Please enter a valid number for target value", 
        variant: "destructive" 
      });
      return;
    }
    if (targetValue <= 0) {
      toast({ 
        title: "Invalid Target Value", 
        description: "Target value must be greater than zero", 
        variant: "destructive" 
      });
      return;
    }
    
    const data: any = {
      tokenAddress: tokenAddress.trim(),
      alertType,
      targetValue,
    };

    // Validate lookback window for percent-based alerts
    if (alertType === 'percent_change' || alertType === 'percent_drop') {
      const lookbackStr = formData.get('lookbackWindowMinutes') as string;
      if (lookbackStr && lookbackStr !== '') {
        const lookbackMinutes = parseInt(lookbackStr);
        if (isNaN(lookbackMinutes)) {
          toast({ 
            title: "Invalid Lookback Window", 
            description: "Please enter a valid number for lookback window", 
            variant: "destructive" 
          });
          return;
        }
        if (lookbackMinutes <= 0) {
          toast({ 
            title: "Invalid Lookback Window", 
            description: "Lookback window must be greater than zero", 
            variant: "destructive" 
          });
          return;
        }
        data.lookbackWindowMinutes = lookbackMinutes;
      }
    }
    
    createAlert.mutate(data);
  };

  const activeCount = alerts.filter(a => a.isActive).length;
  const triggeredCount = alerts.filter(a => a.triggeredAt).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
          </div>
        </main>
        <Footer />
      </div>
          <p className="text-muted-foreground">Get notified when token prices hit your targets</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-alert">
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
              <DialogDescription>
                Set up notifications for price movements
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tokenAddress">Token Address</Label>
                <Input id="tokenAddress" name="tokenAddress" required data-testid="input-token-address" />
              </div>
              <div>
                <Label htmlFor="alertType">Alert Type</Label>
                <Select name="alertType" required>
                  <SelectTrigger data-testid="select-alert-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_above">Price Above</SelectItem>
                    <SelectItem value="price_below">Price Below</SelectItem>
                    <SelectItem value="percent_change">Percent Change</SelectItem>
                    <SelectItem value="percent_drop">Percent Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetValue">Target Value (price or %)</Label>
                <Input id="targetValue" name="targetValue" type="number" step="any" required data-testid="input-target-value" />
              </div>
              <div>
                <Label htmlFor="lookbackWindowMinutes">Lookback Window (minutes, for % alerts)</Label>
                <Input id="lookbackWindowMinutes" name="lookbackWindowMinutes" type="number" defaultValue="60" data-testid="input-lookback" />
              </div>
              <Button type="submit" className="w-full" disabled={createAlert.isPending} data-testid="button-submit-alert">
                {createAlert.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-alerts">{alerts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Bell className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-active-alerts">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triggered</CardTitle>
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-triggered-alerts">{triggeredCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Alerts</CardTitle>
          <CardDescription>Manage your price alert notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground" data-testid="text-empty-alerts">No alerts configured. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Last Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const isTriggered = !!alert.triggeredAt;
                  const statusColor = isTriggered ? 'text-muted-foreground' : 
                                     alert.isActive ? 'text-green-500' : 'text-orange-500';

                  return (
                    <TableRow key={alert.id} data-testid={`row-alert-${alert.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-token-${alert.id}`}>
                        {alert.tokenAddress.slice(0, 8)}...
                      </TableCell>
                      <TableCell data-testid={`cell-type-${alert.id}`}>
                        <Badge variant="outline" data-testid={`badge-type-${alert.id}`}>
                          {alert.alertType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-target-${alert.id}`}>
                        {alert.alertType.includes('percent') 
                          ? `${Number(alert.targetValue || 0).toFixed(1)}%`
                          : `$${Number(alert.targetValue || 0).toFixed(4)}`}
                      </TableCell>
                      <TableCell data-testid={`cell-last-price-${alert.id}`}>
                        {alert.lastPrice ? `$${Number(alert.lastPrice || 0).toFixed(4)}` : '-'}
                      </TableCell>
                      <TableCell className={statusColor} data-testid={`cell-status-${alert.id}`}>
                        <Badge variant="outline" data-testid={`badge-status-${alert.id}`}>
                          {isTriggered ? 'Triggered' : alert.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-created-${alert.id}`}>
                        {new Date(alert.createdAt!).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Switch
                            checked={alert.isActive && !isTriggered}
                            disabled={isTriggered}
                            onCheckedChange={(checked) => toggleAlert.mutate({ id: alert.id, isActive: checked })}
                            data-testid={`switch-toggle-${alert.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlert.mutate(alert.id)}
                            data-testid={`button-delete-${alert.id}`}
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
    </div>
  );
}
