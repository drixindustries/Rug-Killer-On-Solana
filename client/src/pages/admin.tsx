import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Rocket, Shield } from 'lucide-react';

export default function Admin() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3" data-testid="heading-admin">
          <Shield className="h-10 w-10" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage creator wallet and deploy tokens
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate" data-testid="card-creator-wallet">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Creator Wallet
            </CardTitle>
            <CardDescription>
              Manage your pump.fun creator wallet to earn 0.05% of trading volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate or view your creator wallet for earning pump.fun rewards. Import the wallet into Phantom to claim accumulated SOL.
            </p>
            <Button asChild className="w-full" data-testid="button-creator-wallet">
              <Link href="/admin/wallet">
                Manage Creator Wallet →
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-deploy-token">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deploy Token (Secure Local Script)
            </CardTitle>
            <CardDescription>
              Download secure script to deploy $RUGK with vanity address ending in "tek"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              100% secure deployment script that runs locally on your computer. Your private keys never leave your device.
            </p>
            <div className="flex gap-2">
              <Button asChild className="flex-1" data-testid="button-download-script">
                <a href="/DEPLOY_RUGK_LOCALLY.js" download>
                  Download Script
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1" data-testid="button-view-instructions">
                <a href="/DEPLOYMENT_INSTRUCTIONS.md" download>
                  View Instructions
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires Node.js 18+ and 0.05-0.1 SOL. Takes 5-15 minutes.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6" data-testid="card-instructions">
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1">1. Set Up Creator Wallet (Optional)</h3>
            <p className="text-muted-foreground">
              If you want to earn pump.fun creator rewards (0.05% of trading volume), generate a creator wallet first. Otherwise, skip to step 2.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. Download & Run Deployment Script</h3>
            <p className="text-muted-foreground">
              Download the secure deployment script and run it locally on your computer. Your wallet's private key never leaves your device - 100% secure.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">3. Deploy $RUGK Token</h3>
            <p className="text-muted-foreground">
              The script generates a vanity address ending in "tek" (~5-15 minutes) and deploys the token to Solana mainnet. Costs ~0.05 SOL.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">4. Import to Phantom</h3>
            <p className="text-muted-foreground">
              After deployment, import the token mint keypair into Phantom wallet. This gives you full control over the token and any associated fees.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
