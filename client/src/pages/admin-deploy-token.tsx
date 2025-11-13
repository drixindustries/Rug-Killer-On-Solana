import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Copy, Rocket, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeploymentResult {
  success: boolean;
  mintAddress?: string;
  signature?: string;
  error?: string;
  steps: string[];
  vanityKeypair?: {
    publicKey: string;
    privateKey: string;
  };
}

export default function AdminDeployToken() {
  const { toast } = useToast();
  const [walletPrivateKey, setWalletPrivateKey] = useState('');
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!walletPrivateKey) {
        throw new Error('Please provide your wallet private key');
      }

      const res = await apiRequest('POST', '/api/admin/token/deploy', {
        name: 'RugKiller',
        symbol: 'ANTIRUG',
        decimals: 9,
        supply: 1000000000, // 1 billion tokens
        description: 'The ultimate Solana rug pull detector. AI-powered analysis, multi-source verification, and real-time alerts.',
        walletPrivateKey,
        generateVanity: true,
        vanitySuffix: 'tek',
      });
      return res.json();
    },
    onSuccess: (data) => {
      setDeploymentResult(data);
      if (data.success) {
        setShowPrivateKey(true);
        toast({
          title: "Token Deployed! 🚀",
          description: `$ANTIRUG deployed at ${data.mintAddress?.slice(0, 8)}...`,
        });
      } else {
        toast({
          title: "Deployment Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Deployment Error",
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-deploy-token">
          <Rocket className="h-8 w-8" />
          Deploy RugKiller Token
        </h1>
        <p className="text-muted-foreground mt-2">
          Deploy $ANTIRUG with a vanity address ending in "tek"
        </p>
      </div>

      {!deploymentResult ? (
        <Card data-testid="card-deployment-form">
          <CardHeader>
            <CardTitle>Deploy $ANTIRUG Token</CardTitle>
            <CardDescription>
              This will generate a vanity address ending in "tek" and deploy the RugKiller token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Token Details:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Name: RugKiller</li>
                    <li>Symbol: $ANTIRUG</li>
                    <li>Supply: 1,000,000,000 (1 billion)</li>
                    <li>Decimals: 9</li>
                    <li>Vanity Address: Ending in "tek"</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="walletKey">Your Wallet Private Key</Label>
                <Input
                  id="walletKey"
                  type="password"
                  placeholder="Enter base58 encoded private key"
                  value={walletPrivateKey}
                  onChange={(e) => setWalletPrivateKey(e.target.value)}
                  data-testid="input-wallet-key"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Needs ~0.05 SOL for deployment. Your key is never stored.
                </p>
              </div>

              <Alert className="bg-yellow-500/10 border-yellow-500">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Vanity generation may take 1-10 minutes</li>
                    <li>You'll receive the token mint keypair to import into Phantom</li>
                    <li>Save the private key immediately - it's shown only once</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => deployMutation.mutate()}
                disabled={deployMutation.isPending || !walletPrivateKey}
                className="w-full"
                size="lg"
                data-testid="button-deploy"
              >
                {deployMutation.isPending ? 'Deploying... (This may take a few minutes)' : 'Deploy $ANTIRUG Token 🚀'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {deploymentResult.success ? (
            <>
              <Alert className="border-green-500 bg-green-500/10" data-testid="alert-success">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  <p className="font-bold text-green-500 text-lg mb-2">
                    🎉 $ANTIRUG Token Deployed Successfully!
                  </p>
                </AlertDescription>
              </Alert>

              <Card data-testid="card-token-info">
                <CardHeader>
                  <CardTitle>Token Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Token Address (Vanity)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-muted rounded text-sm font-mono" data-testid="text-mint-address">
                        {deploymentResult.mintAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(deploymentResult.mintAddress!, 'Token address')}
                        data-testid="button-copy-address"
                        aria-label="Copy token address"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Transaction Signature</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-muted rounded text-xs font-mono truncate" data-testid="text-signature">
                        {deploymentResult.signature}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(deploymentResult.signature!, 'Signature')}
                        aria-label="Copy signature"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      asChild
                      data-testid="button-view-solscan"
                    >
                      <a href={`https://solscan.io/token/${deploymentResult.mintAddress}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Solscan
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                      data-testid="button-view-dexscreener"
                    >
                      <a href={`https://dexscreener.com/solana/${deploymentResult.mintAddress}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on DexScreener
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {deploymentResult.vanityKeypair && showPrivateKey && (
                <Alert className="border-destructive" data-testid="alert-keypair">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <p className="font-bold text-destructive text-lg">
                        ⚠️ SAVE THIS KEYPAIR IMMEDIATELY!
                      </p>
                      <p className="text-sm">
                        This is the ONLY time you'll see the private key. Import it into Phantom to access any fees or ownership.
                      </p>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Public Key:</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono" data-testid="text-vanity-public">
                              {deploymentResult.vanityKeypair.publicKey}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(deploymentResult.vanityKeypair!.publicKey, 'Public key')}
                              aria-label="Copy public key"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-destructive">Private Key (Secret):</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 p-2 bg-destructive/10 border border-destructive rounded text-xs font-mono" data-testid="text-vanity-private">
                              {deploymentResult.vanityKeypair.privateKey}
                            </code>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => copyToClipboard(deploymentResult.vanityKeypair!.privateKey, 'Private key')}
                              aria-label="Copy private key"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <p className="font-medium mb-2 text-sm">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>Copy the private key above</li>
                          <li>Open Phantom wallet → Settings → "Import Private Key"</li>
                          <li>Paste the private key</li>
                          <li>You now control the token mint and can access any fees</li>
                        </ol>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setShowPrivateKey(false)}
                        className="w-full"
                        data-testid="button-hide-keypair"
                      >
                        I've Saved It - Hide Keypair
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Card data-testid="card-deployment-steps">
                <CardHeader>
                  <CardTitle>Deployment Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 font-mono text-sm">
                    {deploymentResult.steps.map((step, i) => (
                      <div key={i} className="text-muted-foreground">
                        {step}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                onClick={() => {
                  setDeploymentResult(null);
                  setWalletPrivateKey('');
                  setShowPrivateKey(false);
                }}
                className="w-full"
                data-testid="button-deploy-another"
              >
                Deploy Another Token
              </Button>
            </>
          ) : (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-bold mb-2">Deployment Failed</p>
                <p className="text-sm mb-3">{deploymentResult.error}</p>
                {deploymentResult.steps.length > 0 && (
                  <div className="space-y-1 font-mono text-xs">
                    {deploymentResult.steps.map((step, i) => (
                      <div key={i}>{step}</div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setDeploymentResult(null)}
                  className="w-full mt-4"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
