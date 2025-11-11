import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreatorWalletInfo {
  publicKey: string;
  balance: number;
  isConfigured: boolean;
  pumpFunUrl: string | null;
}

interface GeneratedWallet {
  publicKey: string;
  privateKey: string;
  warning: string;
  nextSteps: string[];
}

export default function AdminWallet() {
  const { toast } = useToast();
  const [generatedWallet, setGeneratedWallet] = useState<GeneratedWallet | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const { data: walletInfo, isLoading } = useQuery<CreatorWalletInfo>({
    queryKey: ['/api/admin/creator-wallet'],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/creator-wallet/generate', {});
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedWallet(data);
      setShowPrivateKey(true);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/creator-wallet'] });
      toast({
        title: "Wallet Generated",
        description: "Save the private key immediately! It won't be shown again.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-admin-wallet">
          <Wallet className="h-8 w-8" />
          Creator Wallet
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage the wallet used to create tokens on pump.fun and receive creator rewards (0.05% of trading volume).
        </p>
      </div>

      {generatedWallet && showPrivateKey && (
        <Alert className="mb-6 border-destructive" data-testid="alert-generated-wallet">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <div className="space-y-4">
              <p className="font-bold text-destructive">{generatedWallet.warning}</p>
              
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Public Key:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-xs font-mono" data-testid="text-public-key">
                      {generatedWallet.publicKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedWallet.publicKey, 'Public key')}
                      data-testid="button-copy-public"
                      aria-label="Copy public key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-destructive">Private Key (Secret):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-destructive/10 border border-destructive rounded text-xs font-mono" data-testid="text-private-key">
                      {generatedWallet.privateKey}
                    </code>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => copyToClipboard(generatedWallet.privateKey, 'Private key')}
                      data-testid="button-copy-private"
                      aria-label="Copy private key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="font-medium mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {generatedWallet.nextSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowPrivateKey(false)}
                data-testid="button-hide-private"
                className="w-full"
              >
                I've Saved It - Hide Private Key
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {walletInfo?.isConfigured ? (
        <Card data-testid="card-wallet-configured">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Wallet Configured
            </CardTitle>
            <CardDescription>
              Your creator wallet is set up and ready to use on pump.fun
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Public Address</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono" data-testid="text-configured-address">
                  {walletInfo.publicKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(walletInfo.publicKey, 'Address')}
                  data-testid="button-copy-address"
                  aria-label="Copy wallet address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Balance</label>
              <p className="text-2xl font-bold mt-1" data-testid="text-balance">
                {walletInfo.balance.toFixed(4)} SOL
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="default"
                className="flex-1"
                asChild
                data-testid="button-view-profile"
              >
                <a href={walletInfo.pumpFunUrl || '#'} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on pump.fun
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                asChild
                data-testid="button-view-solscan"
              >
                <a href={`https://solscan.io/account/${walletInfo.publicKey}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Solscan
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-no-wallet">
          <CardHeader>
            <CardTitle>No Wallet Configured</CardTitle>
            <CardDescription>
              Generate a new creator wallet to start earning rewards on pump.fun
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">What you'll get:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>A new Solana wallet for creating tokens on pump.fun</li>
                  <li>Earn 0.05% of all trading volume on your tokens (paid in SOL)</li>
                  <li>Claim rewards anytime from your pump.fun profile</li>
                  <li>Full ownership - import the wallet into Phantom</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-wallet"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Creator Wallet'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6" data-testid="card-how-to-use">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1">1. Fund Your Wallet</h4>
            <p className="text-muted-foreground">
              Send SOL to the wallet address above (~0.5 SOL to cover token creation fees)
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">2. Create Tokens on pump.fun</h4>
            <p className="text-muted-foreground">
              Import the wallet into Phantom → Go to pump.fun → Create tokens using this wallet
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">3. Earn Rewards</h4>
            <p className="text-muted-foreground">
              Automatically earn 0.05% of trading volume in SOL. Rewards accumulate on-chain.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">4. Claim Rewards</h4>
            <p className="text-muted-foreground">
              Visit pump.fun → Log in with Phantom → Profile → Coins → "CLAIM SOL REWARDS"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
