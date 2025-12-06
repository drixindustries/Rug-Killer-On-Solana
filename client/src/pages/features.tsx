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
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";

export default function Features() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
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
          <Badge className="mb-4" data-testid="badge-ai-ml">NEW - AI/ML</Badge>
          <h2 className="text-3xl font-bold mb-2">Advanced AI Detection</h2>
          <p className="text-muted-foreground">Temporal GNN, Jito MEV, and Machine Learning scoring</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-tgn">
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-purple-500" />
              <CardTitle>Temporal GNN v2</CardTitle>
              <CardDescription>10-18% better accuracy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Graph neural network transaction analysis:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Star-shaped dump detection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Coordinated wallet clusters</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>LP drain pattern recognition</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-muted rounded text-xs">
                F1-Score: 0.966 vs 0.912 (heuristics)
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-jito">
            <CardHeader>
              <AlertTriangle className="h-8 w-8 mb-2 text-orange-500" />
              <CardTitle>Jito MEV Detection</CardTitle>
              <CardDescription>Bundle & sandwich attacks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                MEV bundle analysis for coordinated attacks:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Multi-wallet buys in same block</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Tip amount correlation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Bundle timing analysis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-machine-learning">
            <CardHeader>
              <Eye className="h-8 w-8 mb-2 text-blue-500" />
              <CardTitle>Machine Learning</CardTitle>
              <CardDescription>AI legitimacy assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Machine learning token legitimacy:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Composite risk scoring</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Rug probability estimation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Buy/Avoid recommendations</span>
                </div>
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
          <Badge className="mb-4" data-testid="badge-infrastructure">NEW - Infrastructure</Badge>
          <h2 className="text-3xl font-bold mb-2">Distributed RPC Infrastructure</h2>
          <p className="text-muted-foreground">25+ free public endpoints with intelligent load balancing</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card data-testid="card-rpc-endpoints">
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-yellow-500" />
              <CardTitle>25+ Free RPC Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No API keys required - works out of the box:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Solana-Official, Ankr, PublicNode, 1RPC</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>OnFinality, Serum, Extrnode, dRPC</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Auto-failover on errors</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-rate-limiting">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-blue-500" />
              <CardTitle>Smart Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Never hit 429 errors again:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Exponential backoff with jitter</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Request deduplication</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>20-second health monitoring</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-websocket">
            <CardHeader>
              <Bell className="h-8 w-8 mb-2 text-green-500" />
              <CardTitle>11 WebSocket Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Real-time monitoring without API keys:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>wss://api.mainnet-beta.solana.com</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>wss://rpc.ankr.com/solana/ws</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Auto-reconnect on disconnect</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-alpha-alerts">Premium</Badge>
          <h2 className="text-3xl font-bold mb-2">Alpha Alerts System</h2>
          <p className="text-muted-foreground">39+ smart money wallets tracked in real-time</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card data-testid="card-alpha-callers">
            <CardHeader>
              <Flame className="h-8 w-8 mb-2 text-orange-500" />
              <CardTitle>39+ Alpha Wallets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Monitor wallet activity from top traders:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Win rate & PNL tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Multi-wallet detection (2+ buying same token)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Influence scoring (60-100)</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Includes: top1, oracle-90%, Soloxbt, 97%SM, 100%SM...
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
                <CardTitle>Telegram Bot - 11 Commands</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2 text-sm">
                <div>
                  <code className="font-semibold">/execute</code>
                  <span className="text-muted-foreground ml-2">Full 52-metric analysis</span>
                </div>
                <div>
                  <code className="font-semibold">/first20</code>
                  <span className="text-muted-foreground ml-2">Top 20 holders</span>
                </div>
                <div>
                  <code className="font-semibold">/devaudit</code>
                  <span className="text-muted-foreground ml-2">Dev wallet history</span>
                </div>
                <div>
                  <code className="font-semibold">/blacklist</code>
                  <span className="text-muted-foreground ml-2">Check scam flags</span>
                </div>
                <div>
                  <code className="font-semibold">/whaletrack</code>
                  <span className="text-muted-foreground ml-2">Smart money wallets</span>
                </div>
                <div>
                  <code className="font-semibold">/kol</code>
                  <span className="text-muted-foreground ml-2">KOL wallet check</span>
                </div>
                <div className="pt-1 border-t">
                  <p className="text-xs font-semibold text-primary mb-1">🔥 NEW COMMANDS</p>
                </div>
                <div>
                  <code className="font-semibold">/price</code>
                  <span className="text-muted-foreground ml-2">Quick price lookup</span>
                </div>
                <div>
                  <code className="font-semibold">/rugcheck</code>
                  <span className="text-muted-foreground ml-2">Instant rug detection</span>
                </div>
                <div>
                  <code className="font-semibold">/liquidity</code>
                  <span className="text-muted-foreground ml-2">LP analysis</span>
                </div>
                <div>
                  <code className="font-semibold">/compare</code>
                  <span className="text-muted-foreground ml-2">Side-by-side comparison</span>
                </div>
                <div>
                  <code className="font-semibold">/trending</code>
                  <span className="text-muted-foreground ml-2">Top 10 by volume</span>
                </div>
              </div>
              <div className="pt-3 border-t">
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
                <CardTitle>Discord Bot - 11 Commands</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2 text-sm">
                <div>
                  <code className="font-semibold">/execute</code>
                  <span className="text-muted-foreground ml-2">Full 52-metric analysis</span>
                </div>
                <div>
                  <code className="font-semibold">/first20</code>
                  <span className="text-muted-foreground ml-2">Top 20 holders</span>
                </div>
                <div>
                  <code className="font-semibold">/devaudit</code>
                  <span className="text-muted-foreground ml-2">Dev wallet history</span>
                </div>
                <div>
                  <code className="font-semibold">/blacklist</code>
                  <span className="text-muted-foreground ml-2">Check scam flags</span>
                </div>
                <div>
                  <code className="font-semibold">/whaletrack</code>
                  <span className="text-muted-foreground ml-2">Smart money wallets</span>
                </div>
                <div>
                  <code className="font-semibold">/kol</code>
                  <span className="text-muted-foreground ml-2">KOL wallet check</span>
                </div>
                <div className="pt-1 border-t">
                  <p className="text-xs font-semibold text-primary mb-1">🔥 NEW COMMANDS</p>
                </div>
                <div>
                  <code className="font-semibold">/price</code>
                  <span className="text-muted-foreground ml-2">Quick price lookup</span>
                </div>
                <div>
                  <code className="font-semibold">/rugcheck</code>
                  <span className="text-muted-foreground ml-2">Instant rug detection</span>
                </div>
                <div>
                  <code className="font-semibold">/liquidity</code>
                  <span className="text-muted-foreground ml-2">LP analysis</span>
                </div>
                <div>
                  <code className="font-semibold">/compare</code>
                  <span className="text-muted-foreground ml-2">Side-by-side comparison</span>
                </div>
                <div>
                  <code className="font-semibold">/trending</code>
                  <span className="text-muted-foreground ml-2">Top 10 by volume</span>
                </div>
              </div>
              <div className="pt-3 border-t">
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

      <section className="mb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4" data-testid="badge-open-source">Open Source References</Badge>
          <h2 className="text-3xl font-bold mb-2">Research-Backed Detection</h2>
          <p className="text-muted-foreground">Our algorithms are inspired by cutting-edge open-source research</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card data-testid="card-github-degenfrends">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-purple-500" />
              <CardTitle>Rug Detection</CardTitle>
              <CardDescription>degenfrends/solana-rugchecker</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>TypeScript library for rug detection via holder analysis and liquidity checks.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a 
                  href="https://github.com/degenfrends/solana-rugchecker" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-github-dragon">
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-blue-500" />
              <CardTitle>Wallet Tracking</CardTitle>
              <CardDescription>1f1n/Dragon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Multi-chain tool for scraping profitable wallets and detecting bundled buys.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a 
                  href="https://github.com/1f1n/Dragon" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-github-0xthi">
            <CardHeader>
              <AlertTriangle className="h-8 w-8 mb-2 text-orange-500" />
              <CardTitle>Risk Scoring</CardTitle>
              <CardDescription>0xthi/solana-rug-pull-checker</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Token legitimacy scoring using Raydium SDK and Dexscreener integration.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a 
                  href="https://github.com/0xthi/solana-rug-pull-checker" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-github-archiesnipes">
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-yellow-500" />
              <CardTitle>New Token Monitor</CardTitle>
              <CardDescription>archiesnipes/solana-new-token-monitor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Real-time monitor for new Solana tokens via RPC websockets.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a 
                  href="https://github.com/archiesnipes/solana-new-token-monitor" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-github-safuco">
            <CardHeader>
              <Eye className="h-8 w-8 mb-2 text-green-500" />
              <CardTitle>Token Analyzer</CardTitle>
              <CardDescription>safuco/solana-token-analyzer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Node.js tool for deep token analysis including honeypot simulation.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a 
                  href="https://github.com/safuco/solana-token-analyzer" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-github-stackexchange">
            <CardHeader>
              <Wallet className="h-8 w-8 mb-2 text-indigo-500" />
              <CardTitle>Wallet Age Detection</CardTitle>
              <CardDescription>Solana StackExchange</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Community-driven code for calculating wallet age via transaction pagination.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a 
                  href="https://solana.stackexchange.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View Community →
                </a>
              </Button>
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
      </main>
      <Footer />
    </div>
  );
}
