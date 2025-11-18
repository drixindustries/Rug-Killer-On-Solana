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
