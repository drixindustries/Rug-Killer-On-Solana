import { Shield, TrendingUp, Lock, Zap, CheckCircle, AlertTriangle, Eye, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotShowcase } from "@/components/bot-showcase";
import { ContractAddress } from "@/components/contract-address";

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
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Multi-Source Security Analysis</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-tight">
              Stop Losing Money to
              <span className="block text-primary mt-2">Solana Rug Pulls</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Analyze any Solana token in seconds. Get real-time alerts for new PumpFun launches, 
              smart money wallet activity, and automated scam detection powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-get-started"
              >
                Start Free Trial
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => window.location.href = '/features'}
                data-testid="button-view-features"
              >
                View All Features
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2" data-testid="badge-free-trial">
                <Shield className="w-4 h-4 text-green-500" />
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center gap-2" data-testid="badge-no-credit-card">
                <Shield className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2" data-testid="badge-cancel-anytime">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
            <div className="max-w-2xl mx-auto pt-8">
              <ContractAddress />
            </div>
          </div>
        </section>

        <section id="features" className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Everything You Need to Trade Safely</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Comprehensive security analysis, real-time alerts, and premium bot access
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="hover-elevate">
                <CardHeader>
                  <Shield className="w-10 h-10 text-primary mb-3" />
                  <CardTitle className="text-xl">Multi-Source Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-base">
                    Aggregates security data from RugCheck, GoPlus, DexScreener, and Jupiter
                  </CardDescription>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Authority & liquidity checks</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Holder concentration analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>0-100 risk scoring</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <AlertTriangle className="w-10 h-10 text-orange-500 mb-3" />
                  <CardTitle className="text-xl">AI-Powered Blacklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-base">
                    Automated detection of honeypots, wash trading, and coordinated pump schemes
                  </CardDescription>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>6 detection rules</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Evidence-based flagging</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Real-time scam tracking</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <Zap className="w-10 h-10 text-yellow-500 mb-3" />
                  <CardTitle className="text-xl">Alpha Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-base">
                    Real-time monitoring of influential wallets and new PumpFun launches
                  </CardDescription>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Smart money wallet tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>WebSocket new launches</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Quality-filtered gems</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <Bot className="w-10 h-10 text-blue-500 mb-3" />
                  <CardTitle className="text-xl">Telegram & Discord Bots</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-base">
                    Full token analysis directly in your messaging apps
                  </CardDescription>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>/execute for analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>/first20 holder breakdown</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>/blacklist scam checks</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <Eye className="w-10 h-10 text-purple-500 mb-3" />
                  <CardTitle className="text-xl">Honeypot Detection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-base">
                    GoPlus Security integration for contract scanning
                  </CardDescription>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Can't sell detection</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>High sell tax warnings</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Hidden owner flags</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <TrendingUp className="w-10 h-10 text-green-500 mb-3" />
                  <CardTitle className="text-xl">Real-Time Market Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-base">
                    DexScreener & Jupiter integration for live pricing
                  </CardDescription>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Price, volume, market cap</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>24h change tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Liquidity aggregation</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <BotShowcase />

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
