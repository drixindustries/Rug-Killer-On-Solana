import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, TrendingUp, Lock, Database, Bot, Wallet, Copy, CheckCircle, Globe, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CONTRACT_ADDRESS } from "@/constants";

export default function About() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Contract address copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold" data-testid="heading-about">About Solana Rug Killer</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Protecting investors from rug pulls with AI-powered analysis and multi-source intelligence
              </p>
            </div>

            {/* Official Contract Address */}
            <Card data-testid="card-about-contract">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Official Token - $ANTIRUG
                </CardTitle>
                <CardDescription>
                  Vanity address generated for the Solana Rug Killer project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Ticker:</span>
                  <span className="text-2xl font-bold text-primary">$ANTIRUG</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Contract Address (CA):</span>
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md">
                    <code className="font-mono text-sm flex-1 select-all" data-testid="text-about-contract">
                      {CONTRACT_ADDRESS}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                      aria-label="Copy contract address"
                      data-testid="button-copy-about"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mission */}
            <Card>
              <CardHeader>
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Solana Rug Killer is a comprehensive web application designed to analyze Solana SPL tokens 
                  for potential rug pull risks. Our primary purpose is to provide real-time analysis of common 
                  indicators like mint/freeze authority, holder concentration, liquidity pool status, and 
                  suspicious transaction patterns.
                </p>
                <p className="text-muted-foreground">
                  We aim to equip investors with a robust tool for identifying and mitigating risks within 
                  the Solana ecosystem, leveraging advanced analytics to protect users from fraudulent schemes 
                  and contribute to a safer investment environment.
                </p>
              </CardContent>
            </Card>

            {/* Recent Updates */}
            <Card>
              <CardHeader>
                <CardTitle>🎉 Recent Updates (November 15, 2025)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Auto-Link Explorer</h3>
                      <p className="text-sm text-muted-foreground">
                        Paste any Solana address in chat, get instant links to GMGN, Padre, Axiom, Solscan
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Enhanced Bot Features</h3>
                      <p className="text-sm text-muted-foreground">
                        Auto-detection in Telegram & Discord, no commands needed
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Code className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">GROUP Tier (Renamed)</h3>
                      <p className="text-sm text-muted-foreground">
                        Perfect for Discord/Telegram groups - $120/month with group alerts
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Wallet className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">$ANTIRUG Branding</h3>
                      <p className="text-sm text-muted-foreground">
                        Prominent ticker display and official token integration
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Multi-Source Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Rugcheck, GoPlus, DexScreener, Jupiter
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">AI Blacklist System</h3>
                      <p className="text-sm text-muted-foreground">
                        6 automated detection rules, 52+ risk metrics
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Telegram & Discord Bots</h3>
                      <p className="text-sm text-muted-foreground">
                        /execute, /first20, /devaudit + auto-link detection
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Risk Scoring</h3>
                      <p className="text-sm text-muted-foreground">
                        0-100 score with detailed red flag breakdown
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Database className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Holder Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Top 20 holders with concentration percentage
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm">Liquidity Verification</h3>
                      <p className="text-sm text-muted-foreground">
                        100% burn verification and pool depth checks
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Trusted Data Sources</CardTitle>
                <CardDescription>
                  We aggregate data from multiple blockchain intelligence providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">Rugcheck.xyz</Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      Community-driven risk scores and liquidity analysis
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">GoPlus Security</Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      Honeypot detection, contract security scanning, scam detection flags
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">DexScreener</Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      Real-time market data including price, volume, liquidity, and market cap
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">Jupiter Aggregator</Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      Price verification and liquidity aggregation across Solana DEXs
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">BubbleMaps</Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      Interactive holder distribution visualization and wallet clustering
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">MobyScreener</Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      Advanced token screening and analytics platform for Solana
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technology Stack */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Technology Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Badge variant="secondary">React + TypeScript</Badge>
                  <Badge variant="secondary">Solana Web3.js</Badge>
                  <Badge variant="secondary">Express.js</Badge>
                  <Badge variant="secondary">PostgreSQL</Badge>
                  <Badge variant="secondary">Phantom Wallet</Badge>
                  <Badge variant="secondary">Whop Payments</Badge>
                  <Badge variant="secondary">Telegram Bot API</Badge>
                  <Badge variant="secondary">Discord API</Badge>
                  <Badge variant="secondary">Recharts</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Tiers</CardTitle>
                <CardDescription>
                  Choose the plan that fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">FREE Trial - $0 for 7 days</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2 ml-4">
                      <li>• 3 token analyses per day</li>
                      <li>• Basic risk score and holder analysis</li>
                      <li>• No credit card required</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">Individual - $29/month</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2 ml-4">
                      <li>• Unlimited token analyses</li>
                      <li>• Full multi-source analysis</li>
                      <li>• AI blacklist access</li>
                      <li>• Bot commands access</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">Group - $120/month</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2 ml-4">
                      <li>• Everything in Individual</li>
                      <li>• Telegram group/channel alerts</li>
                      <li>• Discord group/channel alerts</li>
                      <li>• Priority support</li>
                      <li>• Team collaboration features</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">Lifetime - One-time payment</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2 ml-4">
                      <li>• Everything in Group</li>
                      <li>• Lifetime access (never expires)</li>
                      <li>• Redeemable via special codes</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Contact & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  For questions, support, or partnership inquiries, please reach out through our 
                  Telegram or Discord communities. Our team is dedicated to providing the best 
                  experience for our users.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">Telegram Bot</Badge>
                  <Badge variant="outline">Discord Bot</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
