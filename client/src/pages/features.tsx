import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  TrendingUp, 
  Zap, 
  Eye, 
  Lock, 
  Droplet, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Flame,
  Wallet,
  Bot,
  Bell,
  Coins
} from "lucide-react";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { Link } from "wouter";

export default function Features() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-features">
          Complete Rug Pull Protection Suite
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Multi-source security analysis, AI-powered blacklist, real-time alpha alerts, and premium bot access. 
          Everything you need to trade Solana safely.
        </p>
      </div>

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-core-analysis">Core Features</Badge>
          <h2 className="text-3xl font-bold mb-2">Comprehensive Token Analysis</h2>
          <p className="text-muted-foreground">Multi-source data aggregation combining RugCheck, GoPlus, DexScreener, and Jupiter</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card data-testid="card-feature-authorities">
            <CardHeader>
              <Lock className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Authority Checks</CardTitle>
              <CardDescription>Mint & freeze authority monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Detects active mint authority (inflation risk)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Identifies freeze authority (wallet lock risk)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Verifies authority revocation status</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-holders">
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Holder Analysis</CardTitle>
              <CardDescription>Top holder concentration & distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Top 10 & Top 20 holder breakdown</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Whale concentration warnings</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Total unique holder count</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-liquidity">
            <CardHeader>
              <Droplet className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Liquidity Pool Analysis</CardTitle>
              <CardDescription>LP status, burn percentage & depth</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>LP lock/burn verification</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Total liquidity amount (USD)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Rug pull liquidity risk scoring</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-rugcheck">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>RugCheck Integration</CardTitle>
              <CardDescription>Community-driven risk scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>0-100 risk score from rugcheck.xyz</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Detailed risk factor breakdown</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Market manipulation detection</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-goplus">
            <CardHeader>
              <Eye className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>GoPlus Security</CardTitle>
              <CardDescription>Honeypot & contract scanning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Honeypot detection (can't sell check)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>High sell tax identification</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Hidden owner flags</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-market-data">
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Real-Time Market Data</CardTitle>
              <CardDescription>DexScreener & Jupiter pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Live price, volume, market cap</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>24h price change tracking</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>DEX liquidity aggregation</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-ai-blacklist">AI-Powered</Badge>
          <h2 className="text-3xl font-bold mb-2">Automated Blacklist System</h2>
          <p className="text-muted-foreground">6 detection rules analyzing suspicious wallet behavior</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card data-testid="card-blacklist-detection">
            <CardHeader>
              <AlertTriangle className="h-8 w-8 mb-2 text-orange-500" />
              <CardTitle>Automated Detection Rules</CardTitle>
              <CardDescription>Real-time analysis of wallet patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-1">🍯 Honeypot Detection</p>
                <p className="text-xs text-muted-foreground">Flags wallets deploying unsellable tokens</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">💸 High Sell Tax</p>
                <p className="text-xs text-muted-foreground">Identifies tokens with {'>'}  20% sell fees</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">🔓 Suspicious Authorities</p>
                <p className="text-xs text-muted-foreground">Detects active mint/freeze on launched tokens</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">🧼 Wash Trading</p>
                <p className="text-xs text-muted-foreground">Catches fake volume patterns</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">Coordinated Pump Groups</p>
                <p className="text-xs text-muted-foreground">Identifies coordinated pump schemes</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">🎯 Multiple Violations</p>
                <p className="text-xs text-muted-foreground">Tracks repeat offenders automatically</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-blacklist-reporting">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-red-500" />
              <CardTitle>Evidence & Reporting</CardTitle>
              <CardDescription>Transparent flagging with proof</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Every blacklist entry includes:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Severity score (0-100)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Violation type breakdown</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Evidence (token addresses, transaction hashes)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Timestamp of detection</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded">
                <p className="text-xs font-semibold mb-1">API Access</p>
                <code className="text-xs">GET /api/blacklist/check/:wallet</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-alpha-alerts">Premium</Badge>
          <h2 className="text-3xl font-bold mb-2">Alpha Alerts System</h2>
          <p className="text-muted-foreground">Real-time monitoring of influential wallets and new launches</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card data-testid="card-alpha-callers">
            <CardHeader>
              <Flame className="h-8 w-8 mb-2 text-orange-500" />
              <CardTitle>Smart Money Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Monitor wallet activity from influential traders:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Configurable wallet watchlist</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Real-time transaction monitoring</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Instant buy/sell notifications</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Auto-pings Discord/Telegram when monitored wallets trade
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-pumpfun-monitor">
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-yellow-500" />
              <CardTitle>Pump.fun WebSocket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Real-time new token launch monitoring:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>WebSocket connection to pump.fun</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Instant notifications for new launches</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Quality filtering before alert</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-quality-filter">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-green-500" />
              <CardTitle>Quality Filtering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Alerts only sent if token passes:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>RugCheck score {'>'}  85</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Not flagged as honeypot</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Liquidity {'>'}  $5,000</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Only high-quality gems make it through
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-bots">Automation</Badge>
          <h2 className="text-3xl font-bold mb-2">Telegram & Discord Bots</h2>
          <p className="text-muted-foreground">Full analysis directly in your favorite messaging app</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card data-testid="card-telegram-features">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <SiTelegram className="h-8 w-8 text-[#0088cc]" />
                <CardTitle>Telegram Bot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <code className="text-sm font-semibold">/execute [token]</code>
                <p className="text-xs text-muted-foreground mt-1">Complete risk analysis with all metrics</p>
              </div>
              <div>
                <code className="text-sm font-semibold">/first20 [token]</code>
                <p className="text-xs text-muted-foreground mt-1">Top 20 holder breakdown</p>
              </div>
              <div>
                <code className="text-sm font-semibold">/devtorture [token]</code>
                <p className="text-xs text-muted-foreground mt-1">Dev wallet history</p>
              </div>
              <div>
                <code className="text-sm font-semibold">/blacklist [wallet]</code>
                <p className="text-xs text-muted-foreground mt-1">Check scam flags</p>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Send any token address for quick analysis
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-discord-features">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <SiDiscord className="h-8 w-8 text-[#5865F2]" />
                <CardTitle>Discord Bot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <code className="text-sm font-semibold">/execute [token]</code>
                <p className="text-xs text-muted-foreground mt-1">Rich embeds with color-coded risk</p>
              </div>
              <div>
                <code className="text-sm font-semibold">/first20 [token]</code>
                <p className="text-xs text-muted-foreground mt-1">Holder concentration report</p>
              </div>
              <div>
                <code className="text-sm font-semibold">/devtorture [token]</code>
                <p className="text-xs text-muted-foreground mt-1">Transaction history tracking</p>
              </div>
              <div>
                <code className="text-sm font-semibold">/blacklist [wallet]</code>
                <p className="text-xs text-muted-foreground mt-1">Scammer verification</p>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  🎨 Beautiful embeds with red/yellow/green risk indicators
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Link href="/bot-setup">
            <Button size="lg" data-testid="button-setup-bots">
              <Bot className="h-5 w-5 mr-2" />
              Set Up Bots Now
            </Button>
          </Link>
        </div>
      </section>

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-payments">Flexible</Badge>
          <h2 className="text-3xl font-bold mb-2">Multiple Payment Options</h2>
          <p className="text-muted-foreground">Subscribe with cards, crypto, or redeem codes</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card data-testid="card-whop-payments">
            <CardHeader>
              <Coins className="h-8 w-8 mb-2 text-green-500" />
              <CardTitle>Whop Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Credit/debit card payments</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Individual, Group, Lifetime tiers</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>7-day free trial included</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-crypto-payments">
            <CardHeader>
              <Wallet className="h-8 w-8 mb-2 text-purple-500" />
              <CardTitle>Crypto Payments (SOL)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Pay with Solana (SOL)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>6 confirmation safety</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Full audit trail</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-redemption-codes">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-blue-500" />
              <CardTitle>Redemption Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Lifetime access codes</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Usage limits & expiration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Transaction-safe redemption</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="text-center py-12 bg-primary/5 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">Ready to Trade Safely?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Get instant access to all features with our 7-day free trial. No credit card required for trial.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/pricing">
            <Button size="lg" data-testid="button-view-pricing-cta">
              View Pricing Plans
            </Button>
          </Link>
          <Link href="/documentation">
            <Button size="lg" variant="outline" data-testid="button-view-docs-cta">
              View Documentation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
