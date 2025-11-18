import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { Bot, Zap, Shield, Copy, CheckCircle2, Globe, Search, TrendingUp } from "lucide-react";
import { useState } from "react";

// Helper component for command cards with copy functionality
function CommandCard({ 
  command, 
  description, 
  example, 
  tier 
}: { 
  command: string; 
  description: string; 
  example?: string; 
  tier?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{command}</code>
              {tier && <Badge variant="secondary">{tier}</Badge>}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {example && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">Example:</span> <code className="bg-muted px-2 py-1 rounded text-xs">{example}</code>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function BotGuide() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold">Bot Guide</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access Rug Killer's powerful token analysis on Telegram, Discord, and our Website
            </p>
            <Badge variant="secondary" className="mt-4">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Public Access - No Subscription Required
            </Badge>
          </div>

          {/* Platform Tabs */}
          <Tabs defaultValue="telegram" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="telegram" className="flex items-center gap-2">
                <SiTelegram className="h-4 w-4" />
                Telegram
              </TabsTrigger>
              <TabsTrigger value="discord" className="flex items-center gap-2">
                <SiDiscord className="h-4 w-4" />
                Discord
              </TabsTrigger>
              <TabsTrigger value="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </TabsTrigger>
            </TabsList>

            <TabsContent value="telegram" className="space-y-6">
              {/* Getting Started */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SiTelegram className="h-5 w-5 text-[#0088cc]" />
                    Getting Started with Telegram
                  </CardTitle>
                  <CardDescription>Add the bot and start analyzing tokens instantly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-semibold">Add the Bot</p>
                        <p className="text-sm text-muted-foreground">
                          Search for <code className="bg-muted px-2 py-0.5 rounded">@RugKillerAlphaBot</code> on Telegram or use the link below
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-semibold">Start a Chat</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Start" or type <code className="bg-muted px-2 py-0.5 rounded">/start</code> to see all available commands
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-semibold">Analyze Tokens</p>
                        <p className="text-sm text-muted-foreground">
                          Type <code className="bg-muted px-2 py-0.5 rounded">/</code> to see command menu, or paste any token address for quick analysis
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <a href="https://t.me/RugKillerAlphaBot" target="_blank" rel="noopener noreferrer">
                      <SiTelegram className="mr-2 h-4 w-4" />
                      Open Telegram Bot
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Command Reference */}
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Command Reference</h3>
                
                <CommandCard
                  command="/execute [token_address]"
                  description="Comprehensive 52-metric risk analysis with AI recommendations, price data, security checks, and holder analysis"
                  example="/execute EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="Core"
                />

                <CommandCard
                  command="/first20 [token_address]"
                  description="Top 20 holder breakdown showing wallet addresses and supply percentages"
                  example="/first20 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="Analysis"
                />

                <CommandCard
                  command="/devaudit [token_address]"
                  description="Security audit checking mint/freeze authorities and token age"
                  example="/devaudit EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="Security"
                />

                <CommandCard
                  command="/blacklist [wallet_address]"
                  description="Check if a wallet is flagged in the AI blacklist database"
                  example="/blacklist 9xYzAbCd1234567890KlMnOpQrStUvWxYz"
                  tier="Security"
                />

                <CommandCard
                  command="/whaletrack [token_address]"
                  description="Track smart money (KOL) wallets holding a token with influence scores"
                  example="/whaletrack EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="🐋 Whale"
                />

                <CommandCard
                  command="/kol [wallet_address]"
                  description="Check if a wallet is a tracked KOL with full trader profile"
                  example="/kol 9xYzAbCd1234567890KlMnOpQrStUvWxYz"
                  tier="🐋 Whale"
                />
              </div>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Telegram Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Quick Analysis</p>
                        <p className="text-sm text-muted-foreground">Paste any token address for instant compact analysis</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">52+ Metrics</p>
                        <p className="text-sm text-muted-foreground">Rugcheck, GoPlus, DexScreener, Jupiter, Birdeye</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">AI Recommendations</p>
                        <p className="text-sm text-muted-foreground">Professional buy/sell/hold analysis</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Smart Money Tracking</p>
                        <p className="text-sm text-muted-foreground">Track KOL wallets and whale movements</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discord" className="space-y-6">
              {/* Getting Started */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SiDiscord className="h-5 w-5 text-[#5865F2]" />
                    Getting Started with Discord
                  </CardTitle>
                  <CardDescription>Add the bot to your server for professional token analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-semibold">Invite the Bot</p>
                        <p className="text-sm text-muted-foreground">
                          Use the invite link below to add Rug Killer to your Discord server
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-semibold">Grant Permissions</p>
                        <p className="text-sm text-muted-foreground">
                          Allow the bot to send messages and use slash commands
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-semibold">Use Slash Commands</p>
                        <p className="text-sm text-muted-foreground">
                          Type <code className="bg-muted px-2 py-0.5 rounded">/</code> to see all available commands with autocomplete
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <a href="https://discord.com/oauth2/authorize?client_id=1303108653449314344" target="_blank" rel="noopener noreferrer">
                      <SiDiscord className="mr-2 h-4 w-4" />
                      Add to Discord Server
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Command Reference */}
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Command Reference</h3>
                
                <CommandCard
                  command="/analyze token:[address]"
                  description="Full 52-metric analysis with rich embed, color-coded by risk level"
                  example="/analyze token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="Core"
                />

                <CommandCard
                  command="/holders token:[address]"
                  description="Top 20 holder breakdown with concentration warnings"
                  example="/holders token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="Analysis"
                />

                <CommandCard
                  command="/dev token:[address]"
                  description="Developer wallet security audit with authority checks"
                  example="/dev token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="Security"
                />

                <CommandCard
                  command="/check wallet:[address]"
                  description="AI blacklist database check for suspicious wallets"
                  example="/check wallet:9xYzAbCd1234567890KlMnOpQrStUvWxYz"
                  tier="Security"
                />

                <CommandCard
                  command="/whaletrack token:[address]"
                  description="Track smart money (KOL) wallets in a token with detailed profiles"
                  example="/whaletrack token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  tier="🐋 Whale"
                />

                <CommandCard
                  command="/kol wallet:[address]"
                  description="Check if wallet is a tracked KOL with full trader stats"
                  example="/kol wallet:9xYzAbCd1234567890KlMnOpQrStUvWxYz"
                  tier="🐋 Whale"
                />
              </div>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Discord Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Rich Embeds</p>
                        <p className="text-sm text-muted-foreground">Beautiful color-coded embeds (green/yellow/orange/red)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Slash Commands</p>
                        <p className="text-sm text-muted-foreground">Native Discord commands with autocomplete</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Server Ready</p>
                        <p className="text-sm text-muted-foreground">Perfect for community token discussions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Organized Data</p>
                        <p className="text-sm text-muted-foreground">Embedded fields for clean presentation</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="website" className="space-y-6">
              {/* Getting Started */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Getting Started with Website Analysis
                  </CardTitle>
                  <CardDescription>Use our web interface for the most comprehensive analysis experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-semibold">Visit the Homepage</p>
                        <p className="text-sm text-muted-foreground">
                          Navigate to <a href="/" className="text-primary hover:underline">rugkiller.xyz</a> in your browser
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-semibold">Paste Token Address</p>
                        <p className="text-sm text-muted-foreground">
                          Enter any Solana token contract address into the search bar
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-semibold">View Full Report</p>
                        <p className="text-sm text-muted-foreground">
                          Get detailed analysis with charts, graphs, and comprehensive data visualization
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <a href="/">
                      <Search className="mr-2 h-4 w-4" />
                      Analyze a Token Now
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Website Features</CardTitle>
                  <CardDescription>Why use the web interface?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Visual Data Presentation</p>
                        <p className="text-sm text-muted-foreground">
                          Charts, graphs, and visual indicators make complex data easy to understand
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Scan History</p>
                        <p className="text-sm text-muted-foreground">
                          Track your previously scanned tokens and compare results over time
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Detailed Holder Breakdown</p>
                        <p className="text-sm text-muted-foreground">
                          Interactive tables showing full holder distribution with filtering options
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Real-time Updates</p>
                        <p className="text-sm text-muted-foreground">
                          Live data updates as market conditions change
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Export Reports</p>
                        <p className="text-sm text-muted-foreground">
                          Download PDF reports or share analysis links with your team
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">No Installation Required</p>
                        <p className="text-sm text-muted-foreground">
                          Access from any device with a web browser - desktop, tablet, or mobile
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Analysis Tools */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Analysis Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Security Analysis</p>
                        <p className="text-sm text-muted-foreground">Mint/freeze authorities, LP locks, contract verification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Market Data</p>
                        <p className="text-sm text-muted-foreground">Price, volume, market cap, liquidity tracking</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">AI Recommendations</p>
                        <p className="text-sm text-muted-foreground">Professional buy/sell/hold analysis with reasoning</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Search className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Holder Analysis</p>
                        <p className="text-sm text-muted-foreground">Top holders, concentration metrics, whale tracking</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom CTA */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Choose Your Platform</CardTitle>
              <CardDescription>Access Rug Killer's analysis tools wherever you work</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline" asChild>
                  <a href="https://t.me/RugKillerAlphaBot" target="_blank" rel="noopener noreferrer">
                    <SiTelegram className="h-6 w-6" />
                    <span className="font-semibold">Telegram Bot</span>
                    <span className="text-xs text-muted-foreground">Quick analysis on the go</span>
                  </a>
                </Button>
                <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline" asChild>
                  <a href="https://discord.com/oauth2/authorize?client_id=1303108653449314344" target="_blank" rel="noopener noreferrer">
                    <SiDiscord className="h-6 w-6" />
                    <span className="font-semibold">Discord Bot</span>
                    <span className="text-xs text-muted-foreground">Perfect for communities</span>
                  </a>
                </Button>
                <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline" asChild>
                  <a href="/">
                    <Globe className="h-6 w-6" />
                    <span className="font-semibold">Web Platform</span>
                    <span className="text-xs text-muted-foreground">Full analysis experience</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /start
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Response</h4>
                    <div className="bg-muted px-4 py-3 rounded text-sm space-y-2">
                      <p>🛡️ <strong>Welcome to Rug Killer Alpha Bot!</strong></p>
                      <p className="text-muted-foreground">Your guardian against Solana rug pulls.</p>
                      <p className="text-muted-foreground">Available commands:</p>
                      <p className="text-muted-foreground">• /execute - Full token analysis</p>
                      <p className="text-muted-foreground">• /first20 - Top 20 holder breakdown</p>
                      <p className="text-muted-foreground">• And more...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* /execute Command */}
              <Card data-testid="card-telegram-execute">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/execute [token_address]</CardTitle>
                    <Badge>Core Analysis</Badge>
                  </div>
                  <CardDescription>Comprehensive 52-metric risk analysis of any Solana token</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Performs a deep dive analysis using 52+ risk metrics from Rugcheck, GoPlus Security, 
                      DexScreener, Jupiter, and Birdeye. Returns comprehensive risk score (0-100, where 100=Strong Buy), 
                      professional AI buy/sell recommendation, price data, security checks, holder analysis, and red flags.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /execute EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">What you'll get</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Risk Score & AI Analysis</strong>
                          <p className="text-muted-foreground">0-100 score with professional buy/sell/hold recommendations</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Price & Market Data</strong>
                          <p className="text-muted-foreground">Current price, 24h volume, market cap, price change</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Holder Analysis</strong>
                          <p className="text-muted-foreground">Total holders, top 10 concentration, supply distribution</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Security Checks</strong>
                          <p className="text-muted-foreground">Mint/freeze authority status, LP burn percentage, Pump.fun data</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Quick Links</strong>
                          <p className="text-muted-foreground">Direct links to Solscan, DexScreener, Rugcheck, AXiom, Padre, GMGN, Birdeye</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Response Preview</h4>
                    <div className="bg-muted px-4 py-3 rounded text-sm space-y-1 font-mono">
                      <p>━━━━━━━━━━━━━━━━━━━━━━</p>
                      <p>✅ <strong>USDC (USDC)</strong></p>
                      <p>━━━━━━━━━━━━━━━━━━━━━━</p>
                      <p></p>
                      <p>🤖 <strong>AI Analysis</strong></p>
                      <p><strong>Rating:</strong> 95/100</p>
                      <p><strong>Recommendation:</strong> ✅ STRONG BUY - Excellent fundamentals. Token demonstrates strong security practices with renounced authorities and locked liquidity. Recommended for investment.</p>
                      <p></p>
                      <p>🎯 <strong>Risk Score:</strong> 95/100 (LOW)</p>
                      <p className="text-muted-foreground">0 = Do Not Buy • 100 = Strong Buy</p>
                      <p></p>
                      <p>🔐 <strong>SECURITY</strong></p>
                      <p>• Mint: ✅ Revoked</p>
                      <p>• Freeze: ✅ Revoked</p>
                      <p>• LP Burn: ✅ 100.0%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* /first20 Command */}
              <Card data-testid="card-telegram-first20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/first20 [token_address]</CardTitle>
                    <Badge>Holder Analysis</Badge>
                  </div>
                  <CardDescription>Detailed breakdown of top 20 token holders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Displays the top 20 wallets holding the token, showing each holder's address and 
                      percentage of total supply. Excludes known exchanges, protocols, and bundlers for 
                      accurate whale detection. Warns if concentration is dangerously high.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /first20 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">When to use this</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Checking for whale concentration before buying</li>
                      <li>• Identifying if devs/insiders hold too much supply</li>
                      <li>• Detecting coordinated wallets (similar percentages)</li>
                      <li>• Verifying fair distribution of tokens</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Response</h4>
                    <div className="bg-muted px-4 py-3 rounded text-sm space-y-1 font-mono">
                      <p>📊 <strong>TOP 20 HOLDERS - USDC</strong></p>
                      <p></p>
                      <p>Total Top 10 Concentration: <strong>45.32%</strong></p>
                      <p></p>
                      <p>1. `EPjF...Dt1v` - 8.50%</p>
                      <p>2. `BXcv...9kLm` - 6.20%</p>
                      <p>3. `9oPq...3nRt` - 5.10%</p>
                      <p>...</p>
                      <p></p>
                      <p>⚠️ WARNING: High holder concentration detected!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* /devaudit Command */}
              <Card data-testid="card-telegram-devaudit">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/devaudit [token_address]</CardTitle>
                    <Badge variant="destructive">Security Audit</Badge>
                  </div>
                  <CardDescription>Deep dive into developer wallet security and token age</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Performs an aggressive security audit focused on developer control. Checks if mint 
                      authority is active (can dev mint unlimited tokens?), if freeze authority is active 
                      (can dev freeze your wallet?), and displays token age with warnings for very new tokens.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /devaudit EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">What it checks</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Mint Authority</strong>
                          <p className="text-muted-foreground">Can the dev create unlimited tokens and dump on holders?</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Freeze Authority</strong>
                          <p className="text-muted-foreground">Can the dev freeze your wallet and prevent you from selling?</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Token Age</strong>
                          <p className="text-muted-foreground">How old is the token? New tokens (&lt;7 days) are higher risk</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Response</h4>
                    <div className="bg-muted px-4 py-3 rounded text-sm space-y-1 font-mono">
                      <p>🔥 <strong>Dev Audit REPORT - SCAMCOIN</strong></p>
                      <p></p>
                      <p>Contract: `AbCd...5678`</p>
                      <p></p>
                      <p>❌ <strong>MINT AUTHORITY ACTIVE</strong></p>
                      <p>Dev can mint unlimited tokens!</p>
                      <p>Authority: `9xYz...4321`</p>
                      <p></p>
                      <p>❌ <strong>FREEZE AUTHORITY ACTIVE</strong></p>
                      <p>Dev can freeze accounts!</p>
                      <p>Authority: `9xYz...4321`</p>
                      <p></p>
                      <p>📅 <strong>AGE</strong>: 2 days</p>
                      <p>⚠️ Very new token - high risk!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* /blacklist Command */}
              <Card data-testid="card-telegram-blacklist">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/blacklist [wallet_address]</CardTitle>
                    <Badge>Blacklist Check</Badge>
                  </div>
                  <CardDescription>Check if a wallet is flagged in the AI blacklist database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Queries the AI-powered blacklist database to see if a wallet has been flagged for 
                      suspicious activity. The AI system automatically detects scammers using 6 detection 
                      rules analyzing honeypots, high taxes, wash trading, and coordinated schemes.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /blacklist 9xYzAbCd1234567890KlMnOpQrStUvWxYz
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">When to use this</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Before sending SOL to an unknown wallet</li>
                      <li>• Checking the developer wallet of a new token</li>
                      <li>• Verifying if a whale wallet is legitimate</li>
                      <li>• Researching wallets involved in suspicious trades</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Responses</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold mb-1">Clean Wallet:</p>
                        <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                          <p>🔍 <strong>BLACKLIST CHECK</strong></p>
                          <p></p>
                          <p>Wallet: `9xYz...4321`</p>
                          <p></p>
                          <p>✅ Not currently flagged</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1">Flagged Wallet (future feature):</p>
                        <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                          <p>🔍 <strong>BLACKLIST CHECK</strong></p>
                          <p></p>
                          <p>Wallet: `ScAm...RuG1`</p>
                          <p></p>
                          <p>🚨 <strong>FLAGGED - SCAMMER</strong></p>
                          <p>Severity: 90/100</p>
                          <p>Reason: Honeypot token deployment</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* /whaletrack Command */}
              <Card data-testid="card-telegram-whaletrack">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/whaletrack [token_address]</CardTitle>
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">🐋 Whale Tier</Badge>
                  </div>
                  <CardDescription>Track smart money (KOL) wallets holding a token</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Analyzes the token's top holders and cross-references them against our database of 
                      known KOL (Key Opinion Leader) wallets. Shows which influential traders have positions, 
                      their holdings percentage, influence scores, and total profit history. Critical for 
                      understanding if smart money is entering or exiting.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /whaletrack EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Key Metrics Shown</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Smart Money Count</strong>
                          <p className="text-muted-foreground">Number of known KOL wallets detected in top holders</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Holdings Percentage</strong>
                          <p className="text-muted-foreground">Each KOL's percentage of total supply</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Influence Score</strong>
                          <p className="text-muted-foreground">Trader's reputation (0-100)</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Total Concentration</strong>
                          <p className="text-muted-foreground">Combined holdings of all smart money (RED: &gt;30%, YELLOW: 15-30%, GREEN: &lt;15%)</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Responses</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold mb-1">No Smart Money Detected:</p>
                        <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                          <p>🐋 <strong>WHALE TRACKING - MEME</strong></p>
                          <p></p>
                          <p>✅ No known smart money wallets detected in top holders</p>
                          <p></p>
                          <p>This could be a good sign - no influential traders have entered yet.</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1">Smart Money Found:</p>
                        <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                          <p>🐋 <strong>WHALE TRACKING - BONK</strong></p>
                          <p></p>
                          <p>⚠️ <strong>3 Smart Money Wallets Detected</strong></p>
                          <p></p>
                          <p>💎 <strong>TopTraderSol</strong></p>
                          <p>Wallet: `AbCd...5678`</p>
                          <p>Holdings: 8.45% of supply</p>
                          <p>Influence: 92/100</p>
                          <p>Profit: 2,347 SOL</p>
                          <p></p>
                          <p>💎 <strong>SolanaWhale</strong></p>
                          <p>Wallet: `XyZa...1234`</p>
                          <p>Holdings: 5.23% of supply</p>
                          <p>Influence: 85/100</p>
                          <p>Profit: 1,892 SOL</p>
                          <p></p>
                          <p>📊 <strong>Total Smart Money Holdings: 18.67%</strong></p>
                          <p></p>
                          <p>⚠️ MODERATE concentration - Watch for coordinated sells</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">When to use this</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Before buying - see if smart money is already in</li>
                      <li>• After price pumps - check if whales are accumulating or exiting</li>
                      <li>• During volume spikes - identify who's moving the market</li>
                      <li>• For trend confirmation - smart money entry validates your thesis</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* /kol Command */}
              <Card data-testid="card-telegram-kol">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/kol [wallet_address]</CardTitle>
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">🐋 Whale Tier</Badge>
                  </div>
                  <CardDescription>Check if a wallet is a tracked KOL (Key Opinion Leader)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Looks up a specific wallet address in our KOL database sourced from kolscan.io. 
                      If found, displays the trader's profile including rank, influence score, total profit, 
                      win rate, and last activity. Use this to verify if a wallet belongs to a known 
                      influential trader before following their moves.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /kol 9xYzAbCd1234567890KlMnOpQrStUvWxYz
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Profile Information</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Rank</strong>
                          <p className="text-muted-foreground">KOL's overall ranking (lower = better)</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Influence Score</strong>
                          <p className="text-muted-foreground">0-100 rating (80+: Highly Influential, 60-80: Influential)</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Total Profit</strong>
                          <p className="text-muted-foreground">Lifetime trading profits in SOL</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Win Rate</strong>
                          <p className="text-muted-foreground">Percentage of profitable trades</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">•</div>
                        <div>
                          <strong>Last Active</strong>
                          <p className="text-muted-foreground">Most recent trading activity date</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Responses</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold mb-1">Not a KOL:</p>
                        <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                          <p>📊 <strong>KOL CHECK</strong></p>
                          <p></p>
                          <p>Wallet: `9xYz...4321`</p>
                          <p></p>
                          <p>❌ Not found in KOL database</p>
                          <p></p>
                          <p>This wallet is not currently tracked as a known influential trader.</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1">KOL Profile Found:</p>
                        <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                          <p>💎 <strong>KOL PROFILE FOUND</strong></p>
                          <p></p>
                          <p>👤 <strong>CryptoWhale_Pro</strong></p>
                          <p>Wallet: `AbCd...5678`</p>
                          <p></p>
                          <p>📊 <strong>Stats:</strong></p>
                          <p>• Rank: #47</p>
                          <p>• Influence Score: 92/100</p>
                          <p>• Total Profit: 12,456 SOL</p>
                          <p>• Wins: 234 | Losses: 45</p>
                          <p>• Win Rate: 83.9%</p>
                          <p>• Last Active: 11/12/2025</p>
                          <p></p>
                          <p>🔥 <strong>HIGHLY INFLUENTIAL</strong> - Top tier trader</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">When to use this</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Verifying whale wallets from /first20 command</li>
                      <li>• Checking if a wallet you're following is actually skilled</li>
                      <li>• Researching wallets that made suspicious trades</li>
                      <li>• Due diligence before copying someone's strategy</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Analysis Feature */}
              <Card data-testid="card-telegram-quick">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Quick Analysis (No Command)</CardTitle>
                    <Badge variant="secondary">Auto-detect</Badge>
                  </div>
                  <CardDescription>Just paste a token address for instant compact analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      The bot automatically detects when you paste a Solana address (32-44 characters, no spaces) 
                      and provides a quick compact analysis without needing to type any command. Perfect for 
                      rapid screening of multiple tokens.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <p className="text-sm text-muted-foreground mb-2">Just paste the address:</p>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Response</h4>
                    <div className="bg-muted px-4 py-3 rounded text-sm font-mono">
                      <p>✅ <strong>USDC (USDC)</strong></p>
                      <p></p>
                      <p>🎯 Risk Score: <strong>95/100</strong> (LOW)</p>
                      <p>📊 Holders: 1,234,567</p>
                      <p>💧 Top 10 Concentration: 45.32%</p>
                      <p></p>
                      <p>Use /execute EPjFWdd5... for full analysis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discord" className="space-y-6">
              {/* Discord Overview */}
              <Card data-testid="card-discord-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SiDiscord className="h-5 w-5 text-[#5865F2]" />
                    Discord Bot Overview
                  </CardTitle>
                  <CardDescription>
                    Professional token analysis with rich embeds and slash commands
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Features</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Slash commands (/) with autocomplete and descriptions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Rich embeds with color-coded borders (green/yellow/orange/red)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Embedded fields for organized data display</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Professional formatting perfect for community servers</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* /analyze Command */}
              <Card data-testid="card-discord-analyze">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/analyze token:[address]</CardTitle>
                    <Badge>Core Analysis</Badge>
                  </div>
                  <CardDescription>Full 52-metric risk analysis with rich embed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Identical analysis to Telegram's /execute but formatted as a beautiful Discord embed 
                      with color-coded borders based on risk level. Returns comprehensive analysis with 
                      organized fields for price, security, holders, and alerts.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <p className="text-sm text-muted-foreground mb-2">Type slash and select the command:</p>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /analyze token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Embed Colors</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span><strong>Green</strong> - Low Risk (70-100)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <span><strong>Yellow</strong> - Moderate Risk (40-70)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span><strong>Orange</strong> - High Risk (20-40)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span><strong>Red</strong> - Extreme Risk (0-20)</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Embed Fields</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• AI Analysis - Professional buy/sell/hold recommendation with detailed reasoning</li>
                      <li>• Risk Score - 0-100 investment score (0=Do Not Buy, 100=Strong Buy)</li>
                      <li>• Price - Current price, volume, market cap, 24h change</li>
                      <li>• Security - Mint/freeze status, LP burn percentage</li>
                      <li>• Holders - Total count, top 10 concentration</li>
                      <li>• Advanced Detection - Honeypot, bundle, funding, network, whale alerts</li>
                      <li>• Quick Links - Solscan, DexScreener, Rugcheck, GMGN, Birdeye, Padre</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* /holders Command */}
              <Card data-testid="card-discord-holders">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/holders token:[address]</CardTitle>
                    <Badge>Holder Analysis</Badge>
                  </div>
                  <CardDescription>Top 20 holder breakdown with concentration warnings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Same as Telegram's /first20, formatted as a Discord embed. Shows top 20 wallets 
                      with their percentages, excluding known exchanges and protocols.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /holders token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* /dev Command */}
              <Card data-testid="card-discord-dev">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/dev token:[address]</CardTitle>
                    <Badge variant="destructive">Security Audit</Badge>
                  </div>
                  <CardDescription>Developer wallet security audit with authority checks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Same as Telegram's /devaudit, but in Discord embed format. Aggressive security 
                      audit checking mint/freeze authorities and token age.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /dev token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* /check Command */}
              <Card data-testid="card-discord-check">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/check wallet:[address]</CardTitle>
                    <Badge>Blacklist Check</Badge>
                  </div>
                  <CardDescription>AI blacklist database check for suspicious wallets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Same as Telegram's /blacklist, formatted as Discord embed. Checks if a wallet 
                      is flagged in the AI-powered blacklist database.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /check wallet:9xYzAbCd1234567890KlMnOpQrStUvWxYz
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* /whaletrack Command */}
              <Card data-testid="card-discord-whaletrack">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/whaletrack token:[address]</CardTitle>
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">🐋 Whale Tier</Badge>
                  </div>
                  <CardDescription>Track smart money (KOL) wallets in a token</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Same as Telegram's /whaletrack but formatted as a rich Discord embed. Cross-references 
                      top holders with the KOL database to identify influential traders and their positions.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /whaletrack token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Embed Features</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Individual KOL profiles with influence scores and profit</li>
                      <li>• Holdings percentage for each smart money wallet</li>
                      <li>• Total concentration summary with risk assessment</li>
                      <li>• Color-coded embed (green: safe, orange: moderate, red: high concentration)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* /kol Command */}
              <Card data-testid="card-discord-kol">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/kol wallet:[address]</CardTitle>
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">🐋 Whale Tier</Badge>
                  </div>
                  <CardDescription>Check if wallet is a tracked KOL</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Same as Telegram's /kol but formatted as a Discord embed. Looks up wallet in KOL 
                      database and displays full trader profile if found.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Usage</h4>
                    <code className="block bg-muted px-4 py-3 rounded font-mono text-sm">
                      /kol wallet:9xYzAbCd1234567890KlMnOpQrStUvWxYz
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Profile Data</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Rank, influence score (0-100), total profit in SOL</li>
                      <li>• Win/loss record and win rate percentage</li>
                      <li>• Last activity date</li>
                      <li>• Tier classification (Highly Influential / Influential / Tracked)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Pro Tips Section */}
          <Card className="border-primary" data-testid="card-pro-tips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Best Practices</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Always check /execute first for comprehensive overview</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Use /first20 if you see concerning holder concentration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Run /devaudit on new tokens (&lt;7 days old)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Check dev wallet with /blacklist before buying</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Red Flags to Watch For</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Risk score below 40 (High/Extreme risk)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Top 10 holder concentration above 50%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Active mint or freeze authority</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>LP burn percentage below 50%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>Token age less than 7 days</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community Support */}
          <Card data-testid="card-community">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Having trouble with the bots? Check out these resources:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <a href="/bot-setup" className="text-primary hover:underline">Bot Setup Guide</a> - 
                    Step-by-step instructions for adding the bots
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <a href="/documentation" className="text-primary hover:underline">Full Documentation</a> - 
                    Complete platform guide with PDF download
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Try /start command in the bot for quick help</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
