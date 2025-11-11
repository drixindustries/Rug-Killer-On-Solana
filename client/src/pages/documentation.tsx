import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Shield, Zap, TrendingUp, Lock, Database, Bot, Wallet } from "lucide-react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// PDF Document Component
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  heading: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subheading: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  text: {
    marginBottom: 5,
    lineHeight: 1.5,
  },
  list: {
    marginLeft: 15,
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: 'gray',
  },
});

const DocumentationPDF = () => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Solana Rug Killer - Complete Documentation</Text>
      
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Overview</Text>
        <Text style={pdfStyles.text}>
          Solana Rug Killer is a comprehensive web application designed to analyze Solana SPL tokens 
          for potential rug pull risks. It provides real-time analysis by checking for common indicators 
          such as mint/freeze authority, holder concentration, liquidity pool status, and suspicious 
          transaction patterns.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Key Features</Text>
        <Text style={pdfStyles.subheading}>Multi-Source Analysis</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Rugcheck.xyz - Community-driven risk scores</Text>
          <Text style={pdfStyles.text}>• GoPlus Security - Honeypot & scam detection</Text>
          <Text style={pdfStyles.text}>• DexScreener - Real-time market data</Text>
          <Text style={pdfStyles.text}>• Jupiter Aggregator - Price verification</Text>
        </View>

        <Text style={pdfStyles.subheading}>Token Analysis</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Authority checks (mint/freeze)</Text>
          <Text style={pdfStyles.text}>• Holder analysis (top 20, concentration)</Text>
          <Text style={pdfStyles.text}>• Liquidity assessment</Text>
          <Text style={pdfStyles.text}>• 0-100 risk scoring with detailed red flags</Text>
          <Text style={pdfStyles.text}>• BubbleMaps visual holder distribution</Text>
        </View>

        <Text style={pdfStyles.subheading}>Telegram & Discord Bots</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• /execute [token] - Full risk analysis</Text>
          <Text style={pdfStyles.text}>• /first20 [token] - Top 20 holder analysis</Text>
          <Text style={pdfStyles.text}>• /devtorture [wallet] - Dev wallet history</Text>
          <Text style={pdfStyles.text}>• /blacklist [wallet] - Check wallet flags</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Subscription Tiers</Text>
        <Text style={pdfStyles.subheading}>FREE Trial - $0 for 7 days</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• 3 token analyses per day</Text>
          <Text style={pdfStyles.text}>• Basic risk score</Text>
          <Text style={pdfStyles.text}>• Top 20 holder analysis</Text>
        </View>

        <Text style={pdfStyles.subheading}>PRO - $29/month</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Unlimited token analyses</Text>
          <Text style={pdfStyles.text}>• Full AI detection</Text>
          <Text style={pdfStyles.text}>• BubbleMaps visualization</Text>
          <Text style={pdfStyles.text}>• Telegram & Discord bot access</Text>
          <Text style={pdfStyles.text}>• Blacklist database access</Text>
        </View>

        <Text style={pdfStyles.subheading}>WHALE - $99/month</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Everything in PRO</Text>
          <Text style={pdfStyles.text}>• Real-time alerts</Text>
          <Text style={pdfStyles.text}>• API access</Text>
          <Text style={pdfStyles.text}>• Advanced KOL tracking</Text>
          <Text style={pdfStyles.text}>• Team collaboration (up to 5 users)</Text>
        </View>

        <Text style={pdfStyles.subheading}>$KILL Holder - FREE Forever</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Hold 10M+ $KILL tokens</Text>
          <Text style={pdfStyles.text}>• Lifetime access to WHALE tier</Text>
          <Text style={pdfStyles.text}>• Exclusive holder perks</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Solana Rug Killer - Protecting Solana investors from rug pulls
      </Text>
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Technical Architecture</Text>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Technology Stack</Text>
        <Text style={pdfStyles.subheading}>Frontend</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• React with TypeScript</Text>
          <Text style={pdfStyles.text}>• Vite for build tooling</Text>
          <Text style={pdfStyles.text}>• Shadcn UI & Tailwind CSS</Text>
          <Text style={pdfStyles.text}>• React Query for data fetching</Text>
          <Text style={pdfStyles.text}>• Wouter for routing</Text>
        </View>

        <Text style={pdfStyles.subheading}>Backend</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Express.js with TypeScript</Text>
          <Text style={pdfStyles.text}>• PostgreSQL database</Text>
          <Text style={pdfStyles.text}>• @solana/web3.js for blockchain interaction</Text>
          <Text style={pdfStyles.text}>• Whop SDK for subscription payments</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Security Features</Text>
        <Text style={pdfStyles.subheading}>Access Control</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Active subscription OR 10M+ $KILL tokens required</Text>
          <Text style={pdfStyles.text}>• Challenge-response wallet verification</Text>
          <Text style={pdfStyles.text}>• Ed25519 signature validation</Text>
          <Text style={pdfStyles.text}>• Anti-replay protection with single-use challenges</Text>
          <Text style={pdfStyles.text}>• 24-hour token holder revalidation</Text>
        </View>

        <Text style={pdfStyles.subheading}>Payment Security</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Whop Merchant of Record (2.7% + $0.30 fees)</Text>
          <Text style={pdfStyles.text}>• Hosted secure checkout</Text>
          <Text style={pdfStyles.text}>• Automatic tax compliance</Text>
          <Text style={pdfStyles.text}>• Webhook lifecycle management</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>AI Blacklist System</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• 6 automated detection rules</Text>
          <Text style={pdfStyles.text}>• Analyzes 52+ risk metrics</Text>
          <Text style={pdfStyles.text}>• Flags honeypots, high sell tax, suspicious authorities</Text>
          <Text style={pdfStyles.text}>• Wash trading pattern detection</Text>
          <Text style={pdfStyles.text}>• Severity scoring with evidence tracking</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Getting Started</Text>
        <Text style={pdfStyles.subheading}>Step 1: Create Account</Text>
        <Text style={pdfStyles.text}>
          Sign up with Google, GitHub, X (Twitter), Apple, or email/password through our 
          Replit Auth integration.
        </Text>

        <Text style={pdfStyles.subheading}>Step 2: Start Free Trial</Text>
        <Text style={pdfStyles.text}>
          Get 7 days of free access with 3 analyses per day. No credit card required.
        </Text>

        <Text style={pdfStyles.subheading}>Step 3: Analyze Tokens</Text>
        <Text style={pdfStyles.text}>
          Paste any Solana token address to receive comprehensive risk analysis including holder 
          distribution, authority checks, and market data.
        </Text>

        <Text style={pdfStyles.subheading}>Step 4: Upgrade (Optional)</Text>
        <Text style={pdfStyles.text}>
          Subscribe to PRO ($29/mo) or WHALE ($99/mo) for unlimited access, bot integration, 
          and advanced features. Alternatively, hold 10M+ $KILL tokens for lifetime free access.
        </Text>
      </View>

      <Text style={pdfStyles.footer}>
        For support: Contact us through the website | Visit: https://solana-rug-killer.replit.app
      </Text>
    </Page>
  </Document>
);

export default function Documentation() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold">Complete Documentation</h1>
            </div>
            <p className="text-lg text-muted-foreground mb-6">
              Everything you need to know about Solana Rug Killer
            </p>
            
            <PDFDownloadLink
              document={<DocumentationPDF />}
              fileName="solana-rug-killer-documentation.pdf"
            >
              {({ loading }) => (
                <Button size="lg" disabled={loading} data-testid="button-download-pdf">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Preparing PDF...' : 'Download PDF Documentation'}
                </Button>
              )}
            </PDFDownloadLink>
          </div>

          {/* Overview Section */}
          <Card className="mb-8" data-testid="card-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Solana Rug Killer is a comprehensive web application designed to analyze Solana SPL tokens 
                for potential rug pull risks. It provides real-time analysis by checking for common indicators 
                such as mint/freeze authority, holder concentration, liquidity pool status, and suspicious 
                transaction patterns.
              </p>
              <p className="text-muted-foreground">
                Our platform leverages advanced analytics and AI-driven insights to protect users from 
                fraudulent schemes in the Solana ecosystem, combining data from multiple trusted sources 
                to give you the most accurate risk assessment possible.
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card data-testid="card-multi-source">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle>Multi-Source Analysis</CardTitle>
                </div>
                <CardDescription>Aggregates data from multiple trusted sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Rugcheck.xyz</strong> - Community-driven risk scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>GoPlus Security</strong> - Honeypot & scam detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>DexScreener</strong> - Real-time market data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Jupiter Aggregator</strong> - Price verification</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-token-analysis">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Token Analysis</CardTitle>
                </div>
                <CardDescription>Comprehensive risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Authority checks (mint/freeze)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Holder analysis (top 20, concentration)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Liquidity assessment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>0-100 risk scoring with detailed red flags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>BubbleMaps visual holder distribution</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-bots">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle>Telegram & Discord Bots</CardTitle>
                </div>
                <CardDescription>Instant analysis in your messaging apps</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><code>/execute [token]</code> - Full risk analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><code>/first20 [token]</code> - Top 20 holder analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><code>/devtorture [wallet]</code> - Dev wallet history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><code>/blacklist [wallet]</code> - Check wallet flags</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-security">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle>Security & Access Control</CardTitle>
                </div>
                <CardDescription>Enterprise-grade security features</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Challenge-response wallet verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Ed25519 signature validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Anti-replay protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Whop secure payment processing</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Section */}
          <Card className="mb-8" data-testid="card-pricing">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Subscription Tiers
              </CardTitle>
              <CardDescription>Choose the plan that fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Badge variant="outline">FREE Trial</Badge>
                  <p className="text-2xl font-bold">$0</p>
                  <p className="text-sm text-muted-foreground">7 days</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• 3 analyses/day</li>
                    <li>• Basic risk score</li>
                    <li>• Top 20 holders</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Badge>PRO</Badge>
                  <p className="text-2xl font-bold">$29</p>
                  <p className="text-sm text-muted-foreground">per month</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Unlimited analyses</li>
                    <li>• BubbleMaps viz</li>
                    <li>• Bot access</li>
                    <li>• AI detection</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Badge variant="default">WHALE</Badge>
                  <p className="text-2xl font-bold">$99</p>
                  <p className="text-sm text-muted-foreground">per month</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Everything in PRO</li>
                    <li>• API access</li>
                    <li>• Real-time alerts</li>
                    <li>• Team (5 users)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="bg-primary/10">$KILL Holder</Badge>
                  <p className="text-2xl font-bold">FREE</p>
                  <p className="text-sm text-muted-foreground">forever</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Hold 10M+ tokens</li>
                    <li>• WHALE tier access</li>
                    <li>• Exclusive perks</li>
                    <li>• Governance rights</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card data-testid="card-getting-started">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>Start protecting yourself from rug pulls in 4 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="mt-1">1</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Create Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign up with Google, GitHub, X (Twitter), Apple, or email/password through our 
                    Replit Auth integration.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">2</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Start Free Trial</h4>
                  <p className="text-sm text-muted-foreground">
                    Get 7 days of free access with 3 analyses per day. No credit card required.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">3</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Analyze Tokens</h4>
                  <p className="text-sm text-muted-foreground">
                    Paste any Solana token address to receive comprehensive risk analysis including 
                    holder distribution, authority checks, and market data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-1">4</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Upgrade (Optional)</h4>
                  <p className="text-sm text-muted-foreground">
                    Subscribe to PRO ($29/mo) or WHALE ($99/mo) for unlimited access, bot integration, 
                    and advanced features. Alternatively, hold 10M+ $KILL tokens for lifetime free access.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
