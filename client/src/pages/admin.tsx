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
              Deploy Token
            </CardTitle>
            <CardDescription>
              Deploy $RUGK token with a vanity address ending in "tek"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a vanity Solana address and deploy the RugKiller ($RUGK) token to mainnet. Takes 5-15 minutes including vanity generation.
            </p>
            <Button asChild className="w-full" data-testid="button-deploy-token">
              <Link href="/admin/deploy-token">
                Deploy $RUGK Token →
              </Link>
            </Button>
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
            <h3 className="font-semibold mb-1">2. Deploy $RUGK Token</h3>
            <p className="text-muted-foreground">
              Use any Solana wallet with ~0.05-0.1 SOL to deploy the RugKiller token. The system will generate a vanity address ending in "tek" and give you the keypair to import into Phantom.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">3. Import to Phantom</h3>
            <p className="text-muted-foreground">
              After deployment, import the token mint keypair into Phantom wallet. This gives you full control over the token and any associated fees.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
