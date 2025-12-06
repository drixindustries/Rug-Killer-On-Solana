import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Shield, Zap, TrendingUp, Lock, Database, Bot, Wallet, Code, AlertTriangle, CheckCircle, BookOpen } from "lucide-react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CONTRACT_ADDRESS } from "@/constants";
import { MascotCallout } from "@/components/mascot-callout";

// PDF Document Component with comprehensive Whitepaper content
const pdfStyles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#0a0a0a',
    color: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 25,
    color: '#888888',
    fontFamily: 'Courier',
  },
  section: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #222222',
  },
  heading: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#00ff88',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#00ccff',
    fontFamily: 'Courier',
  },
  text: {
    marginBottom: 5,
    lineHeight: 1.6,
    color: '#cccccc',
  },
  list: {
    marginLeft: 20,
    marginBottom: 6,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 9,
    backgroundColor: '#1a1a1a',
    padding: 8,
    color: '#00ff88',
    border: '1px solid #333333',
    marginTop: 4,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#555555',
    borderTop: '1px solid #222222',
    paddingTop: 10,
  },
  highlight: {
    color: '#00ccff',
    fontWeight: 'bold',
  },
  warning: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  metric: {
    backgroundColor: '#1a1a1a',
    padding: 6,
    marginBottom: 4,
    borderLeft: '3px solid #00ff88',
  },
});

const DocumentationPDF = () => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>RUG KILLER ALPHA BOT</Text>
      <Text style={pdfStyles.subtitle}>WHITEPAPER v2.0 | ADVANCED SOLANA TOKEN SECURITY PLATFORM</Text>
      
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>EXECUTIVE SUMMARY</Text>
        <Text style={pdfStyles.text}>
          Rug Killer Alpha Bot is the most advanced Solana token security platform, combining AI-powered 
          detection, real-time smart money tracking, and distributed RPC infrastructure to deliver 
          industry-leading 99%+ rug pull detection accuracy.
        </Text>
        <View style={pdfStyles.metric}>
          <Text style={pdfStyles.text}>• 99%+ Overall Detection Rate | 95-98% TGN Detection | F1-Score: 0.966</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>$ANTIRUG TOKEN</Text>
        <Text style={pdfStyles.subheading}>Contract Address (CA)</Text>
        <Text style={pdfStyles.code}>{CONTRACT_ADDRESS}</Text>
        <Text style={pdfStyles.text}>
          Hold 10M+ tokens for lifetime FREE access to all WHALE tier features.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>6-LAYER DETECTION SYSTEM</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>1. AUTHORITY ANALYSIS - Mint/freeze authority exploitation detection</Text>
          <Text style={pdfStyles.text}>2. HOLDER DISTRIBUTION - Whale concentration, sybil attack detection</Text>
          <Text style={pdfStyles.text}>3. LIQUIDITY ANALYSIS - LP locks, burns, rug pull pattern recognition</Text>
          <Text style={pdfStyles.text}>4. TGN + ML DETECTION - Temporal Graph Neural Networks + SyraxML scoring</Text>
          <Text style={pdfStyles.text}>5. MEV DETECTION - Jito bundle detection, sandwich attack identification</Text>
          <Text style={pdfStyles.text}>6. SMART MONEY - 39+ alpha wallet tracking, insider trading detection</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>AI/ML TECHNOLOGIES</Text>
        <Text style={pdfStyles.subheading}>Temporal Graph Neural Network (TGN2)</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Star-shaped dumps: Dev wallet → many recipients detection</Text>
          <Text style={pdfStyles.text}>• Coordinated wallet clusters: Synchronized buying/selling patterns</Text>
          <Text style={pdfStyles.text}>• Bridge wallets: Single-use fund obfuscation</Text>
          <Text style={pdfStyles.text}>• LP drains: One-way liquidity removal patterns</Text>
          <Text style={pdfStyles.text}>• 10-18% better accuracy than traditional heuristics</Text>
        </View>
        <Text style={pdfStyles.subheading}>Jito MEV Bundle Detection</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Detects coordinated multi-wallet buys in same block</Text>
          <Text style={pdfStyles.text}>• Identifies tip amounts indicating MEV extraction</Text>
          <Text style={pdfStyles.text}>• Correlates bundle timing with price movements</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>BOT COMMANDS (11 each)</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• /execute [token] - Full 52-metric risk analysis with Safety Score</Text>
          <Text style={pdfStyles.text}>• /first20 [token] - Top 20 holder breakdown with percentages</Text>
          <Text style={pdfStyles.text}>• /trace [token] - On-chain forensic tracing (ZachXBT-style)</Text>
          <Text style={pdfStyles.text}>• /devaudit [wallet] - Developer wallet transaction history</Text>
          <Text style={pdfStyles.text}>• /blacklist [wallet] - AI blacklist database check</Text>
          <Text style={pdfStyles.text}>• /graderepo [url] - GitHub repository quality grading</Text>
          <Text style={pdfStyles.text}>• /price, /liquidity, /compare, /trending, /whaletrack</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>SUBSCRIPTION TIERS</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• FREE Trial: 3 analyses/day, 7 days, no card required</Text>
          <Text style={pdfStyles.text}>• PRO ($29/mo): Unlimited analyses, bot access, AI blacklist</Text>
          <Text style={pdfStyles.text}>• WHALE ($99/mo): API access, smart money tracking, custom webhooks</Text>
          <Text style={pdfStyles.text}>• TOKEN HOLDER: 10M+ tokens = LIFETIME free WHALE access</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Rug Killer Alpha Bot - Whitepaper Page 1 of 3
      </Text>
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>INFRASTRUCTURE & DETECTION</Text>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>DISTRIBUTED RPC INFRASTRUCTURE</Text>
        <Text style={pdfStyles.subheading}>25+ Free Public RPC Endpoints</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>HIGH PRIORITY: Solana-Official, Ankr-Public, PublicNode, OnFinality, 1RPC</Text>
          <Text style={pdfStyles.text}>MEDIUM: Serum, Helius-Public, Extrnode, dRPC, Gateway-FM, KJNodes</Text>
          <Text style={pdfStyles.text}>BACKUP: GenesysGo, HelloMoon, Syndica, Triton, + 10 more</Text>
        </View>
        <Text style={pdfStyles.subheading}>11 Free WebSocket Endpoints</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• wss://api.mainnet-beta.solana.com (Official)</Text>
          <Text style={pdfStyles.text}>• wss://rpc.ankr.com/solana/ws, wss://solana-rpc.publicnode.com</Text>
          <Text style={pdfStyles.text}>• Real-time monitoring without API keys required</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>SMART RATE LIMIT HANDLING</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Exponential Backoff: 500ms → 1s → 2s → 4s (max 30s)</Text>
          <Text style={pdfStyles.text}>• 20% Jitter: Prevents thundering herd on rate limit recovery</Text>
          <Text style={pdfStyles.text}>• Request Deduplication: Same token = single analysis</Text>
          <Text style={pdfStyles.text}>• 30-second cooldown between analyses of same token</Text>
          <Text style={pdfStyles.text}>• Automatic failover across 25+ endpoints</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>SMART MONEY TRACKING</Text>
        <Text style={pdfStyles.subheading}>39+ Alpha Wallets Monitored</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Real-time webhook monitoring via Helius</Text>
          <Text style={pdfStyles.text}>• Win rate and PNL tracking per wallet</Text>
          <Text style={pdfStyles.text}>• Multi-wallet detection: Alerts when 2+ wallets buy same token</Text>
          <Text style={pdfStyles.text}>• Influence scoring: 60-100 based on historical performance</Text>
          <Text style={pdfStyles.text}>• Example wallets: top1, oracle-90%, Soloxbt, 97%SM, 100%SM</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>ADVANCED DETECTION FEATURES</Text>
        <Text style={pdfStyles.subheading}>Serial Rugger Detection</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Cross-references deployer wallets against known ruggers</Text>
          <Text style={pdfStyles.text}>• Tracks funding patterns from previous rugs</Text>
          <Text style={pdfStyles.text}>• Identifies wallet clusters used in multiple scams</Text>
        </View>
        <Text style={pdfStyles.subheading}>Aged Wallet Detection</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• 90+ days: Medium risk | 180+ days: High risk | 2+ years: Critical</Text>
          <Text style={pdfStyles.text}>• Synchronized activation within 1-minute windows flagged</Text>
          <Text style={pdfStyles.text}>• Similar purchase amounts indicate automated scripts</Text>
        </View>
        <Text style={pdfStyles.subheading}>DevsNightmare Analysis</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Team allocation percentage analysis</Text>
          <Text style={pdfStyles.text}>• Insider holdings detection</Text>
          <Text style={pdfStyles.text}>• Sniper activity correlation</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Rug Killer Alpha Bot - Whitepaper Page 2 of 3
      </Text>
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>USE CASES & API REFERENCE</Text>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>USE CASE 1: RUG PULL DETECTION</Text>
        <Text style={pdfStyles.text}>
          New memecoin launches on Pump.fun. Our system instantly analyzes:
        </Text>
        <View style={pdfStyles.metric}>
          <Text style={pdfStyles.text}>Safety Score: 12/100 | Danger Level: 88/100</Text>
        </View>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>🔴 Mint authority ENABLED (can print infinite tokens)</Text>
          <Text style={pdfStyles.text}>🔴 Top 10 holders own 78% of supply</Text>
          <Text style={pdfStyles.text}>🔴 5 aged wallets (180+ days) bought simultaneously</Text>
          <Text style={pdfStyles.text}>🔴 Deployer linked to 3 previous rugs</Text>
          <Text style={pdfStyles.text}>🔴 TGN P(rug) = 94.2% | Star-shaped dump pattern</Text>
        </View>
        <Text style={pdfStyles.text}>RECOMMENDATION: AVOID - High probability of rug pull</Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>USE CASE 2: SMART MONEY ENTRY</Text>
        <Text style={pdfStyles.text}>
          Alpha wallet "oracle-90%" buys new token. Alert sent instantly:
        </Text>
        <View style={pdfStyles.metric}>
          <Text style={pdfStyles.text}>Safety Score: 87/100 | Win Rate: 90% (45W/5L) | PNL: +847 SOL</Text>
        </View>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>✅ Mint authority revoked</Text>
          <Text style={pdfStyles.text}>✅ Freeze authority revoked</Text>
          <Text style={pdfStyles.text}>✅ LP burned (100%)</Text>
          <Text style={pdfStyles.text}>✅ Healthy holder distribution</Text>
          <Text style={pdfStyles.text}>✅ Clean deployer history</Text>
        </View>
        <Text style={pdfStyles.text}>RECOMMENDATION: DYOR, but looks promising</Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>API ENDPOINTS</Text>
        <Text style={pdfStyles.subheading}>Token Analysis</Text>
        <Text style={pdfStyles.code}>POST /api/analyze {'{'}"tokenAddress": "..."{'}'}</Text>
        <Text style={pdfStyles.subheading}>Wallet Verification</Text>
        <Text style={pdfStyles.code}>GET /api/wallet/challenge (5min expiry)</Text>
        <Text style={pdfStyles.code}>POST /api/wallet/verify {'{'}"signature": "..."{'}'}</Text>
        <Text style={pdfStyles.subheading}>Blacklist Operations</Text>
        <Text style={pdfStyles.code}>GET /api/blacklist/check/:wallet</Text>
        <Text style={pdfStyles.code}>POST /api/blacklist/report</Text>
        <Text style={pdfStyles.subheading}>GitHub Grading</Text>
        <Text style={pdfStyles.code}>POST /api/grade-repo {'{'}"repoUrl": "..."{'}'}</Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>SAFETY SCORE SYSTEM</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>🟢 80-100: SAFE - Low risk, proceed with caution</Text>
          <Text style={pdfStyles.text}>🟡 60-79: MODERATE - Some concerns, research more</Text>
          <Text style={pdfStyles.text}>🟠 40-59: RISKY - Multiple red flags detected</Text>
          <Text style={pdfStyles.text}>🔴 0-39: DANGEROUS - High probability of rug pull</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>LINKS & RESOURCES</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Website: https://rugkilleralphabot.fun</Text>
          <Text style={pdfStyles.text}>• Whitepaper: /documentation (this PDF)</Text>
          <Text style={pdfStyles.text}>• Discord: @RugKillerAlphaBot</Text>
          <Text style={pdfStyles.text}>• Telegram: @RugKillerAlphaBot</Text>
          <Text style={pdfStyles.text}>• Token: HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Rug Killer Alpha Bot - Whitepaper v2.0 | Protecting Solana investors from rug pulls
      </Text>
    </Page>
  </Document>
);

export default function Documentation() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-1">
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">On This Page</h3>
                <nav className="space-y-1">
                  <button onClick={() => scrollToSection('overview')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Overview</button>
                  <button onClick={() => scrollToSection('multi-source')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Multi-Source Analysis</button>
                  <button onClick={() => scrollToSection('token-analysis')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Token Analysis</button>
                  <button onClick={() => scrollToSection('bots')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Bots</button>
                  <button onClick={() => scrollToSection('security')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Security</button>
                  <button onClick={() => scrollToSection('ai-blacklist')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">AI Blacklist</button>
                  <button onClick={() => scrollToSection('pricing')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Pricing</button>
                  <button onClick={() => scrollToSection('getting-started')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">Getting Started</button>
                  <button onClick={() => scrollToSection('api-endpoints')} className="block text-sm hover:text-primary transition-colors text-left w-full py-1">API</button>
                </nav>
              </div>
            </aside>
            <div className="lg:col-start-2">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold">Whitepaper v2.0</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
              Advanced Solana token security platform with AI-powered detection, smart money tracking, and 25+ distributed RPC endpoints
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://rugkiller.gitbook.io/docs" target="_blank" rel="noopener noreferrer">
                <Button size="lg" data-testid="button-view-gitbook">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View GitBook Docs
                </Button>
              </a>
              
              <PDFDownloadLink
                document={<DocumentationPDF />}
                fileName="rug-killer-whitepaper-v2.pdf"
              >
                {({ loading }) => (
                  <Button size="lg" variant="outline" disabled={loading} data-testid="button-download-pdf">
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? 'Generating PDF...' : 'Download Whitepaper PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          </div>

          <MascotCallout />

          {/* Overview Section */}
          <Card className="mb-8" data-testid="card-overview" id="overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Platform Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground leading-relaxed">
                Advanced Solana token security platform that analyzes SPL tokens for rug pull risks using 
                multi-source blockchain intelligence and AI-powered detection algorithms.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Combines data from Rugcheck, GoPlus Security, DexScreener, and Jupiter to deliver comprehensive 
                risk assessments covering mint/freeze authority, holder concentration, liquidity depth, and 
                transaction patterns.
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card data-testid="card-multi-source" id="multi-source">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle>Data Sources</CardTitle>
                </div>
                <CardDescription>Multi-source blockchain intelligence aggregation</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-sm">Rugcheck.xyz</strong>
                      <p className="text-muted-foreground text-xs mt-0.5">Risk scores & liquidity analysis</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-sm">GoPlus Security</strong>
                      <p className="text-muted-foreground text-xs mt-0.5">Honeypot detection & contract scanning</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-sm">DexScreener</strong>
                      <p className="text-muted-foreground text-xs mt-0.5">Real-time market data & charts</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-sm">Jupiter Aggregator</strong>
                      <p className="text-muted-foreground text-xs mt-0.5">Price verification & DEX aggregation</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-token-analysis" id="token-analysis">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Analysis Features</CardTitle>
                </div>
                <CardDescription>Comprehensive risk assessment metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Authority checks</strong> – Mint & freeze authority detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Holder analysis</strong> – Top 20 holders & concentration %</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Liquidity assessment</strong> – Pool depth & LP burn status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Risk scoring</strong> – 0-100 score with red flags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Holder maps</strong> – Visual distribution via BubbleMaps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Transaction history</strong> – Recent activity patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>AI blacklist</strong> – Automated wallet flagging</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-bots" id="bots">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle>Discord & Telegram Bots</CardTitle>
                </div>
                <CardDescription>Instant analysis with color-coded risk indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Badge variant="secondary" className="mb-2">Public Access</Badge>
                  <div>
                    <p className="font-semibold mb-2">Available Commands:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Code className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">/execute [token]</code>
                          <p className="text-muted-foreground text-xs">Full comprehensive risk analysis</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Code className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">/first20 [token]</code>
                          <p className="text-muted-foreground text-xs">Detailed top 20 holder breakdown with percentages</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Code className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">/devaudit [wallet]</code>
                          <p className="text-muted-foreground text-xs">Complete dev wallet transaction history and patterns</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Code className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">/blacklist [wallet]</code>
                          <p className="text-muted-foreground text-xs">Check if wallet is flagged in AI blacklist database</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Both bots support rich formatting (Telegram markdown, Discord embeds) with 
                    green/yellow/orange/red color-coded risk indicators for quick visual assessment.
                  </p>
                  <div className="pt-3 border-t">
                    <a href="/bot-guide" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                      View Complete Bot Command Reference →
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Detailed examples and usage tips for all commands
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bot Usage Guides */}
            <Card data-testid="card-telegram-guide" className="mb-8">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle>Telegram Bot Usage Guide</CardTitle>
                </div>
                <CardDescription>Complete guide for using the bot in direct messages and groups/channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Individual Usage */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="outline">Individual Use</Badge>
                      Direct Messages (Private Chat)
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 1: Find the Bot</p>
                        <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                          <li>Open Telegram app or web.telegram.org</li>
                          <li>Click the search bar at the top</li>
                          <li>Search for: <code className="bg-background px-1 py-0.5 rounded">@RugKillerAlphaBot</code></li>
                          <li>Click on the bot with the verified checkmark</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 2: Start the Bot</p>
                        <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                          <li>Click the blue "Start" button at the bottom</li>
                          <li>The bot will send you a welcome message</li>
                          <li>You're ready to analyze tokens!</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 3: Use Commands</p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="font-medium mb-1">Full Token Analysis:</p>
                            <code className="bg-background px-2 py-1 rounded block">/execute 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt</code>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Top 20 Holders:</p>
                            <code className="bg-background px-2 py-1 rounded block">/first20 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt</code>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Check Wallet History:</p>
                            <code className="bg-background px-2 py-1 rounded block">/devaudit HgK4jnXmQoNZWVJE3NSJF3JfhGNp4gAJF7ZqvDBCqxXE</code>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Check Blacklist:</p>
                            <code className="bg-background px-2 py-1 rounded block">/blacklist HgK4jnXmQoNZWVJE3NSJF3JfhGNp4gAJF7ZqvDBCqxXE</code>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500 p-3 rounded-md">
                        <p className="font-semibold text-xs mb-1 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Pro Tips:
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li>• Responses appear in 2-5 seconds with markdown formatting</li>
                          <li>• Color indicators: 🟢 Safe, 🟡 Caution, 🟠 Warning, 🔴 Danger</li>
                          <li>• You can analyze unlimited tokens with active subscription</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Group Usage */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="outline">Group/Channel Use</Badge>
                      Adding Bot to Groups and Channels
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 1: Add Bot to Group/Channel</p>
                        <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                          <li>Open your Telegram group or channel</li>
                          <li>Click the group/channel name at the top</li>
                          <li>Click "Add Members" (for groups) or "Subscribers" (for channels)</li>
                          <li>Search for: <code className="bg-background px-1 py-0.5 rounded">@RugKillerAlphaBot</code></li>
                          <li>Click "Add" or "Invite"</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 2: Set Bot Permissions (Groups Only)</p>
                        <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                          <li>Go to Group Settings → Administrators</li>
                          <li>Find @RugKillerAlphaBot in the member list</li>
                          <li>Required permissions: "Send Messages", "Send Media"</li>
                          <li>Optional: Enable "Read Messages" for auto-responses</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 3: Use Commands in Group</p>
                        <div className="space-y-2 text-xs">
                          <p className="text-muted-foreground">Same commands work in groups! Just type them in the chat:</p>
                          <code className="bg-background px-2 py-1 rounded block">/execute@RugKillerAlphaBot 2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt</code>
                          <p className="text-muted-foreground italic">
                            Note: Adding <code className="bg-background px-1 py-0.5 rounded">@RugKillerAlphaBot</code> after the command 
                            ensures the right bot responds if multiple bots are in the group.
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500 p-3 rounded-md">
                        <p className="font-semibold text-xs mb-1">Group Admin Features:</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li>• Set auto-scan for new token mentions in group messages</li>
                          <li>• Pin bot responses for important alerts</li>
                          <li>• All group members can use commands (with active group subscription)</li>
                          <li>• Bot responses are public - everyone in the group can see them</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-discord-guide" className="mb-8">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle>Discord Bot Usage Guide</CardTitle>
                </div>
                <CardDescription>Complete guide for using the bot in DMs and servers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Individual Usage */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="outline">Individual Use</Badge>
                      Direct Messages (DMs)
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 1: Invite Bot to a Server First</p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>⚠️ Discord requires bots to share at least one server with you before DMs work.</p>
                          <Button
                            variant="default"
                            size="sm"
                            asChild
                            className="mt-2"
                          >
                            <a 
                              href="https://discord.com/oauth2/authorize?client_id=1439815848628846654&permissions=3072&scope=bot%20applications.commands" 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              Invite Bot to Your Server
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 2: Send DM to Bot</p>
                        <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                          <li>Find the bot in your server's member list</li>
                          <li>Right-click on "RugKillerAlphaBot"</li>
                          <li>Select "Message"</li>
                          <li>Start typing commands in the DM</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 3: Use Slash Commands</p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="font-medium mb-1">Type <code className="bg-background px-1 py-0.5 rounded">/</code> to see all commands:</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Full Token Analysis:</p>
                            <code className="bg-background px-2 py-1 rounded block">/execute token_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt</code>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Top 20 Holders:</p>
                            <code className="bg-background px-2 py-1 rounded block">/first20 token_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt</code>
                          </div>
                          <div>
                            <p className="font-medium mb-1">Check Wallet:</p>
                            <code className="bg-background px-2 py-1 rounded block">/devaudit wallet_address:HgK4jnXmQoNZWVJE3NSJF3JfhGNp4gAJF7ZqvDBCqxXE</code>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500 p-3 rounded-md">
                        <p className="font-semibold text-xs mb-1 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Discord Features:
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li>• Rich embeds with color-coded borders (green = safe, red = danger)</li>
                          <li>• Clickable links to DexScreener, Rugcheck, BubbleMaps</li>
                          <li>• Responses appear instantly (Discord slash commands)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Server Usage */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="outline">Server Use</Badge>
                      Adding Bot to Discord Servers
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 1: Invite Bot to Server</p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>You need "Manage Server" permission to invite bots.</p>
                          <Button
                            variant="default"
                            size="sm"
                            asChild
                            className="mt-2"
                          >
                            <a 
                              href="https://discord.com/oauth2/authorize?client_id=1439815848628846654&permissions=3072&scope=bot%20applications.commands" 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              Invite Bot to Your Server
                            </a>
                          </Button>
                          <ol className="space-y-1 ml-4 list-decimal mt-2">
                            <li>Click the invite link above</li>
                            <li>Select your server from the dropdown</li>
                            <li>Click "Authorize"</li>
                            <li>Complete the CAPTCHA if prompted</li>
                          </ol>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 2: Set Channel Permissions (Optional)</p>
                        <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                          <li>Go to Server Settings → Roles</li>
                          <li>Find the bot's role</li>
                          <li>Restrict which channels the bot can access</li>
                          <li>Example: Only allow in #token-analysis channel</li>
                        </ol>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-semibold mb-2">Step 3: Use Commands in Channels</p>
                        <div className="space-y-2 text-xs">
                          <p className="text-muted-foreground">Type <code className="bg-background px-1 py-0.5 rounded">/</code> in any channel to see available commands:</p>
                          <code className="bg-background px-2 py-1 rounded block">/execute token_address:2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt</code>
                          <p className="text-muted-foreground italic mt-2">
                            The bot will respond in the same channel where you used the command.
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500 p-3 rounded-md">
                        <p className="font-semibold text-xs mb-1">Server Admin Features:</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li>• Create dedicated #rug-alerts channel for alpha notifications</li>
                          <li>• Set up role-based access (only VIP members can use bot)</li>
                          <li>• Pin important bot responses for quick reference</li>
                          <li>• All server members can use slash commands (with group subscription)</li>
                          <li>• Responses are public - visible to everyone in the channel</li>
                        </ul>
                      </div>

                      <div className="bg-orange-500/10 border border-orange-500 p-3 rounded-md">
                        <p className="font-semibold text-xs mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Troubleshooting:
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          <li>• If slash commands don't appear, try re-inviting the bot</li>
                          <li>• Make sure bot has "Send Messages" and "Embed Links" permissions</li>
                          <li>• Check if bot is offline in member list (contact support if down)</li>
                          <li>• Rate limit: Max 5 commands per minute per user</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-security" id="security">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle>Security & Access Control</CardTitle>
                </div>
                <CardDescription>Enterprise-grade security with challenge-response verification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-2">Challenge-Response Wallet Verification:</p>
                    <ol className="space-y-1 text-xs text-muted-foreground ml-4 list-decimal">
                      <li>Request challenge from <code className="bg-muted px-1 py-0.5 rounded">GET /api/wallet/challenge</code> (5min expiry)</li>
                      <li>Sign challenge with Phantom wallet using Ed25519 signature</li>
                      <li>Submit <code className="bg-muted px-1 py-0.5 rounded">POST /api/wallet/verify</code> with signature</li>
                      <li>Server validates: challenge exists, not expired, signature valid, 10M+ tokens</li>
                      <li>Challenge marked as used (prevents replay attacks)</li>
                      <li>Access granted for 24 hours, then revalidation required</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Additional Security Features:</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• Server-controlled official token mint address (prevents bypass)</li>
                      <li>• Auto-expiry when subscription or trial ends</li>
                      <li>• Whop secure payment processing with automatic tax compliance</li>
                      <li>• SOL-only crypto payments with 6-confirmation requirement</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Blacklist System */}
          <Card className="mb-8" data-testid="card-ai-blacklist" id="ai-blacklist">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <CardTitle>AI Blacklist System</CardTitle>
              </div>
              <CardDescription>Automated detection engine with 6 rules analyzing 52+ risk metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">Detection Rules:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Badge variant="destructive" className="mt-0.5">90</Badge>
                      <div>
                        <strong>Honeypot Detection</strong>
                        <p className="text-xs text-muted-foreground">Tokens that can't be sold after purchase</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="destructive" className="mt-0.5">80</Badge>
                      <div>
                        <strong>High Sell Tax</strong>
                        <p className="text-xs text-muted-foreground">Excessive transaction fees (e.g., 99% sell tax)</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 bg-orange-500/10">75</Badge>
                      <div>
                        <strong>Suspicious Authorities</strong>
                        <p className="text-xs text-muted-foreground">Mint or freeze authority still enabled</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 bg-yellow-500/10">70</Badge>
                      <div>
                        <strong>Wash Trading</strong>
                        <p className="text-xs text-muted-foreground">Artificial volume through self-trading</p>
                      </div>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Features:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Evidence tracking with timestamped entries</li>
                    <li>• Severity scoring (0-100 scale)</li>
                    <li>• Deduplication prevents spam for same wallet+labelType</li>
                    <li>• Coordinated pump scheme detection</li>
                    <li>• Automatic analysis on every token scan</li>
                    <li>• Blacklist info included in bot responses</li>
                  </ul>
                  <p className="font-semibold mt-3 mb-2">API Endpoints:</p>
                  <ul className="space-y-1 text-xs font-mono text-muted-foreground">
                    <li>• GET /api/blacklist/check/:wallet</li>
                    <li>• POST /api/blacklist/report</li>
                    <li>• GET /api/blacklist/stats</li>
                    <li>• GET /api/blacklist/top</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Section */}
          <Card className="mb-8" data-testid="card-pricing" id="pricing">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Subscription Tiers
              </CardTitle>
              <CardDescription>Choose the plan that fits your needs - all tiers include 7-day free trial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2 p-4 border rounded-lg">
                  <Badge variant="outline">FREE Trial</Badge>
                  <p className="text-2xl font-bold">$0</p>
                  <p className="text-sm text-muted-foreground">7 days, no card required</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• 3 analyses/day</li>
                    <li>• Basic risk score</li>
                    <li>• Top 20 holders</li>
                  </ul>
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-primary/5">
                  <Badge>PRO</Badge>
                  <p className="text-2xl font-bold">$29</p>
                  <p className="text-sm text-muted-foreground">per month</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Unlimited analyses</li>
                    <li>• AI blacklist detection</li>
                    <li>• BubbleMaps viz</li>
                    <li>• Bot access</li>
                    <li>• Priority support</li>
                  </ul>
                </div>

                <div className="space-y-2 p-4 border rounded-lg">
                  <Badge variant="default">WHALE</Badge>
                  <p className="text-2xl font-bold">$99</p>
                  <p className="text-sm text-muted-foreground">per month</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Everything in PRO</li>
                    <li>• Real-time alerts</li>
                    <li>• API access (10k/mo)</li>
                    <li>• Smart money tracking</li>
                    <li>• Team (5 users)</li>
                    <li>• Custom webhooks</li>
                  </ul>
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                  <Badge variant="outline" className="bg-primary/10">$ANTIRUG Holder</Badge>
                  <p className="text-2xl font-bold">FREE</p>
                  <p className="text-sm text-muted-foreground">forever</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Hold 10M+ tokens</li>
                    <li>• GROUP tier access</li>
                    <li>• Exclusive perks</li>
                    <li>• Governance rights</li>
                    <li>• Connect via Phantom</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card data-testid="card-getting-started" id="getting-started">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>Start protecting yourself from rug pulls in 6 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="mt-1">1</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Connect Your Wallet</h4>
                  <p className="text-sm text-muted-foreground">
                    Click "Sign In" and connect your Phantom wallet. Sign the challenge message to authenticate.
                    No email or password required - your wallet address is your account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">2</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Start Free Trial</h4>
                  <p className="text-sm text-muted-foreground">
                    Get 7 days of free access with 3 analyses per day. No credit card required. 
                    Trial starts automatically upon first login.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">3</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Analyze Your First Token</h4>
                  <p className="text-sm text-muted-foreground">
                    Navigate to the main dashboard and paste any Solana token address (e.g., 
                    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v for USDC). Click "Analyze" to receive 
                    comprehensive risk analysis including holder distribution, authority checks, market data, 
                    and AI-powered red flags.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">4</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Connect Phantom Wallet (Optional - Token Holders)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    If you hold 10M+ official $ANTIRUG tokens, you can gain instant GROUP tier access without 
                    a paid subscription. First, install Phantom from <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">phantom.app</a> if you haven't already.
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                    <li>Click "Connect Wallet" button in the header navigation</li>
                    <li>Phantom wallet extension will prompt you to connect</li>
                    <li>Approve the connection request in Phantom</li>
                    <li>Sign the cryptographic challenge message (proves wallet ownership)</li>
                    <li>System validates your token balance (requires 10M+ tokens)</li>
                    <li>Upon success, GROUP tier access is granted for 24 hours</li>
                    <li>Reconnect every 24 hours to maintain access</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    <strong>Security Note:</strong> This simply proves you control the wallet without sharing your private key. 
                    We use Ed25519 signature verification with challenge-response protocol to prevent replay attacks. 
                    Your private key never leaves your wallet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">5</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Subscribe via Whop (Recommended for Most Users)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    For users without 10M+ tokens, subscribe through Whop for secure payment processing:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                    <li>Navigate to <a href="/pricing" className="text-primary hover:underline">/pricing</a> page from header or visit directly</li>
                    <li>Review tier comparison: PRO ($29/mo) or GROUP ($120/mo)</li>
                    <li>Click "Subscribe" button on your preferred tier card</li>
                    <li>Redirect to Whop's secure hosted checkout page</li>
                    <li>Enter payment details (credit card, debit card, or crypto)</li>
                    <li>Whop processes payment as Merchant of Record (2.7% + $0.30 fee)</li>
                    <li>Automatic tax compliance and receipt generation</li>
                    <li>Instant activation upon successful payment</li>
                    <li>Manage subscription, billing, and cancellation through Whop portal</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Alternative: Use redeemable subscription codes for lifetime access. Codes can be purchased 
                    separately and redeemed on the /subscription page.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">6</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Enable Bot Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Once subscribed, visit header/footer bot icons to get Telegram and Discord invite links. 
                    Add bots to your channels and use <code className="text-xs bg-muted px-1 py-0.5 rounded">/execute</code>, 
                    <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">/first20</code>, 
                    <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">/devaudit</code>, and 
                    <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">/blacklist</code> commands for instant analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card className="mb-8" data-testid="card-api-endpoints" id="api-endpoints">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-5 w-5 text-primary" />
                <CardTitle>API Endpoints</CardTitle>
              </div>
              <CardDescription>Main endpoints for programmatic access (WHALE tier required)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-semibold mb-2">Token Analysis</p>
                  <ul className="space-y-2 font-mono text-xs text-muted-foreground">
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">POST /api/analyze-token</code>
                      <span className="text-xs">Submit token address for analysis</span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/analysis/:id</code>
                      <span className="text-xs">Retrieve analysis results</span>
                    </li>
                  </ul>

                  <p className="font-semibold mt-4 mb-2">Wallet Verification</p>
                  <ul className="space-y-2 font-mono text-xs text-muted-foreground">
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/wallet/challenge</code>
                      <span className="text-xs">Request verification challenge (5min expiry)</span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">POST /api/wallet/verify</code>
                      <span className="text-xs">Submit signed challenge</span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/wallet</code>
                      <span className="text-xs">Get wallet connection status</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Blacklist Operations</p>
                  <ul className="space-y-2 font-mono text-xs text-muted-foreground">
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/blacklist/check/:wallet</code>
                      <span className="text-xs">Check if wallet is flagged</span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">POST /api/blacklist/report</code>
                      <span className="text-xs">Submit wallet report with evidence</span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/blacklist/stats</code>
                      <span className="text-xs">Get blacklist statistics</span>
                    </li>
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/blacklist/top</code>
                      <span className="text-xs">Top flagged wallets by severity</span>
                    </li>
                  </ul>

                  <p className="font-semibold mt-4 mb-2">Bot Integration</p>
                  <ul className="space-y-2 font-mono text-xs text-muted-foreground">
                    <li className="flex flex-col gap-1">
                      <code className="text-primary">GET /api/bot/invite-links</code>
                      <span className="text-xs">Get Telegram/Discord bot URLs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Setup */}
          <Card data-testid="card-environment" id="environment">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Environment Variables</CardTitle>
              </div>
              <CardDescription>Required configuration for self-hosting (for advanced users)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">Required for Whop Subscriptions:</p>
                  <ul className="space-y-1 font-mono text-xs text-muted-foreground ml-4">
                    <li>• WHOP_API_KEY</li>
                    <li>• WHOP_APP_ID</li>
                    <li>• WHOP_COMPANY_ID</li>
                    <li>• WHOP_PLAN_ID_BASIC ($29/mo tier)</li>
                    <li>• WHOP_PLAN_ID_PREMIUM ($120/mo tier)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Required for Token Gating (10M+ access):</p>
                  <ul className="space-y-1 font-mono text-xs text-muted-foreground ml-4">
                    <li>• OFFICIAL_TOKEN_MINT_ADDRESS (SPL token mint)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Optional for Bots:</p>
                  <ul className="space-y-1 font-mono text-xs text-muted-foreground ml-4">
                    <li>• TELEGRAM_BOT_TOKEN (from @BotFather)</li>
                    <li>• DISCORD_BOT_TOKEN (from Discord Developer Portal)</li>
                    <li>• DISCORD_CLIENT_ID (Discord application ID)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Optional for Performance:</p>
                  <ul className="space-y-1 font-mono text-xs text-muted-foreground ml-4">
                    <li>• SOLANA_RPC_URL (custom RPC endpoint)</li>
                    <li>• HELIUS_API_KEY (recommended for better rate limits)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom PDF Download Section */}
          <div className="mt-12 text-center p-8 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10" data-testid="section-pdf-download">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Download className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Download Complete Whitepaper</h2>
            </div>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Get the full Rug Killer Alpha Bot Whitepaper v2.0 in PDF format. Includes 6-layer detection system, 
              TGN analysis, smart money tracking, 25+ RPC endpoints, use cases, and API reference.
            </p>
            
            <PDFDownloadLink
              document={<DocumentationPDF />}
              fileName="rug-killer-whitepaper-v2.pdf"
            >
              {({ loading }) => (
                <Button size="lg" disabled={loading} data-testid="button-download-pdf-bottom">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Preparing PDF...' : 'Download Whitepaper PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
          </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
