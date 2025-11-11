import { Shield, TrendingUp, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-semibold text-xl">Solana Rug Killer</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Log In
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl font-bold tracking-tight">
              Protect Yourself from Solana Rug Pulls
            </h1>
            <p className="text-xl text-muted-foreground">
              Real-time analysis of Solana tokens using multi-source security data. 
              Monitor PumpFun launches and get instant alerts.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-get-started"
              >
                Get Started Free
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Start with a free 7-day trial. No credit card required.
            </p>
          </div>
        </section>

        <section id="features" className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <Shield className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Multi-Source Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Aggregates data from Rugcheck, GoPlus, DexScreener, and Jupiter for comprehensive risk assessment
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Live PumpFun Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Real-time WebSocket monitoring of new token launches on Pump.fun with instant risk analysis
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Market Intelligence</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Real-time price, volume, liquidity, and holder concentration data across all Solana DEXes
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Lock className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Discord & Telegram Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get instant notifications for high-risk tokens directly in your Discord or Telegram
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Free Trial</CardTitle>
                  <div className="text-3xl font-bold">$0</div>
                  <CardDescription>7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>Token risk analysis</li>
                    <li>Market data insights</li>
                    <li>PumpFun live monitor</li>
                    <li>No credit card required</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                  <div className="text-3xl font-bold">$20</div>
                  <CardDescription>per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>Everything in Free Trial</li>
                    <li>Discord DM alerts</li>
                    <li>Telegram DM alerts</li>
                    <li>Priority support</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Premium</CardTitle>
                  <div className="text-3xl font-bold">$100</div>
                  <CardDescription>per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>Everything in Basic</li>
                    <li>Discord group alerts</li>
                    <li>Telegram group alerts</li>
                    <li>Custom alert filters</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <p className="text-center text-muted-foreground mt-8">
              Hold 10M+ tokens to get full access for free!
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Solana Rug Detector - Protect your investments</p>
        </div>
      </footer>
    </div>
  );
}
