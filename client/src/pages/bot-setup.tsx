import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";

export default function BotSetup() {
  const { toast } = useToast();
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4" data-testid="heading-bot-setup">Bot Setup Guide</h1>
        <p className="text-lg text-muted-foreground">
          Set up your Telegram and Discord bots in 20 minutes. All features are already built and ready to go!
        </p>
          </div>

      <Card className="mb-8" data-testid="card-features-built">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Features Already Built
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Core Commands</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• /execute - Full 52-metric rug scan</li>
                <li>• /first20 - Top 20 holder analysis</li>
                <li>• /devaudit - Dev wallet history</li>
                <li>• /blacklist - Scam wallet check</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Alpha Alerts</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Monitors influential wallet activity</li>
                <li>• Real-time pump.fun launches</li>
                <li>• Quality filtering (RugCheck {'>'}  85)</li>
                <li>• Auto-pings Discord/Telegram</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <SiTelegram className="h-8 w-8 text-[#0088cc]" />
            <h2 className="text-3xl font-bold">Part 1: Telegram Bot</h2>
          </div>

          <Card className="mb-4" data-testid="card-telegram-step-1">
            <CardHeader>
              <CardTitle>Step 1: Open BotFather</CardTitle>
              <CardDescription>BotFather is Telegram's official bot creation tool</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">1. Open Telegram app or web.telegram.org</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">2. Search for: <code className="bg-muted px-2 py-1 rounded">@BotFather</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">3. Click the blue verified checkmark profile</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">4. Click "Start"</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4" data-testid="card-telegram-step-2">
            <CardHeader>
              <CardTitle>Step 2: Create Your Bot</CardTitle>
              <CardDescription>Send these exact messages to BotFather</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Message 1: Start bot creation</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-2 rounded font-mono text-sm">/newbot</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard("/newbot", "newbot")}
                    data-testid="button-copy-newbot"
                  >
                    {copiedStep === "newbot" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Message 2: Bot name (when BotFather asks)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-2 rounded font-mono text-sm">Rug Killer Alpha Bot</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard("Rug Killer Alpha Bot", "botname")}
                    data-testid="button-copy-botname"
                  >
                    {copiedStep === "botname" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Message 3: Bot username (when BotFather asks)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-2 rounded font-mono text-sm">RugKillerAlphaBot</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard("RugKillerAlphaBot", "username")}
                    data-testid="button-copy-username"
                  >
                    {copiedStep === "username" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Must end in "bot" or "Bot". No spaces allowed.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4" data-testid="card-telegram-step-3">
            <CardHeader>
              <CardTitle>Step 3: Copy Your Bot Token</CardTitle>
              <CardDescription>BotFather will send you a token - SAVE IT!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">BotFather will reply with something like:</p>
              <div className="bg-muted p-4 rounded text-sm font-mono">
                Done! Your bot is ready.<br />
                Token: <span className="text-primary">1234567890:ABCdefGHIjklMNOpqrsTUVwxyz</span>
              </div>
              <p className="text-sm font-semibold text-orange-600">
                ⚠️ COPY THAT ENTIRE TOKEN! You'll need it in a moment.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <SiDiscord className="h-8 w-8 text-[#5865F2]" />
            <h2 className="text-3xl font-bold">Part 2: Discord Bot</h2>
          </div>

          <Card className="mb-4" data-testid="card-discord-step-1">
            <CardHeader>
              <CardTitle>Step 1: Create Discord Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">1. Visit:</span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid="button-discord-dev-portal"
                >
                  <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">
                    Discord Developer Portal
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">2. Click "New Application"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">3. Name: <code className="bg-muted px-2 py-1 rounded">Rug Killer Alpha Bot</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">4. Agree to terms → Click "Create"</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4" data-testid="card-discord-step-2">
            <CardHeader>
              <CardTitle>Step 2: Get Application ID (Client ID)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">You'll see the "General Information" page</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">1. Find "APPLICATION ID"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">2. Click "Copy" button next to it</span>
              </div>
              <p className="text-sm font-semibold text-orange-600">
                ⚠️ SAVE THIS ID! You'll need it for your environment configuration.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4" data-testid="card-discord-step-3">
            <CardHeader>
              <CardTitle>Step 3: Create Bot & Get Token</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">1. Click "Bot" in left sidebar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">2. Click "Reset Token" → Confirm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">3. Click "Copy" to copy the token</span>
              </div>
              <p className="text-sm font-semibold text-orange-600">
                ⚠️ SAVE THIS TOKEN! You can only see it once!
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4" data-testid="card-discord-step-4">
            <CardHeader>
              <CardTitle>Step 4: Enable Intents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Scroll down on the Bot page to "Privileged Gateway Intents"</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">1. ✅ Enable "MESSAGE CONTENT INTENT"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">2. Click "Save Changes" at bottom</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 bg-primary/5 border-primary" data-testid="card-discord-invite">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiDiscord className="h-6 w-6 text-[#5865F2]" />
                Invite Discord Bot to Your Server
              </CardTitle>
              <CardDescription>
                Add the Rug Killer Alpha Bot bot to your Discord server instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Click the button below to invite the bot to your Discord server. You'll need "Manage Server" permissions.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p className="text-sm font-semibold">Discord Bot Invite URL Template:</p>
                <code className="block bg-background p-3 rounded text-xs break-all">
                  https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=3072
                </code>
                <p className="text-xs text-muted-foreground">
                  Replace <code className="bg-background px-1 py-0.5 rounded">YOUR_CLIENT_ID</code> with your Discord Application ID from Part 2, Step 2
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Bot permissions: Read Messages (2048), Send Messages (2048), Embed Links (16384) = 3072 total</p>
                <p>• After inviting, use <code className="bg-muted px-1 py-0.5 rounded">/execute [token]</code> to analyze tokens</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-3xl font-bold mb-2">Part 3: Configure Environment Variables</h2>
            <p className="text-muted-foreground">Add bot credentials to your deployment environment</p>
          </div>

          <Card data-testid="card-environment-secrets">
            <CardHeader>
              <CardTitle>Required Environment Variables</CardTitle>
              <CardDescription>Add these to your .env file or deployment platform (Railway, Heroku, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-semibold">TELEGRAM_BOT_TOKEN</code>
                  <Badge>Required</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Paste the token from BotFather (Part 1, Step 3)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-semibold">TELEGRAM_BOT_URL</code>
                  <Badge>Required</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-xs">https://t.me/RugKillerAlphaBot</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard("https://t.me/RugKillerAlphaBot", "tg-url")}
                    data-testid="button-copy-telegram-url"
                  >
                    {copiedStep === "tg-url" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">(Use your actual bot username if different)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-semibold">DISCORD_BOT_TOKEN</code>
                  <Badge>Required</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Paste the token from Discord Developer Portal (Part 2, Step 3)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-semibold">DISCORD_CLIENT_ID</code>
                  <Badge>Required</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Paste the Application ID from Discord Developer Portal (Part 2, Step 2)</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="bg-green-500/10 border-green-500" data-testid="card-done">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              You're Done!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              After adding the environment variables and redeploying, both bots will start automatically!
            </p>
            <p className="text-sm">
              Check the logs for: <code className="bg-muted px-2 py-1 rounded text-xs">✅ Telegram bot started</code>
            </p>
            <p className="text-sm font-semibold">
              Bot invite links will appear in the website header/footer for subscribed users.
            </p>
          </CardContent>
        </Card>
        </div>
        {/* Close page container */}
        </div>
      </main>
      <Footer />
    </div>
  );
}
