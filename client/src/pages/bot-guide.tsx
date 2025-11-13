import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { Bot, Zap, Shield, Users, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function BotGuide() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold" data-testid="heading-bot-guide">Bot Usage Guide</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Master the Solana Rug Killer bots - comprehensive command reference with examples
            </p>
          </div>

          {/* Quick Access Info */}
          <Card className="mb-8 border-primary" data-testid="card-access-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Bot Access Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Currently Ungated - Public Access</p>
                  <p className="text-sm text-muted-foreground">
                    All bot features are currently available to everyone with no subscription required. 
                    Use any command instantly after adding the bot!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Quick Analysis</p>
                  <p className="text-sm text-muted-foreground">
                    Paste any token address directly in chat (no command needed) for instant quick analysis
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="telegram" className="mb-8">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-bot-platforms">
              <TabsTrigger value="telegram" className="flex items-center gap-2" data-testid="tab-telegram">
                <SiTelegram className="h-4 w-4" />
                Telegram Bot
              </TabsTrigger>
              <TabsTrigger value="discord" className="flex items-center gap-2" data-testid="tab-discord">
                <SiDiscord className="h-4 w-4" />
                Discord Bot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="telegram" className="space-y-6">
              {/* Telegram Overview */}
              <Card data-testid="card-telegram-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SiTelegram className="h-5 w-5 text-[#0088cc]" />
                    Telegram Bot Overview
                  </CardTitle>
                  <CardDescription>
                    Get instant token analysis right in your Telegram chats
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Features</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>5 powerful commands with autocomplete menu (type "/" to see all)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Markdown-formatted responses with color-coded risk indicators</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Quick links to Solscan, DexScreener, Rugcheck, and more</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Smart auto-detection - paste any token address for instant analysis</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* /start Command */}
              <Card data-testid="card-telegram-start">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/start</CardTitle>
                    <Badge variant="secondary">Welcome</Badge>
                  </div>
                  <CardDescription>Display welcome message and available commands</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What it does</h4>
                    <p className="text-sm text-muted-foreground">
                      Shows a friendly welcome message with a list of all available commands and how to use them. 
                      This is the first command to try when you add the bot!
                    </p>
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
                      <p>🛡️ <strong>Welcome to Solana Rug Killer Bot!</strong></p>
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
                      DexScreener, Jupiter, and Birdeye. Returns comprehensive risk score (0-100, where 100=safe), 
                      AI verdict, price data, security checks, holder analysis, and red flags.
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
                          <strong>Risk Score & AI Verdict</strong>
                          <p className="text-muted-foreground">0-100 safety score with AI-powered recommendation</p>
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
                      <p>🤖 <strong>AI VERDICT</strong></p>
                      <p>10/10 - 🟢 HIGHLY SAFE TOKEN</p>
                      <p></p>
                      <p>🛡️ <strong>RISK SCORE</strong></p>
                      <p>Score: <strong>95/100</strong> (LOW)</p>
                      <p className="text-muted-foreground">Higher = Safer (0=Dangerous, 100=Safe)</p>
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

              {/* /devtorture Command */}
              <Card data-testid="card-telegram-devtorture">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-lg">/devtorture [token_address]</CardTitle>
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
                      /devtorture EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
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
                      <p>🔥 <strong>DEV TORTURE REPORT - SCAMCOIN</strong></p>
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
                      <li>• AI Verdict - Rating and recommendation</li>
                      <li>• Risk Score - 0-100 safety score with level</li>
                      <li>• Price - Current price, volume, market cap, 24h change</li>
                      <li>• Security - Mint/freeze status, LP burn percentage</li>
                      <li>• Holders - Total count, top 10 concentration</li>
                      <li>• Quick Links - Solscan, DexScreener, Rugcheck, etc.</li>
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
                      Same as Telegram's /devtorture, but in Discord embed format. Aggressive security 
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
                      <span>Run /devtorture on new tokens (&lt;7 days old)</span>
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
