import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Shield, Zap, TrendingUp, Lock, Database, Bot, Wallet, Code, AlertTriangle, CheckCircle } from "lucide-react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CONTRACT_ADDRESS } from "@/constants";

// PDF Document Component with comprehensive content
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subheading: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#2a2a2a',
  },
  text: {
    marginBottom: 4,
    lineHeight: 1.4,
  },
  list: {
    marginLeft: 15,
    marginBottom: 4,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 10,
    backgroundColor: '#f5f5f5',
    padding: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
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
          for potential rug pull risks. It provides real-time analysis by aggregating data from multiple 
          trusted sources and applying AI-powered detection algorithms to identify common indicators such 
          as mint/freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Project Information</Text>
        <Text style={pdfStyles.subheading}>Official Contract Address</Text>
        <Text style={pdfStyles.code}>{CONTRACT_ADDRESS}</Text>
        <Text style={pdfStyles.text}>
          This is the official vanity Solana address generated for the Solana Rug Killer project. 
          The address features the suffix "rtek" and serves as the project's official contract identifier 
          on the Solana blockchain.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Multi-Source Analysis</Text>
        <Text style={pdfStyles.text}>
          Our platform aggregates data from four major blockchain intelligence sources:
        </Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Rugcheck.xyz - Community-driven risk scores and liquidity analysis</Text>
          <Text style={pdfStyles.text}>• GoPlus Security - Honeypot detection, contract security scanning, scam flags</Text>
          <Text style={pdfStyles.text}>• DexScreener - Real-time market data (price, volume, liquidity, market cap)</Text>
          <Text style={pdfStyles.text}>• Jupiter Aggregator - Price verification and liquidity aggregation</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Token Analysis Features</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Authority checks - Detects if mint or freeze authority is enabled</Text>
          <Text style={pdfStyles.text}>• Holder analysis - Top 20 holders with concentration percentage</Text>
          <Text style={pdfStyles.text}>• Liquidity assessment - Checks for locked liquidity and pool depth</Text>
          <Text style={pdfStyles.text}>• Risk scoring - 0-100 score with detailed red flag breakdown</Text>
          <Text style={pdfStyles.text}>• BubbleMaps visualization - Interactive holder distribution maps</Text>
          <Text style={pdfStyles.text}>• Transaction history - Recent significant transactions and patterns</Text>
          <Text style={pdfStyles.text}>• AI blacklist checks - Automatic flagging of suspicious wallets</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Telegram & Discord Bots</Text>
        <Text style={pdfStyles.subheading}>Available Commands:</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• /execute [token] - Full comprehensive risk analysis</Text>
          <Text style={pdfStyles.text}>• /first20 [token] - Detailed top 20 holder breakdown</Text>
          <Text style={pdfStyles.text}>• /devtorture [wallet] - Complete dev wallet transaction history</Text>
          <Text style={pdfStyles.text}>• /blacklist [wallet] - Check if wallet is flagged in AI blacklist</Text>
        </View>
        <Text style={pdfStyles.text}>
          Both bots support markdown formatting (Telegram) and rich embeds (Discord) with color-coded 
          risk indicators (green/yellow/orange/red) for quick visual assessment.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Subscription Tiers</Text>
        
        <Text style={pdfStyles.subheading}>FREE Trial - $0 for 7 days</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• 3 token analyses per day</Text>
          <Text style={pdfStyles.text}>• Basic risk score and holder analysis</Text>
          <Text style={pdfStyles.text}>• No credit card required</Text>
        </View>

        <Text style={pdfStyles.subheading}>PRO - $29/month</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Unlimited token analyses</Text>
          <Text style={pdfStyles.text}>• Full AI blacklist detection</Text>
          <Text style={pdfStyles.text}>• BubbleMaps visual holder distribution</Text>
          <Text style={pdfStyles.text}>• Telegram & Discord bot access</Text>
          <Text style={pdfStyles.text}>• Blacklist database query access</Text>
          <Text style={pdfStyles.text}>• Priority support</Text>
        </View>

        <Text style={pdfStyles.subheading}>WHALE - $99/month</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Everything in PRO tier</Text>
          <Text style={pdfStyles.text}>• Real-time liquidity alerts</Text>
          <Text style={pdfStyles.text}>• REST API access with 10,000 requests/month</Text>
          <Text style={pdfStyles.text}>• Advanced smart money wallet tracking</Text>
          <Text style={pdfStyles.text}>• Team collaboration (up to 5 users)</Text>
          <Text style={pdfStyles.text}>• Custom webhook integrations</Text>
        </View>

        <Text style={pdfStyles.subheading}>$KILL Holder - FREE Forever</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Hold 10M+ official $KILL tokens</Text>
          <Text style={pdfStyles.text}>• Lifetime access to WHALE tier features</Text>
          <Text style={pdfStyles.text}>• Exclusive holder perks and governance rights</Text>
          <Text style={pdfStyles.text}>• Connect wallet via Phantom to verify holdings</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Solana Rug Killer - Page 1 of 3
      </Text>
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Security & Access Control</Text>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Challenge-Response Wallet Verification</Text>
        <Text style={pdfStyles.text}>
          Our wallet verification system uses cryptographic signatures to prevent replay attacks:
        </Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>1. User requests challenge from GET /api/wallet/challenge (5-minute expiry)</Text>
          <Text style={pdfStyles.text}>2. User signs challenge with Phantom wallet using Ed25519 signature</Text>
          <Text style={pdfStyles.text}>3. User submits POST /api/wallet/verify with wallet address, signature, and challenge</Text>
          <Text style={pdfStyles.text}>4. Server validates: challenge exists, not expired, not used, signature valid, 10M+ tokens</Text>
          <Text style={pdfStyles.text}>5. Challenge marked as used (single-use enforcement)</Text>
          <Text style={pdfStyles.text}>6. Access granted for 24 hours, then revalidation required</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Access Control Rules</Text>
        <Text style={pdfStyles.text}>
          Protected endpoints require EITHER active subscription OR verified token holdings:
        </Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Subscription check: Status = 'active' or 'trialing' AND currentPeriodEnd {'>'} now</Text>
          <Text style={pdfStyles.text}>• Token holder check: isEligible = true AND lastVerifiedAt {'<'} 24 hours ago</Text>
          <Text style={pdfStyles.text}>• Official token mint address is server-controlled (prevents bypass)</Text>
          <Text style={pdfStyles.text}>• Auto-expiry when subscription or trial ends</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>AI Blacklist System</Text>
        <Text style={pdfStyles.text}>
          Automated detection engine with 6 rules analyzing 52+ risk metrics:
        </Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Honeypot detection (severity: 90) - Tokens that can't be sold</Text>
          <Text style={pdfStyles.text}>• High sell tax (severity: 80) - Excessive transaction fees</Text>
          <Text style={pdfStyles.text}>• Suspicious authorities (severity: 75) - Mint/freeze enabled</Text>
          <Text style={pdfStyles.text}>• Wash trading patterns (severity: 70) - Artificial volume</Text>
          <Text style={pdfStyles.text}>• Coordinated pump scheme detection</Text>
          <Text style={pdfStyles.text}>• Evidence tracking with timestamped entries and deduplication</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Payment Systems</Text>
        
        <Text style={pdfStyles.subheading}>Whop Subscriptions</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Merchant of Record handling (2.7% + $0.30 fees)</Text>
          <Text style={pdfStyles.text}>• Hosted secure checkout with automatic tax compliance</Text>
          <Text style={pdfStyles.text}>• Webhook lifecycle events: payment.succeeded, membership status changes</Text>
          <Text style={pdfStyles.text}>• Status vocabulary: "valid", "trialing", "past_due", "cancelled", "expired"</Text>
        </View>

        <Text style={pdfStyles.subheading}>Crypto Payments (SOL only)</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Production-ready Solana payment processing</Text>
          <Text style={pdfStyles.text}>• Requires 6 blockchain confirmations before activation</Text>
          <Text style={pdfStyles.text}>• Payment address generation with blockchain monitoring</Text>
          <Text style={pdfStyles.text}>• Full audit trail in payment_audit table</Text>
          <Text style={pdfStyles.text}>• ETH/BTC payments blocked (SOL-only security policy)</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Solana Rug Killer - Page 2 of 3
      </Text>
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>API Endpoints & Setup</Text>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Main API Endpoints</Text>
        
        <Text style={pdfStyles.subheading}>Token Analysis</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>POST /api/analyze-token - Submit token address for analysis (requires access)</Text>
          <Text style={pdfStyles.text}>GET /api/analysis/:id - Retrieve analysis results</Text>
        </View>

        <Text style={pdfStyles.subheading}>Wallet Verification</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>GET /api/wallet/challenge - Request verification challenge (5min expiry)</Text>
          <Text style={pdfStyles.text}>POST /api/wallet/verify - Submit signed challenge for verification</Text>
          <Text style={pdfStyles.text}>GET /api/wallet - Get current wallet connection status</Text>
        </View>

        <Text style={pdfStyles.subheading}>Blacklist Operations</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>GET /api/blacklist/check/:wallet - Check if wallet is flagged</Text>
          <Text style={pdfStyles.text}>POST /api/blacklist/report - Submit wallet report with evidence</Text>
          <Text style={pdfStyles.text}>GET /api/blacklist/stats - Get blacklist statistics</Text>
          <Text style={pdfStyles.text}>GET /api/blacklist/top - Top flagged wallets by severity</Text>
        </View>

        <Text style={pdfStyles.subheading}>Bot Integration</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>GET /api/bot/invite-links - Get Telegram/Discord bot invite URLs</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Environment Variables</Text>
        
        <Text style={pdfStyles.subheading}>Required for Whop Subscriptions</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>WHOP_API_KEY - Whop API key from developer dashboard</Text>
          <Text style={pdfStyles.text}>WHOP_APP_ID - Whop application ID</Text>
          <Text style={pdfStyles.text}>WHOP_COMPANY_ID - Whop company/business ID</Text>
          <Text style={pdfStyles.text}>WHOP_PLAN_ID_BASIC - Plan ID for $29/mo PRO tier</Text>
          <Text style={pdfStyles.text}>WHOP_PLAN_ID_PREMIUM - Plan ID for $99/mo WHALE tier</Text>
        </View>

        <Text style={pdfStyles.subheading}>Required for Token Gating</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>OFFICIAL_TOKEN_MINT_ADDRESS - SPL token mint for 10M+ access verification</Text>
        </View>

        <Text style={pdfStyles.subheading}>Optional for Bots</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>TELEGRAM_BOT_TOKEN - From @BotFather on Telegram</Text>
          <Text style={pdfStyles.text}>DISCORD_BOT_TOKEN - From Discord Developer Portal</Text>
          <Text style={pdfStyles.text}>DISCORD_CLIENT_ID - Discord application ID</Text>
        </View>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Getting Started</Text>
        
        <Text style={pdfStyles.subheading}>Step 1: Create Account</Text>
        <Text style={pdfStyles.text}>
          Sign up using Google, GitHub, X (Twitter), Apple, or email/password through 
          Replit Auth integration. Account creation is instant and free.
        </Text>

        <Text style={pdfStyles.subheading}>Step 2: Start Free Trial (Optional)</Text>
        <Text style={pdfStyles.text}>
          Get 7 days of free access with 3 analyses per day. No credit card required. 
          Trial starts automatically upon first login.
        </Text>

        <Text style={pdfStyles.subheading}>Step 3: Analyze Your First Token</Text>
        <Text style={pdfStyles.text}>
          Navigate to the main dashboard and paste any Solana token address (e.g., 
          EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v for USDC). Click "Analyze" 
          to receive comprehensive risk analysis including holder distribution, authority 
          checks, market data, and AI-powered red flags.
        </Text>

        <Text style={pdfStyles.subheading}>Step 4: Connect Phantom Wallet (Optional - Token Holders)</Text>
        <Text style={pdfStyles.text}>
          If you hold 10M+ official $KILL tokens, you can gain instant WHALE tier access without 
          a paid subscription. First, install Phantom from phantom.app if you haven't already.
        </Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>1. Click "Connect Wallet" button in the header navigation</Text>
          <Text style={pdfStyles.text}>2. Phantom wallet extension will prompt you to connect</Text>
          <Text style={pdfStyles.text}>3. Approve the connection request in Phantom</Text>
          <Text style={pdfStyles.text}>4. Sign the cryptographic challenge message (proves wallet ownership)</Text>
          <Text style={pdfStyles.text}>5. System validates your token balance (requires 10M+ tokens)</Text>
          <Text style={pdfStyles.text}>6. Upon success, WHALE tier access is granted for 24 hours</Text>
          <Text style={pdfStyles.text}>7. Reconnect every 24 hours to maintain access</Text>
        </View>
        <Text style={pdfStyles.text}>
          Security Note: This simply proves you control the wallet without sharing your private key. 
          We use Ed25519 signature verification with challenge-response protocol to prevent replay attacks. 
          Your private key never leaves your wallet.
        </Text>

        <Text style={pdfStyles.subheading}>Step 5: Subscribe via Whop (Recommended for Most Users)</Text>
        <Text style={pdfStyles.text}>
          For users without 10M+ tokens, subscribe through Whop for secure payment processing:
        </Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>1. Navigate to /pricing page from header or visit directly</Text>
          <Text style={pdfStyles.text}>2. Review tier comparison: PRO ($29/mo) or WHALE ($99/mo)</Text>
          <Text style={pdfStyles.text}>3. Click "Subscribe" button on your preferred tier card</Text>
          <Text style={pdfStyles.text}>4. Redirect to Whop's secure hosted checkout page</Text>
          <Text style={pdfStyles.text}>5. Enter payment details (credit card, debit card, or crypto)</Text>
          <Text style={pdfStyles.text}>6. Whop processes payment as Merchant of Record (2.7% + $0.30 fee)</Text>
          <Text style={pdfStyles.text}>7. Automatic tax compliance and receipt generation</Text>
          <Text style={pdfStyles.text}>8. Instant activation upon successful payment</Text>
          <Text style={pdfStyles.text}>9. Manage subscription, billing, and cancellation through Whop portal</Text>
        </View>
        <Text style={pdfStyles.text}>
          Alternative: Use redeemable subscription codes for lifetime access. Codes can be purchased 
          separately and redeemed on the /subscription page.
        </Text>

        <Text style={pdfStyles.subheading}>Step 6: Enable Bot Access</Text>
        <Text style={pdfStyles.text}>
          Once subscribed, visit header/footer bot icons to get Telegram and Discord 
          invite links. Add bots to your channels and use /execute, /first20, 
          /devtorture, and /blacklist commands for instant analysis.
        </Text>
      </View>

      <View style={pdfStyles.section}>
        <Text style={pdfStyles.heading}>Support & Resources</Text>
        <View style={pdfStyles.list}>
          <Text style={pdfStyles.text}>• Website: https://solana-rug-killer.replit.app</Text>
          <Text style={pdfStyles.text}>• Documentation: /documentation route</Text>
          <Text style={pdfStyles.text}>• Pricing: /pricing route</Text>
          <Text style={pdfStyles.text}>• Contact: Available through the website</Text>
        </View>
      </View>

      <Text style={pdfStyles.footer}>
        © 2025 Solana Rug Killer - Page 3 of 3 | Protecting Solana investors from rug pulls
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
              Everything you need to know about Solana Rug Killer - comprehensive guide with PDF download
            </p>
            
            <PDFDownloadLink
              document={<DocumentationPDF />}
              fileName="solana-rug-killer-documentation.pdf"
            >
              {({ loading }) => (
                <Button size="lg" disabled={loading} data-testid="button-download-pdf">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Preparing PDF...' : 'Download Complete PDF Guide'}
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
                for potential rug pull risks. It provides real-time analysis by aggregating data from multiple 
                trusted sources and applying AI-powered detection algorithms to identify common indicators such 
                as mint/freeze authority, holder concentration, liquidity pool status, and suspicious transaction patterns.
              </p>
              <p className="text-muted-foreground">
                Our platform leverages advanced analytics and AI-driven insights to protect users from 
                fraudulent schemes in the Solana ecosystem, combining data from Rugcheck, GoPlus Security, 
                DexScreener, and Jupiter Aggregator to give you the most accurate risk assessment possible.
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
                <CardDescription>Aggregates data from four major blockchain intelligence sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Rugcheck.xyz</strong>
                      <p className="text-muted-foreground text-xs">Community-driven risk scores and liquidity analysis</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>GoPlus Security</strong>
                      <p className="text-muted-foreground text-xs">Honeypot detection, contract security scanning, scam detection flags</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>DexScreener</strong>
                      <p className="text-muted-foreground text-xs">Real-time market data (price, volume, liquidity, market cap)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Jupiter Aggregator</strong>
                      <p className="text-muted-foreground text-xs">Price verification and liquidity aggregation across Solana DEXs</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-token-analysis">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Token Analysis Features</CardTitle>
                </div>
                <CardDescription>Comprehensive risk assessment across multiple dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Authority checks</strong> - Detects if mint or freeze authority is enabled</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Holder analysis</strong> - Top 20 holders with concentration percentage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Liquidity assessment</strong> - Checks for locked liquidity and pool depth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Risk scoring</strong> - 0-100 score with detailed red flag breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>BubbleMaps</strong> - Interactive visual holder distribution maps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Transaction history</strong> - Recent significant transactions and patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>AI blacklist checks</strong> - Automatic flagging of suspicious wallets</span>
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
                <CardDescription>Instant analysis in your messaging apps with color-coded risk indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
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
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">/devtorture [wallet]</code>
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
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-security">
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
          <Card className="mb-8" data-testid="card-ai-blacklist">
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
          <Card className="mb-8" data-testid="card-pricing">
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
                  <Badge variant="outline" className="bg-primary/10">$KILL Holder</Badge>
                  <p className="text-2xl font-bold">FREE</p>
                  <p className="text-sm text-muted-foreground">forever</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Hold 10M+ tokens</li>
                    <li>• WHALE tier access</li>
                    <li>• Exclusive perks</li>
                    <li>• Governance rights</li>
                    <li>• Connect via Phantom</li>
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
              <CardDescription>Start protecting yourself from rug pulls in 6 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="mt-1">1</Badge>
                <div>
                  <h4 className="font-semibold mb-1">Create Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign up with Google, GitHub, X (Twitter), Apple, or email/password through our 
                    Replit Auth integration. Account creation is instant and free.
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
                    If you hold 10M+ official $KILL tokens, you can gain instant WHALE tier access without 
                    a paid subscription. First, install Phantom from <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">phantom.app</a> if you haven't already.
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                    <li>Click "Connect Wallet" button in the header navigation</li>
                    <li>Phantom wallet extension will prompt you to connect</li>
                    <li>Approve the connection request in Phantom</li>
                    <li>Sign the cryptographic challenge message (proves wallet ownership)</li>
                    <li>System validates your token balance (requires 10M+ tokens)</li>
                    <li>Upon success, WHALE tier access is granted for 24 hours</li>
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
                    <li>Review tier comparison: PRO ($29/mo) or WHALE ($99/mo)</li>
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
                    <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">/devtorture</code>, and 
                    <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">/blacklist</code> commands for instant analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card className="mb-8" data-testid="card-api-endpoints">
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
          <Card data-testid="card-environment">
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
                    <li>• WHOP_PLAN_ID_PREMIUM ($99/mo tier)</li>
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
              <h2 className="text-2xl font-bold">Download Complete Documentation</h2>
            </div>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Get the full Solana Rug Killer documentation in PDF format. Includes detailed guides on wallet 
              connection, Whop payments, API endpoints, bot commands, and technical specifications.
            </p>
            
            <PDFDownloadLink
              document={<DocumentationPDF />}
              fileName="solana-rug-killer-documentation.pdf"
            >
              {({ loading }) => (
                <Button size="lg" disabled={loading} data-testid="button-download-pdf-bottom">
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Preparing PDF...' : 'Download PDF Documentation'}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
